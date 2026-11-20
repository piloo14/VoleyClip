import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import { ManualTacticalClip } from '../types/manualTactical';

export interface MontageProgressCallback {
  (currentClipIndex: number, totalClips: number, percentage: number, currentClipTitle: string): void;
}

const MAX_DIRECT_UPLOAD_BYTES = 24 * 1024 * 1024; // 24 MB (safe under Cloud Run 32MB request limit)
const WASM_CONCAT_BATCH_SIZE = 5; // Keep peak WASM heap bounded even with 15-20+ clips
const TARGET_FPS = 30;
const CLIENT_VIDEO_BITRATE = 6_500_000; // 6.5 Mbps (5-8 Mbps high-clarity range)

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
 * Helper: runs a single-pass `concat` filter graph in FFmpeg.wasm over <= 5 segments,
 * normalizing CFR 30fps, yuv420p, even dimensions, SAR 1:1, PTS-STARTPTS reset, and 50ms audio fades.
 */
async function execWasmConcatFilterBatch(
  ffmpeg: FFmpeg,
  segments: Array<{ inputPath: string; startTime?: number; duration: number; applyAudioFade: boolean }>,
  outputFileName: string,
  preferAudio: boolean
): Promise<{ ok: boolean; usedAudio: boolean }> {
  const buildArgs = (withAudio: boolean): string[] => {
    const args: string[] = ['-y'];
    const filterParts: string[] = [];
    const concatInputs: string[] = [];

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (seg.startTime !== undefined) {
        args.push('-ss', Math.max(0, seg.startTime).toFixed(3));
        args.push('-t', Math.max(0.25, seg.duration).toFixed(3));
      }
      args.push('-i', seg.inputPath);

      filterParts.push(
        `[${i}:v]fps=${TARGET_FPS},scale='min(1280,iw)':-2:flags=bilinear,setsar=1,format=yuv420p,setpts=PTS-STARTPTS[v${i}]`
      );

      if (withAudio) {
        if (seg.applyAudioFade) {
          const fadeDur = Math.min(0.05, +(seg.duration / 3).toFixed(3));
          const fadeOutStart = Math.max(0, +(seg.duration - fadeDur).toFixed(3));
          filterParts.push(
            `[${i}:a]aresample=44100:async=1,aformat=sample_fmts=fltp:channel_layouts=stereo,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=${fadeDur.toFixed(3)},afade=t=out:st=${fadeOutStart.toFixed(3)}:d=${fadeDur.toFixed(3)}[a${i}]`
          );
        } else {
          filterParts.push(
            `[${i}:a]aresample=44100:async=1,aformat=sample_fmts=fltp:channel_layouts=stereo,asetpts=PTS-STARTPTS[a${i}]`
          );
        }
        concatInputs.push(`[v${i}][a${i}]`);
      } else {
        concatInputs.push(`[v${i}]`);
      }
    }

    if (withAudio) {
      filterParts.push(`${concatInputs.join('')}concat=n=${segments.length}:v=1:a=1[outv][outa]`);
      args.push(
        '-filter_complex',
        filterParts.join(';'),
        '-map',
        '[outv]',
        '-map',
        '[outa]',
        '-c:v',
        'libx264',
        '-preset',
        'ultrafast',
        '-crf',
        '22',
        '-pix_fmt',
        'yuv420p',
        '-r',
        String(TARGET_FPS),
        '-vsync',
        '1',
        '-g',
        String(TARGET_FPS),
        '-keyint_min',
        String(TARGET_FPS),
        '-c:a',
        'aac',
        '-ar',
        '44100',
        '-b:a',
        '128k',
        '-movflags',
        '+faststart',
        outputFileName
      );
    } else {
      filterParts.push(`${concatInputs.join('')}concat=n=${segments.length}:v=1:a=0[outv]`);
      args.push(
        '-filter_complex',
        filterParts.join(';'),
        '-map',
        '[outv]',
        '-c:v',
        'libx264',
        '-preset',
        'ultrafast',
        '-crf',
        '22',
        '-pix_fmt',
        'yuv420p',
        '-r',
        String(TARGET_FPS),
        '-vsync',
        '1',
        '-g',
        String(TARGET_FPS),
        '-keyint_min',
        String(TARGET_FPS),
        '-an',
        '-movflags',
        '+faststart',
        outputFileName
      );
    }

    return args;
  };

  if (preferAudio) {
    const audioExit = await ffmpeg.exec(buildArgs(true));
    if (audioExit === 0) {
      return { ok: true, usedAudio: true };
    }
  }

  const silentExit = await ffmpeg.exec(buildArgs(false));
  return { ok: silentExit === 0, usedAudio: false };
}

