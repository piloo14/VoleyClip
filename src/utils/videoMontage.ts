import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import { ManualTacticalClip } from '../types/manualTactical';

export interface MontageProgressCallback {
  (currentClipIndex: number, totalClips: number, percentage: number, currentClipTitle: string): void;
}

const MAX_DIRECT_UPLOAD_BYTES = 24 * 1024 * 1024; // 24 MB (safe under Cloud Run 32MB request limit)

// Singleton browser FFmpeg instance
let ffmpegInstance: FFmpeg | null = null;
let isFfmpegLoading = false;

/**
 * Uploads a local video File (<= 24 MB) to the backend server with strict timeout
 * so native /usr/bin/ffmpeg can process cuts with <1s latency.
 */
export async function uploadSourceVideoToServer(file: File, timeoutMs = 12000): Promise<string | null> {
  if (!file || file.size > MAX_DIRECT_UPLOAD_BYTES) {
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch('/api/montage/upload-source', {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'video/mp4',
        'X-Filename': encodeURIComponent(file.name)
      },
      body: file,
      signal: controller.signal
    });
    if (res.ok) {
      const data = await res.json();
      if (data.serverPath) {
        (window as any).__lastUploadedServerVideoPath = data.serverPath;
        return data.serverPath;
      }
    }
  } catch (e) {
    console.warn('Background server video upload skipped/timed out:', e);
  } finally {
    clearTimeout(timer);
  }
  return null;
}

/**
 * Resolves a Blob/File from either cached local File or fetch(sourceVideoUrl).
 */
async function resolveSourceBlob(sourceVideoUrl: string): Promise<Blob> {
  const cachedFile = (window as any).__lastUploadedFile as File | undefined;
  const cachedUrl = (window as any).__lastUploadedBlobUrl as string | undefined;
  if (cachedFile && cachedUrl === sourceVideoUrl) {
    return cachedFile;
  }

  const response = await fetch(sourceVideoUrl);
  if (!response.ok) {
    throw new Error(`No se pudo leer el archivo fuente (HTTP ${response.status})`);
  }
  return await response.blob();
}

/**
 * Initializes FFmpeg.wasm using local static core assets (/ffmpeg/ffmpeg-core.js).
 */
async function getLoadedFFmpegWithTimeout(timeoutMs = 20000): Promise<FFmpeg> {
  if (ffmpegInstance && ffmpegInstance.loaded) {
    return ffmpegInstance;
  }

  if (isFfmpegLoading) {
    const start = Date.now();
    while (isFfmpegLoading && Date.now() - start < timeoutMs) {
      await new Promise((r) => setTimeout(r, 100));
    }
    if (ffmpegInstance && ffmpegInstance.loaded) return ffmpegInstance;
    throw new Error('Inicialización de FFmpeg.wasm agotó el tiempo de espera.');
  }

  isFfmpegLoading = true;
  try {
    const ffmpeg = new FFmpeg();

    const loadCore = async () => {
      try {
        const coreURL = await toBlobURL('/ffmpeg/ffmpeg-core.js', 'text/javascript');
        const wasmURL = await toBlobURL('/ffmpeg/ffmpeg-core.wasm', 'application/wasm');
        await ffmpeg.load({ coreURL, wasmURL });
      } catch (localErr) {
        console.warn('Carga local de ffmpeg-core falló, intentando carga por defecto:', localErr);
        await ffmpeg.load();
      }
    };

    const timerPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('FFmpeg.wasm timeout inside browser')), timeoutMs)
    );

    await Promise.race([loadCore(), timerPromise]);
    ffmpegInstance = ffmpeg;
    return ffmpeg;
  } finally {
    isFfmpegLoading = false;
  }
}

/**
 * High-Performance Client-Side WebAssembly Video Concatenation using @ffmpeg/ffmpeg.
 * Uses WORKERFS to mount local File/Blob directly with 0 MB RAM copy so even 2GB+ videos work!
 */