/**
 * High-Performance Client-Side WebAssembly Video Concatenation using @ffmpeg/ffmpeg.
 * - Mounts local File/Blob via WORKERFS (0 MB source RAM copy).
 * - Uses filter_complex `concat` with PTS-STARTPTS + 50ms audio fades + libx264 ultrafast CRF 22 30fps.
 * - Processes 15-20+ clips in bounded batches of 5 and deletes temp files immediately to keep memory stable.
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
  onProgress?.(1, totalClips, 18, 'Cargando motor FFmpeg WebAssembly (30 FPS CFR)...');

  const ffmpeg = await getLoadedFFmpegWithTimeout(20000);
  const sourceBlob = await resolveSourceBlob(sourceVideoUrl);
  if (sourceBlob.size < 5000) {
    throw new Error('El archivo de vídeo fuente es demasiado pequeño o está corrupto.');
  }

  onProgress?.(1, totalClips, 22, 'Montando vídeo fuente sin saturar memoria...');

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
    if (sourceBlob.size > 150 * 1024 * 1024) {
      throw new Error('Vídeo demasiado grande para memoria WASM; cambiando a renderizador continuo.');
    }
    inputPathInVfs = 'source.mp4';
    // Scope sourceBytes tightly so GC can reclaim the JS copy right after writeFile
    {
      const sourceBytes = new Uint8Array(await sourceBlob.arrayBuffer());
      await ffmpeg.writeFile(inputPathInVfs, sourceBytes);
    }
  }

  const tempFilesToClean = new Set<string>();
  let activeProgressHandler: ((ev: { progress: number }) => void) | null = null;

  const setWasmProgressWindow = (
    clipIdxDisplay: number,
    basePct: number,
    spanPct: number,
    label: string
  ) => {
    if (activeProgressHandler) {
      ffmpeg.off('progress', activeProgressHandler);
    }
    activeProgressHandler = ({ progress }) => {
      const clamped = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
      const pct = Math.min(96, Math.round(basePct + clamped * spanPct));
      onProgress?.(clipIdxDisplay, totalClips, pct, label);
    };
    ffmpeg.on('progress', activeProgressHandler);
  };

  try {
    let sourceHasAudio = true;

    // Single-pass filter_complex concat when <= WASM_CONCAT_BATCH_SIZE clips
    if (clips.length <= WASM_CONCAT_BATCH_SIZE) {
      tempFilesToClean.add('output.mp4');
      setWasmProgressWindow(
        totalClips,
        24,
        68,
        `Recodificando y uniendo ${totalClips} ${totalClips === 1 ? 'clip' : 'clips'} a 30 FPS...`
      );
      onProgress?.(1, totalClips, 24, `Uniendo ${totalClips} clips con alineación exacta de frames...`);

      const segments = clips.map((c) => ({
        inputPath: inputPathInVfs,
        startTime: Math.max(0, c.startTime),
        duration: Math.max(0.25, c.endTime - c.startTime),
        applyAudioFade: true
      }));

      const res = await execWasmConcatFilterBatch(ffmpeg, segments, 'output.mp4', sourceHasAudio);
      if (!res.ok) {
        throw new Error('Error en FFmpeg al recodificar y unir los clips.');
      }
    } else {
      // Batched concatenation for 6..20+ clips to keep WASM RAM stable
      const totalBatches = Math.ceil(clips.length / WASM_CONCAT_BATCH_SIZE);
      let currentLevelFiles: Array<{ file: string; duration: number }> = [];

      for (let b = 0; b < totalBatches; b++) {
        const startIdx = b * WASM_CONCAT_BATCH_SIZE;
        const batchClips = clips.slice(startIdx, startIdx + WASM_CONCAT_BATCH_SIZE);
        const batchFile = `batch_l0_${b}.mp4`;
        tempFilesToClean.add(batchFile);

        const basePct = 24 + Math.round((b / totalBatches) * 52);
        const spanPct = Math.max(6, Math.round(52 / totalBatches));
        const endClipNum = Math.min(totalClips, startIdx + batchClips.length);
        const label = `Procesando lote ${b + 1}/${totalBatches} (clips ${startIdx + 1}-${endClipNum})...`;

        setWasmProgressWindow(endClipNum, basePct, spanPct, label);
        onProgress?.(startIdx + 1, totalClips, basePct, label);

        const segments = batchClips.map((c) => ({
          inputPath: inputPathInVfs,
          startTime: Math.max(0, c.startTime),
          duration: Math.max(0.25, c.endTime - c.startTime),
          applyAudioFade: true
        }));

        const batchRes = await execWasmConcatFilterBatch(ffmpeg, segments, batchFile, sourceHasAudio);
        if (!batchRes.ok) {
          throw new Error(`Error en FFmpeg al procesar lote ${b + 1} de clips.`);
        }
        sourceHasAudio = batchRes.usedAudio;
        currentLevelFiles.push({
          file: batchFile,
          duration: segments.reduce((acc, s) => acc + s.duration, 0)
        });
      }

      // Free source input before merging batches to reclaim memory
      if (mountedWorkerFs) {
        try {
          await ffmpeg.unmount('/input');
          mountedWorkerFs = false;
        } catch {}
      } else {
        try {
          await ffmpeg.deleteFile(inputPathInVfs);
        } catch {}
      }

      // Merge batch files cleanly via concat filter with PTS-STARTPTS (hierarchical if > 5 batches)
      let level = 1;
      while (currentLevelFiles.length > 1) {
        const nextLevelFiles: Array<{ file: string; duration: number }> = [];
        const groups = Math.ceil(currentLevelFiles.length / WASM_CONCAT_BATCH_SIZE);
        const isFinalPass = groups === 1;

        for (let g = 0; g < groups; g++) {
          const groupItems = currentLevelFiles.slice(
            g * WASM_CONCAT_BATCH_SIZE,
            (g + 1) * WASM_CONCAT_BATCH_SIZE
          );
          const outFile = isFinalPass ? 'output.mp4' : `batch_l${level}_${g}.mp4`;
          tempFilesToClean.add(outFile);

          setWasmProgressWindow(
            totalClips,
            78,
            16,
            isFinalPass ? 'Ensamblando MP4 final sin saltos...' : `Consolidando bloques (${g + 1}/${groups})...`
          );
          onProgress?.(
            totalClips,
            totalClips,
            isFinalPass ? 82 : 78,
            isFinalPass ? 'Ensamblando MP4 final sin saltos...' : `Consolidando bloques (${g + 1}/${groups})...`
          );

          const mergeRes = await execWasmConcatFilterBatch(
            ffmpeg,
            groupItems.map((item) => ({
              inputPath: item.file,
              duration: item.duration,
              applyAudioFade: false
            })),
            outFile,
            sourceHasAudio
          );

          if (!mergeRes.ok) {
            throw new Error('Error en FFmpeg al ensamblar el montaje final.');
          }

          // Immediately delete consumed batch files to keep MEMFS lean
          for (const item of groupItems) {
            try {
              await ffmpeg.deleteFile(item.file);
              tempFilesToClean.delete(item.file);
            } catch {}
          }

          nextLevelFiles.push({
            file: outFile,
            duration: groupItems.reduce((acc, s) => acc + s.duration, 0)
          });
        }

        currentLevelFiles = nextLevelFiles;
        level += 1;
      }
    }

    onProgress?.(totalClips, totalClips, 95, 'Verificando archivo MP4 final...');
    let rawOutput: Uint8Array | string | null = await ffmpeg.readFile('output.mp4');
    const uint8Output =
      rawOutput instanceof Uint8Array ? rawOutput : new TextEncoder().encode(rawOutput);
    rawOutput = null;

    if (uint8Output.byteLength <= 500) {
      throw new Error(
        `El archivo generado pesa solo ${uint8Output.byteLength} bytes (vacío o corrupto).`
      );
    }

    // Remove output.mp4 from WASM MEMFS immediately after reading
    try {
      await ffmpeg.deleteFile('output.mp4');
      tempFilesToClean.delete('output.mp4');
    } catch {}

    const outputBlob = new Blob([uint8Output as BlobPart], { type: 'video/mp4' });
    const blobUrl = URL.createObjectURL(outputBlob);
    onProgress?.(totalClips, totalClips, 100, '¡Vídeo completado a 30 FPS fluidos!');
    triggerBrowserDownload(blobUrl, targetFilename, outputBlob.size);
    return blobUrl;
  } finally {
    if (activeProgressHandler) {
      try {
        ffmpeg.off('progress', activeProgressHandler);
      } catch {}
    }
    if (mountedWorkerFs) {
      try {
        await ffmpeg.unmount('/input');
      } catch {}
    } else {
      try {
        await ffmpeg.deleteFile('source.mp4');
      } catch {}
    }
    for (const f of tempFilesToClean) {
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
 * 2. Client FFmpeg.wasm with WORKERFS (single-pass or batched concat filter, 0 RAM source copy).
 * 3. Client Dual-Deck Preloading Canvas + requestVideoFrameCallback + Web Audio 50ms Fade MediaRecorder.
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
      const timeoutId = setTimeout(() => controller.abort(), 90000);

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
    console.warn('FFmpeg.wasm fallback to Dual-Deck Canvas 30 FPS engine:', wasmErr);
  }

  // Strategy 3: Dual-Deck Preloading Canvas + requestVideoFrameCallback + Web Audio 50ms Fade
  onProgress?.(1, totalClips, 30, 'Generando vídeo mediante renderizador continuo a 30 FPS...');
  return concatenateClipsClientSide(sourceVideoUrl, clips, onProgress || (() => {}), targetFilename);
}

interface VideoDeck {
  video: HTMLVideoElement;
  gainNode: GainNode | null;
}

function createHiddenVideoDeck(sourceVideoUrl: string): HTMLVideoElement {
  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.playsInline = true;
  video.preload = 'auto';
  video.muted = false;

  // Visible layout dimensions prevent Chromium from throttling the hardware decoder
  video.style.position = 'fixed';
  video.style.left = '0';
  video.style.top = '0';
  video.style.width = '320px';
  video.style.height = '180px';
  video.style.opacity = '0.01';
  video.style.pointerEvents = 'none';
  video.style.zIndex = '-9999';
  document.body.appendChild(video);
  video.src = sourceVideoUrl;
  return video;
}

/**
 * Preloads & seeks a standby video deck to `targetTime` so the next cut switches
 * instantaneously with 0 black frames or seek stalls.
 */