export async function concatenateClipsWithFFmpegWasm(
  sourceVideoUrl: string,
  clips: ManualTacticalClip[],
  onProgress?: MontageProgressCallback,
  targetFilename = 'Montaje_Voleibol.mp4'
): Promise<string> {
  if (!clips || clips.length === 0) {
    throw new Error('No hay clips para unir.');
  }

  const totalClips = clips.length;
  onProgress?.(1, totalClips, 20, 'Cargando motor FFmpeg WebAssembly (30 FPS CFR)...');

  const ffmpeg = await getLoadedFFmpegWithTimeout(20000);
  const sourceBlob = await resolveSourceBlob(sourceVideoUrl);
  if (sourceBlob.size < 5000) {
    throw new Error('El archivo de vídeo fuente es demasiado pequeño o está corrupto.');
  }

  onProgress?.(1, totalClips, 25, 'Montando vídeo fuente sin consumo de memoria...');

  let inputPathInVfs = '/input/source.mp4';
  let mountedWorkerFs = false;

  try {
    try {
      await ffmpeg.unmount('/input');
    } catch {}
    try {
      await ffmpeg.createDir('/input');
    } catch {}

    const mounted = await ffmpeg.mount(
      'WORKERFS' as any,
      { blobs: [{ name: 'source.mp4', data: sourceBlob }] },
      '/input'
    );
    if (mounted) {
      mountedWorkerFs = true;
    }
  } catch (mountErr) {
    console.warn('WORKERFS mount unavailable, checking MEMFS fallback:', mountErr);
  }

  if (!mountedWorkerFs) {
    // Only copy into WASM MEMFS if <= 150 MB to prevent browser OOM crashes
    if (sourceBlob.size > 150 * 1024 * 1024) {
      throw new Error('Vídeo demasiado grande para memoria WASM; cambiando a renderizador continuo.');
    }
    inputPathInVfs = 'source.mp4';
    const sourceBytes = new Uint8Array(await sourceBlob.arrayBuffer());
    await ffmpeg.writeFile(inputPathInVfs, sourceBytes);
  }

  const inputFiles: string[] = [];

  try {
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const s = Math.max(0, clip.startTime);
      const dur = Math.max(0.3, clip.endTime - clip.startTime);
      const clipFileName = `input${i}.mp4`;
      inputFiles.push(clipFileName);

      const stepPct = 25 + Math.round(((i + 0.2) / totalClips) * 55);
      onProgress?.(i + 1, totalClips, stepPct, `Recortando ${clip.title} (${i + 1}/${totalClips})...`);

      // Place -ss BEFORE -i for instant keyframe seeking (avoids decoding from 00:00:00)
      // Scale max 1280px wide (even dimensions) + strict 30 FPS CFR
      let cutExit = await ffmpeg.exec([
        '-y',
        '-ss',
        s.toFixed(3),
        '-i',
        inputPathInVfs,
        '-t',
        dur.toFixed(3),
        '-vf',
        "scale='min(1280,iw)':-2,fps=30,setpts=PTS-STARTPTS",
        '-af',
        'asetpts=PTS-STARTPTS',
        '-c:v',
        'libx264',
        '-r',
        '30',
        '-vsync',
        '1',
        '-preset',
        'ultrafast',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-ar',
        '44100',
        '-g',
        '30',
        '-keyint_min',
        '30',
        '-movflags',
        '+faststart',
        clipFileName
      ]);

      // Fallback for silent/video-only sources (no audio track)
      if (cutExit !== 0) {
        cutExit = await ffmpeg.exec([
          '-y',
          '-ss',
          s.toFixed(3),
          '-i',
          inputPathInVfs,
          '-t',
          dur.toFixed(3),
          '-vf',
          "scale='min(1280,iw)':-2,fps=30,setpts=PTS-STARTPTS",
          '-c:v',
          'libx264',
          '-r',
          '30',
          '-vsync',
          '1',
          '-preset',
          'ultrafast',
          '-pix_fmt',
          'yuv420p',
          '-an',
          '-g',
          '30',
          '-keyint_min',
          '30',
          '-movflags',
          '+faststart',
          clipFileName
        ]);
      }

      if (cutExit !== 0) {
        throw new Error(`Error en FFmpeg al recortar clip ${i + 1} (código ${cutExit})`);
      }

      const clipData = await ffmpeg.readFile(clipFileName);
      const clipLen = typeof clipData === 'string' ? clipData.length : clipData.byteLength;
      if (clipLen < 500) {
        throw new Error(`Clip ${i + 1} (${clipFileName}) generado vacío (${clipLen} bytes).`);
      }

      const donePct = 25 + Math.round(((i + 1) / totalClips) * 55);
      onProgress?.(i + 1, totalClips, donePct, `Clip ${i + 1} de ${totalClips} listo`);
    }

    onProgress?.(totalClips, totalClips, 84, 'Uniendo todos los clips en un único MP4...');
    const listContent = inputFiles.map((fn) => `file '${fn}'`).join('\n');
    await ffmpeg.writeFile('list.txt', new TextEncoder().encode(listContent));

    let concatExit = await ffmpeg.exec([
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      'list.txt',
      '-c:v',
      'libx264',
      '-r',
      '30',
      '-vsync',
      '1',
      '-preset',
      'ultrafast',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-movflags',
      '+faststart',
      'output.mp4'
    ]);

    if (concatExit !== 0) {
      concatExit = await ffmpeg.exec([
        '-y',
        '-f',
        'concat',
        '-safe',
        '0',
        '-i',
        'list.txt',
        '-c:v',
        'libx264',
        '-r',
        '30',
        '-vsync',
        '1',
        '-preset',
        'ultrafast',
        '-pix_fmt',
        'yuv420p',
        '-an',
        '-movflags',
        '+faststart',
        'output.mp4'
      ]);
    }

    if (concatExit !== 0) {
      throw new Error(`Error en FFmpeg al concatenar los clips (código ${concatExit})`);
    }

    onProgress?.(totalClips, totalClips, 95, 'Verificando archivo MP4 final...');
    const rawOutput = await ffmpeg.readFile('output.mp4');
    const uint8Output =
      rawOutput instanceof Uint8Array ? rawOutput : new TextEncoder().encode(rawOutput);

    if (uint8Output.byteLength <= 500) {
      throw new Error(
        `El archivo generado pesa solo ${uint8Output.byteLength} bytes (vacío o corrupto).`
      );
    }

    const outputBlob = new Blob([new Uint8Array(uint8Output)], { type: 'video/mp4' });
    const blobUrl = URL.createObjectURL(outputBlob);
    onProgress?.(totalClips, totalClips, 100, '¡Vídeo completado a 30 FPS fluidos!');
    triggerBrowserDownload(blobUrl, targetFilename, outputBlob.size);
    return blobUrl;
  } finally {
    if (mountedWorkerFs) {
      try {
        await ffmpeg.unmount('/input');
      } catch {}
    } else {
      try {
        await ffmpeg.deleteFile('source.mp4');
      } catch {}
    }
    try {
      await ffmpeg.deleteFile('list.txt');
    } catch {}
    try {
      await ffmpeg.deleteFile('output.mp4');
    } catch {}
    for (const f of inputFiles) {
      try {
        await ffmpeg.deleteFile(f);
      } catch {}
    }
  }
}

/**
 * Sends a small (< 24 MB) browser-recorded montage blob to the server to remux into
 * a guaranteed 30 FPS CFR H.264 +faststart MP4 file. Returns null if unavailable.
 */
async function tryRemuxToCleanMp4(blob: Blob): Promise<Blob | null> {
  if (blob.size > MAX_DIRECT_UPLOAD_BYTES) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch('/api/montage/remux-mp4', {
      method: 'POST',
      headers: { 'Content-Type': blob.type || 'video/webm' },
      body: blob,
      signal: controller.signal
    });
    if (res.ok) {
      const mp4Blob = await res.blob();
      if (mp4Blob.size > 500) {
        return mp4Blob;
      }
    }
  } catch (e) {
    console.warn('Server remux skipped:', e);
  } finally {
    clearTimeout(timer);
  }
  return null;
}

/**
 * Universal Fail-Safe Concatenation Pipeline:
 * 1. Native Server FFmpeg (instant <1s for files already on server or <= 24 MB).
 * 2. Client FFmpeg.wasm with WORKERFS (handles huge 2GB+ local match videos directly with 0 RAM copy).
 * 3. Client Canvas 30 FPS MediaRecorder + optional fast server MP4 remux.
 */
export async function concatenateClipsWithFFmpeg(
  sourceVideoUrl: string,
  clips: ManualTacticalClip[],
  onProgress?: MontageProgressCallback,
  targetFilename = 'Montaje_Voleibol.mp4'
): Promise<string> {
  if (!clips || clips.length === 0) {
    throw new Error('No hay clips para unir.');
  }

  const totalClips = clips.length;
  onProgress?.(1, totalClips, 10, 'Iniciando pipeline de montaje a 30 FPS...');

  let serverVideoPath = (window as any).__lastUploadedServerVideoPath || undefined;

  // Only attempt quick upload if file <= 24 MB (avoids Cloud Run 32MB limit hang at 15%)
  if (!serverVideoPath && sourceVideoUrl) {
    try {
      const cachedFile = (window as any).__lastUploadedFile as File | undefined;
      const cachedUrl = (window as any).__lastUploadedBlobUrl as string | undefined;

      if (cachedFile && cachedUrl === sourceVideoUrl) {
        if (cachedFile.size <= MAX_DIRECT_UPLOAD_BYTES) {
          onProgress?.(1, totalClips, 15, 'Subiendo vídeo ligero al motor rápido del servidor...');
          const upPath = await uploadSourceVideoToServer(cachedFile, 10000);
          if (upPath) serverVideoPath = upPath;
        }
      } else if (sourceVideoUrl.startsWith('blob:')) {
        const resp = await fetch(sourceVideoUrl);
        if (resp.ok) {
          const blob = await resp.blob();
          if (blob.size > 1000 && blob.size <= MAX_DIRECT_UPLOAD_BYTES) {
            onProgress?.(1, totalClips, 15, 'Subiendo vídeo ligero al motor rápido del servidor...');
            const file = new File([blob], 'partido_voleibol.mp4', { type: blob.type || 'video/mp4' });
            const upPath = await uploadSourceVideoToServer(file, 10000);
            if (upPath) serverVideoPath = upPath;
          }
        }
      }
    } catch (e) {
      console.warn('Quick upload check notice:', e);
    }
  }

  // Strategy 1: High-Speed Native Server FFmpeg Engine (only when verified on server)
  if (serverVideoPath) {
    try {
      onProgress?.(1, totalClips, 25, 'Procesando clips con motor FFmpeg del servidor (30 FPS CFR)...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);

      const response = await fetch('/api/montage/ffmpeg-concat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceVideoUrl,
          serverVideoPath,
          clips: clips.map((c) => ({
            startTime: c.startTime,
            endTime: c.endTime,
            title: c.title
          })),
          targetFilename
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('video') || contentType.includes('application/octet-stream')) {
          const blob = await response.blob();
          if (blob.size > 1000) {
            const blobUrl = URL.createObjectURL(blob);
            onProgress?.(totalClips, totalClips, 100, '¡Vídeo completado y listo para descargar!');
            triggerBrowserDownload(blobUrl, targetFilename, blob.size);
            return blobUrl;
          }
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        console.warn('Server FFmpeg returned error, switching to browser FFmpeg.wasm:', errData);
      }
    } catch (serverErr) {
      console.warn('Server FFmpeg unavailable, switching to browser FFmpeg.wasm:', serverErr);
    }
  }

  // Strategy 2: Client WebAssembly FFmpeg with WORKERFS (no upload needed, supports huge files)
  try {
    onProgress?.(1, totalClips, 20, 'Procesando localmente con FFmpeg.wasm a 30 FPS...');
    return await concatenateClipsWithFFmpegWasm(sourceVideoUrl, clips, onProgress, targetFilename);
  } catch (wasmErr) {
    console.warn('FFmpeg.wasm fallback to Canvas 30 FPS engine:', wasmErr);
  }

  // Strategy 3: Client Canvas CFR MediaRecorder (guaranteed 30 FPS capture)
  onProgress?.(1, totalClips, 30, 'Generando vídeo mediante renderizador continuo a 30 FPS...');
  return concatenateClipsClientSide(sourceVideoUrl, clips, onProgress || (() => {}), targetFilename);
}

/**
 * Rock-Solid Client-Side Video Concatenation Engine using HTML5 Canvas & MediaRecorder API.
 */
export async function concatenateClipsClientSide(
  sourceVideoUrl: string,
  clips: ManualTacticalClip[],
  onProgress: MontageProgressCallback,
  targetFilename = 'Montaje_Voleibol.mp4'
): Promise<string> {
  if (!clips || clips.length === 0) {
    throw new Error('No hay clips para unir.');
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true; // CRITICAL: Autoplay policy requires muted=true
    video.playsInline = true;
    video.preload = 'auto';

    // Visible layout dimensions prevent Chromium from throttling video decoder
    video.style.position = 'fixed';
    video.style.left = '0';
    video.style.top = '0';
    video.style.width = '320px';
    video.style.height = '180px';
    video.style.opacity = '0.02';
    video.style.pointerEvents = 'none';
    video.style.zIndex = '-9999';
    document.body.appendChild(video);
    video.src = sourceVideoUrl;

    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d', { alpha: false });

    if (!ctx) {
      if (video.parentNode) video.parentNode.removeChild(video);
      reject(new Error('No se pudo inicializar el Canvas 2D.'));
      return;
    }

    const recordedChunks: Blob[] = [];
    let mediaRecorder: MediaRecorder | null = null;
    let animFrameId: number | null = null;
    let fpsTimerId: any = null;
    let isTerminated = false;
    let hasStarted = false;
    const totalClips = clips.length;

    // Capture pure canvas stream at steady 30 FPS (avoids MediaRecorder audio track stalls across seeks)
    const stream = canvas.captureStream(30);

    let mimeType = 'video/webm;codecs=vp9';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
        mimeType = 'video/webm;codecs=vp8';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        mimeType = 'video/webm';
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      } else {
        mimeType = '';
      }
    }

    try {
      mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4500000 })
        : new MediaRecorder(stream);
    } catch {
      mediaRecorder = new MediaRecorder(stream);
    }

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) recordedChunks.push(e.data);
    };

    const finishRecording = () => {
      if (isTerminated) return;
      isTerminated = true;

      if (animFrameId) cancelAnimationFrame(animFrameId);
      if (fpsTimerId) clearInterval(fpsTimerId);
      video.pause();

      if (video.parentNode) {
        video.parentNode.removeChild(video);
      }

      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      } else {
        reject(new Error('No se pudo iniciar la grabación del vídeo.'));
      }
    };

    mediaRecorder.onstop = async () => {
      const outputMime = mediaRecorder?.mimeType || 'video/webm';
      let finalBlob = new Blob(recordedChunks, { type: outputMime });

      if (finalBlob.size <= 500) {
        reject(new Error('El archivo generado está vacío. Asegúrese de que el vídeo es reproducible.'));
        return;
      }

      let finalName = targetFilename;

      // Normalize WebM recording into a crisp 30 FPS CFR +faststart MP4 on server if <= 24 MB
      if (outputMime.includes('webm') || !outputMime.includes('mp4')) {
        onProgress(totalClips, totalClips, 95, 'Optimizando MP4 final a 30 FPS constantes...');
        const remuxed = await tryRemuxToCleanMp4(finalBlob);
        if (remuxed) {
          finalBlob = remuxed;
          finalName = targetFilename.endsWith('.mp4') ? targetFilename : `${targetFilename}.mp4`;
        } else {
          finalName = targetFilename.endsWith('.mp4')
            ? targetFilename.replace(/\.mp4$/, '.webm')
            : targetFilename;
        }
      }

      const blobUrl = URL.createObjectURL(finalBlob);
      onProgress(totalClips, totalClips, 100, '¡Descarga lista a 30 FPS!');
      triggerBrowserDownload(blobUrl, finalName, finalBlob.size);
      resolve(blobUrl);
    };

    const drawFrame = () => {
      if (ctx && video.readyState >= 2) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
    };

    const renderLoop = () => {
      drawFrame();
      animFrameId = requestAnimationFrame(renderLoop);
    };
    fpsTimerId = setInterval(drawFrame, 1000 / 30);

    // Overall fail-safe timeout (maximum 120 seconds for whole montage)
    const masterTimeout = setTimeout(() => {
      console.warn('Master montage timeout reached, forcing finish...');
      finishRecording();
    }, 120000);

    const playClip = (index: number) => {
      if (isTerminated) return;
      if (index >= totalClips) {
        clearTimeout(masterTimeout);
        finishRecording();
        return;
      }

      const clip = clips[index];
      const stepPct = 30 + Math.round((index / totalClips) * 62);
      onProgress(index + 1, totalClips, stepPct, `Renderizando: ${clip.title} (${index + 1}/${totalClips})...`);

      const clipStart = Math.max(0, clip.startTime);
      const clipEnd = Math.max(clipStart + 0.3, clip.endTime);
      const clipDur = clipEnd - clipStart;

      let clipWatchdog: any = null;
      let hasAdvanced = false;

      const advanceToNext = () => {
        if (hasAdvanced || isTerminated) return;
        hasAdvanced = true;
        if (clipWatchdog) clearTimeout(clipWatchdog);
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.pause();
        playClip(index + 1);
      };

      const handleTimeUpdate = () => {
        if (video.currentTime >= clipEnd) {
          advanceToNext();
        }
      };

      const startPlayingThisClip = () => {
        if (isTerminated || hasAdvanced) return;
        drawFrame();

        if (index === 0 && mediaRecorder && mediaRecorder.state === 'inactive') {
          mediaRecorder.start(250);
        }

        if (!animFrameId) renderLoop();
        video.playbackRate = 1.0;
        video.play().catch((playErr) => {
          console.warn('video.play() caught:', playErr);
        });

        video.addEventListener('timeupdate', handleTimeUpdate);

        // Safe watchdog: advance if timeupdate fails to reach endTime within clipDur + 1.5s
        const maxWaitMs = Math.max(1500, (clipDur + 1.5) * 1000);
        clipWatchdog = setTimeout(() => {
          console.warn(`Watchdog advancing clip ${index + 1}`);
          advanceToNext();
        }, maxWaitMs);
      };

      if (Math.abs(video.currentTime - clipStart) < 0.05) {
        startPlayingThisClip();
      } else {
        let isSeekHandled = false;
        const onSeekDone = () => {
          if (isSeekHandled) return;
          isSeekHandled = true;
          video.removeEventListener('seeked', onSeekDone);
          startPlayingThisClip();
        };

        video.addEventListener('seeked', onSeekDone, { once: true });
        video.currentTime = clipStart;

        // Fallback if browser doesn't emit seeked within 700ms
        setTimeout(() => {
          if (!isSeekHandled) {
            onSeekDone();
          }
        }, 700);
      }
    };

    const startProcessing = () => {
      if (hasStarted || isTerminated) return;
      hasStarted = true;

      if (video.videoWidth && video.videoHeight) {
        const aspect = video.videoWidth / video.videoHeight;
        canvas.width = Math.min(1280, Math.max(640, video.videoWidth));
        canvas.height = Math.round(canvas.width / aspect);
        // Ensure even dimensions for H.264
        if (canvas.width % 2 !== 0) canvas.width -= 1;
        if (canvas.height % 2 !== 0) canvas.height -= 1;
      }
      playClip(0);
    };

    if (video.readyState >= 2) {
      startProcessing();
    } else {
      video.onloadeddata = () => {
        video.onloadeddata = null;
        startProcessing();
      };
      video.oncanplay = () => {
        video.oncanplay = null;
        startProcessing();
      };
      setTimeout(() => {
        startProcessing();
      }, 1500);
    }

    video.onerror = () => {
      clearTimeout(masterTimeout);
      if (video.parentNode) {
        video.parentNode.removeChild(video);
      }
      reject(new Error('Error al cargar la fuente de vídeo en el navegador.'));
    };
  });
}

/**
 * Triggers an immediate browser download for the given Blob URL with size safety check.
 */
export function triggerBrowserDownload(blobUrl: string, filename: string, fileSize?: number): void {
  if (fileSize !== undefined && fileSize <= 500) {
    console.error(`Abortando descarga: el archivo es corrupto o pesa solo ${fileSize} bytes.`);
    return;
  }

  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = filename;
  anchor.style.position = 'fixed';
  anchor.style.left = '-9999px';
  anchor.style.top = '-9999px';
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    if (anchor.parentNode) {
      anchor.parentNode.removeChild(anchor);
    }
  }, 1000);
}