function preloadDeckToTime(video: HTMLVideoElement, targetTime: number, timeoutMs = 1500): Promise<void> {
  return new Promise((resolve) => {
    const safeTarget = Math.max(0, targetTime);
    if (Math.abs(video.currentTime - safeTarget) <= 0.04 && video.readyState >= 2) {
      resolve();
      return;
    }

    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const finish = () => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('canplay', onCanPlay);
      resolve();
    };

    const onCanPlay = () => {
      if (Math.abs(video.currentTime - safeTarget) <= 0.25 && video.readyState >= 2) {
        finish();
      }
    };

    const onSeeked = () => {
      if (video.readyState >= 2) {
        finish();
      } else {
        video.addEventListener('canplay', finish, { once: true });
      }
    };

    video.addEventListener('seeked', onSeeked, { once: true });
    video.addEventListener('canplay', onCanPlay);
    timer = setTimeout(finish, timeoutMs);

    try {
      video.pause();
      video.currentTime = safeTarget;
    } catch {
      finish();
    }
  });
}

/**
 * High-Precision Dual-Deck Client-Side Video Concatenation Engine:
 * - Preloads the next clip on a standby <video> deck while the active clip plays (zero black frames).
 * - Synchronizes canvas drawing using `requestVideoFrameCallback` at fixed resolution & 30 FPS.
 * - Uses 6.5 Mbps bitrate (5-8 Mbps) and 50ms Web Audio fade-in/out per clip to prevent clicks.
 * - Releases all buffers, DOM nodes, tracks, and AudioContext immediately upon completion.
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
    const videoA = createHiddenVideoDeck(sourceVideoUrl);
    const videoB = createHiddenVideoDeck(sourceVideoUrl);

    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d', { alpha: false });

    if (!ctx) {
      videoA.remove();
      videoB.remove();
      reject(new Error('No se pudo inicializar el Canvas 2D.'));
      return;
    }

    // Set up Web Audio API gain-controlled mixing (silent to speakers, recorded to stream)
    let audioCtx: AudioContext | null = null;
    let audioDest: MediaStreamAudioDestinationNode | null = null;
    let gainA: GainNode | null = null;
    let gainB: GainNode | null = null;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtx = new AudioCtx({ sampleRate: 44100 });
        audioDest = audioCtx.createMediaStreamDestination();

        const srcA = audioCtx.createMediaElementSource(videoA);
        gainA = audioCtx.createGain();
        gainA.gain.value = 0;
        srcA.connect(gainA);
        gainA.connect(audioDest);

        const srcB = audioCtx.createMediaElementSource(videoB);
        gainB = audioCtx.createGain();
        gainB.gain.value = 0;
        srcB.connect(gainB);
        gainB.connect(audioDest);
      }
    } catch (audioErr) {
      console.warn('Web Audio montage mix unavailable, continuing video-only:', audioErr);
      audioCtx = null;
      audioDest = null;
      gainA = null;
      gainB = null;
    }

    const decks: [VideoDeck, VideoDeck] = [
      { video: videoA, gainNode: gainA },
      { video: videoB, gainNode: gainB }
    ];

    const canvasStream = canvas.captureStream(TARGET_FPS);
    const combinedTracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
    if (audioDest && audioDest.stream.getAudioTracks().length > 0) {
      combinedTracks.push(...audioDest.stream.getAudioTracks());
    }
    const combinedStream = new MediaStream(combinedTracks);

    const hasAudioTrack = combinedStream.getAudioTracks().length > 0;
    const candidateMimes = hasAudioTrack
      ? [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm;codecs=vp9',
          'video/webm;codecs=vp8',
          'video/webm',
          'video/mp4'
        ]
      : ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];

    let mimeType = '';
    for (const candidate of candidateMimes) {
      if (MediaRecorder.isTypeSupported(candidate)) {
        mimeType = candidate;
        break;
      }
    }

    const recordedChunks: Blob[] = [];
    let mediaRecorder: MediaRecorder;
    try {
      const options: MediaRecorderOptions = {
        videoBitsPerSecond: CLIENT_VIDEO_BITRATE
      };
      if (hasAudioTrack) options.audioBitsPerSecond = 128_000;
      if (mimeType) options.mimeType = mimeType;
      mediaRecorder = new MediaRecorder(combinedStream, options);
    } catch {
      mediaRecorder = new MediaRecorder(combinedStream);
    }

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    const totalClips = clips.length;
    let isTerminated = false;
    let hasStarted = false;
    let activeRvfcHandle: number | null = null;
    let activeRafHandle: number | null = null;
    let activeDeckRef: VideoDeck | null = null;
    let standbyPreloadPromise: Promise<void> = Promise.resolve();

    const hasRvfc =
      typeof HTMLVideoElement !== 'undefined' &&
      'requestVideoFrameCallback' in HTMLVideoElement.prototype;

    const stopFramePump = () => {
      if (activeRvfcHandle !== null && activeDeckRef) {
        try {
          (activeDeckRef.video as any).cancelVideoFrameCallback?.(activeRvfcHandle);
        } catch {}
        activeRvfcHandle = null;
      }
      if (activeRafHandle !== null) {
        cancelAnimationFrame(activeRafHandle);
        activeRafHandle = null;
      }
    };

    const cleanupResources = () => {
      stopFramePump();
      for (const d of decks) {
        try {
          d.video.pause();
          d.video.removeAttribute('src');
          d.video.load();
          if (d.video.parentNode) {
            d.video.parentNode.removeChild(d.video);
          }
        } catch {}
      }
      combinedStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close().catch(() => {});
      }
      canvas.width = 0;
      canvas.height = 0;
    };

    const masterTimeout = setTimeout(() => {
      console.warn('Master montage timeout reached, forcing finish...');
      finishRecording();
    }, Math.max(120000, totalClips * 25000));

    const finishRecording = () => {
      if (isTerminated) return;
      isTerminated = true;
      clearTimeout(masterTimeout);
      stopFramePump();

      for (const d of decks) {
        try {
          d.video.pause();
        } catch {}
      }

      if (mediaRecorder.state !== 'inactive') {
        try {
          if (mediaRecorder.state === 'paused') {
            mediaRecorder.resume();
          }
          mediaRecorder.stop();
        } catch {
          cleanupResources();
          reject(new Error('No se pudo finalizar la grabación del vídeo.'));
        }
      } else {
        cleanupResources();
        reject(new Error('No se pudo iniciar la grabación del vídeo.'));
      }
    };

    mediaRecorder.onstop = async () => {
      const outputMime = mediaRecorder.mimeType || 'video/webm';
      let finalBlob: Blob | null = new Blob(recordedChunks, { type: outputMime });
      // Immediately release recorded chunks from memory
      recordedChunks.length = 0;
      cleanupResources();

      if (finalBlob.size <= 500) {
        finalBlob = null;
        reject(
          new Error('El archivo generado está vacío. Asegúrese de que el vídeo es reproducible.')
        );
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
      const finalSize = finalBlob.size;
      finalBlob = null;
      onProgress(totalClips, totalClips, 100, '¡Descarga lista a 30 FPS!');
      triggerBrowserDownload(blobUrl, finalName, finalSize);
      resolve(blobUrl);
    };

    const scheduleAudioFadeIn = (deck: VideoDeck) => {
      if (!audioCtx || !deck.gainNode) return;
      const now = audioCtx.currentTime;
      deck.gainNode.gain.cancelScheduledValues(now);
      deck.gainNode.gain.setValueAtTime(0, now);
      deck.gainNode.gain.linearRampToValueAtTime(1, now + 0.05);
    };

    const scheduleAudioFadeOut = (deck: VideoDeck) => {
      if (!audioCtx || !deck.gainNode) return;
      const now = audioCtx.currentTime;
      deck.gainNode.gain.cancelScheduledValues(now);
      deck.gainNode.gain.setValueAtTime(deck.gainNode.gain.value, now);
      deck.gainNode.gain.linearRampToValueAtTime(0, now + 0.05);
    };

    const silenceAudioImmediate = (deck: VideoDeck) => {
      if (!audioCtx || !deck.gainNode) return;
      const now = audioCtx.currentTime;
      deck.gainNode.gain.cancelScheduledValues(now);
      deck.gainNode.gain.setValueAtTime(0, now);
    };

    const drawDeckFrame = (video: HTMLVideoElement) => {
      if (ctx && video.readyState >= 2 && canvas.width > 0 && canvas.height > 0) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
    };

    const playClipAtIndex = async (index: number) => {
      if (isTerminated) return;
      if (index >= totalClips) {
        finishRecording();
        return;
      }

      const clip = clips[index];
      const deck = decks[index % 2];
      const standbyDeck = decks[(index + 1) % 2];
      const clipStart = Math.max(0, clip.startTime);
      const clipEnd = Math.max(clipStart + 0.25, clip.endTime);
      const clipDur = clipEnd - clipStart;

      const stepPct = 30 + Math.round((index / totalClips) * 62);
      onProgress(
        index + 1,
        totalClips,
        stepPct,
        `Renderizando: ${clip.title} (${index + 1}/${totalClips})...`
      );

      // Wait for the preloaded active deck only if it hasn't finished seeking yet
      if (deck.video.readyState < 2 || Math.abs(deck.video.currentTime - clipStart) > 0.25) {
        const shouldPauseRecorder = index > 0 && mediaRecorder.state === 'recording';
        if (shouldPauseRecorder) {
          try {
            mediaRecorder.pause();
          } catch {}
        }
        await standbyPreloadPromise;
        if (deck.video.readyState < 2 || Math.abs(deck.video.currentTime - clipStart) > 0.25) {
          await preloadDeckToTime(deck.video, clipStart, 1500);
        }
        if (isTerminated) return;
        if (shouldPauseRecorder && mediaRecorder.state === 'paused') {
          try {
            mediaRecorder.resume();
          } catch {}
        }
      }

      // Immediately pre-seek the standby deck to clip index + 1 while this clip plays
      if (index + 1 < totalClips) {
        const nextClipStart = Math.max(0, clips[index + 1].startTime);
        standbyPreloadPromise = preloadDeckToTime(standbyDeck.video, nextClipStart, 1800);
      } else {
        standbyPreloadPromise = Promise.resolve();
      }

      // Draw exact first frame of the new clip before resuming/starting recorder
      activeDeckRef = deck;
      drawDeckFrame(deck.video);

      if (index === 0 && mediaRecorder.state === 'inactive') {
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume().catch(() => {});
        }
        mediaRecorder.start(250);
      }

      silenceAudioImmediate(standbyDeck);
      scheduleAudioFadeIn(deck);

      let hasAdvanced = false;
      let hasTriggeredFadeOut = false;
      let clipWatchdog: ReturnType<typeof setTimeout> | null = null;

      const advanceToNext = () => {
        if (hasAdvanced || isTerminated) return;
        hasAdvanced = true;
        if (clipWatchdog) clearTimeout(clipWatchdog);
        stopFramePump();
        deck.video.removeEventListener('timeupdate', handleTimeUpdate);
        deck.video.removeEventListener('ended', advanceToNext);
        silenceAudioImmediate(deck);
        deck.video.pause();
        playClipAtIndex(index + 1);
      };

      const checkProgressAndFade = (t: number) => {
        if (!hasTriggeredFadeOut && clipDur > 0.15 && t >= clipEnd - 0.055) {
          hasTriggeredFadeOut = true;
          scheduleAudioFadeOut(deck);
        }
        if (t >= clipEnd) {
          advanceToNext();
        }
      };

      const handleTimeUpdate = () => {
        checkProgressAndFade(deck.video.currentTime);
      };

      const pumpVideoFrames = () => {
        if (hasAdvanced || isTerminated || activeDeckRef !== deck) return;
        drawDeckFrame(deck.video);
        checkProgressAndFade(deck.video.currentTime);
        if (!hasAdvanced && !isTerminated) {
          if (hasRvfc) {
            activeRvfcHandle = (deck.video as any).requestVideoFrameCallback(pumpVideoFrames);
          } else {
            activeRafHandle = requestAnimationFrame(pumpVideoFrames);
          }
        }
      };

      deck.video.addEventListener('timeupdate', handleTimeUpdate);
      deck.video.addEventListener('ended', advanceToNext, { once: true });
      deck.video.playbackRate = 1.0;

      if (hasRvfc) {
        activeRvfcHandle = (deck.video as any).requestVideoFrameCallback(pumpVideoFrames);
      } else {
        activeRafHandle = requestAnimationFrame(pumpVideoFrames);
      }

      deck.video.play().catch((playErr) => {
        // Fallback if unmuted autoplay is blocked outside user gesture
        if (playErr?.name === 'NotAllowedError') {
          deck.video.muted = true;
          standbyDeck.video.muted = true;
          deck.video.play().catch((err2) => console.warn('video.play() retry failed:', err2));
        } else {
          console.warn('video.play() caught:', playErr);
        }
      });

      const maxWaitMs = Math.max(1500, (clipDur + 1.5) * 1000);
      clipWatchdog = setTimeout(() => {
        console.warn(`Watchdog advancing clip ${index + 1}`);
        advanceToNext();
      }, maxWaitMs);
    };

    const startProcessing = async () => {
      if (hasStarted || isTerminated) return;
      hasStarted = true;

      if (videoA.videoWidth && videoA.videoHeight) {
        const aspect = videoA.videoWidth / videoA.videoHeight;
        canvas.width = Math.min(1280, Math.max(640, videoA.videoWidth));
        canvas.height = Math.round(canvas.width / aspect);
        // Ensure even dimensions for H.264/VP9
        if (canvas.width % 2 !== 0) canvas.width -= 1;
        if (canvas.height % 2 !== 0) canvas.height -= 1;
      }

      // Preload Clip 0 on Deck A (and Clip 1 on Deck B in parallel if present)
      const firstStart = Math.max(0, clips[0].startTime);
      const preloadTasks = [preloadDeckToTime(decks[0].video, firstStart, 2000)];
      if (clips.length > 1) {
        standbyPreloadPromise = preloadDeckToTime(
          decks[1].video,
          Math.max(0, clips[1].startTime),
          2000
        );
      }
      await Promise.all(preloadTasks);
      if (!isTerminated) {
        playClipAtIndex(0);
      }
    };

    if (videoA.readyState >= 2) {
      startProcessing();
    } else {
      videoA.onloadeddata = () => {
        videoA.onloadeddata = null;
        startProcessing();
      };
      videoA.oncanplay = () => {
        videoA.oncanplay = null;
        startProcessing();
      };
      setTimeout(() => {
        startProcessing();
      }, 1800);
    }

    videoA.onerror = () => {
      if (isTerminated) return;
      isTerminated = true;
      clearTimeout(masterTimeout);
      cleanupResources();
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
