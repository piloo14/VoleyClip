import React, { useState, useRef } from 'react';
import {
  Download,
  Share2,
  X,
  Smartphone,
  Copy,
  Check,
  Send,
  Printer,
  Sparkles,
  Play,
  Film
} from 'lucide-react';
import { ClubCrest, TacticalClip } from '../../types/tactical';

interface ExportShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetClip?: TacticalClip;
  allFavoriteClips: TacticalClip[];
  videoUrl: string;
  crest: ClubCrest;
  matchTitle: string;
}

export const ExportShareModal: React.FC<ExportShareModalProps> = ({
  isOpen,
  onClose,
  targetClip,
  allFavoriteClips,
  videoUrl,
  crest,
  matchTitle
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'video' | 'mobile' | 'whatsapp' | 'report'>('video');
  const [exportScope, setExportScope] = useState<'single' | 'compilation'>(
    targetClip ? 'single' : 'compilation'
  );
  const [includeVoice, setIncludeVoice] = useState(true);
  const [includeTelestrations, setIncludeTelestrations] = useState(true);
  const [includeWatermark, setIncludeWatermark] = useState(true);
  const [includeLowerThird, setIncludeLowerThird] = useState(true);

  // Rendering state
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [renderStatusText, setRenderStatusText] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Mobile preview playback state
  const [mobilePlaying, setMobilePlaying] = useState(false);

  // Hidden canvas for video synthesis
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeClipsToExport =
    exportScope === 'single' && targetClip
      ? [targetClip]
      : allFavoriteClips.length > 0
      ? allFavoriteClips
      : targetClip
      ? [targetClip]
      : [];

  const firstClip = activeClipsToExport[0];

  // Generate shareable link
  const generateShareUrl = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const clipData = firstClip
      ? encodeURIComponent(
          JSON.stringify({
            title: firstClip.title,
            start: firstClip.startTime,
            end: firstClip.endTime,
            notes: firstClip.notes,
            players: firstClip.lowerThird?.players || ''
          })
        )
      : '';
    return `${baseUrl}#player-view?clip=${clipData}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generateShareUrl());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // WhatsApp formatted message
  const getWhatsAppMessage = () => {
    if (!firstClip) return '';
    const shareUrl = generateShareUrl();
    const text = `📋 *CORTAZO PRO - ANÁLISIS TÁCTICO*
🏆 *Partido:* ${matchTitle}
⚽ *Jugada:* ${firstClip.title}
⏱️ *Tramo:* ${firstClip.startTime.toFixed(1)}s - ${firstClip.endTime.toFixed(1)}s (${(
      firstClip.endTime - firstClip.startTime
    ).toFixed(1)}s)
📌 *Instrucción Táctica:* ${firstClip.notes || 'Revisar lectura en la pizarra'}
${firstClip.lowerThird?.players ? `👥 *Jugadores:* ${firstClip.lowerThird.players}\n` : ''}
📲 *Ver Jugada con Pizarra en Móvil:* ${shareUrl}`;
    return encodeURIComponent(text);
  };

  const handleSendWhatsApp = () => {
    const encoded = getWhatsAppMessage();
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  // Client-Side Video Rendering Engine using Canvas + MediaRecorder
  const handleStartRender = async () => {
    if (activeClipsToExport.length === 0) return;
    setIsRendering(true);
    setRenderProgress(0);
    setDownloadUrl(null);
    setRenderStatusText('Iniciando motor de composición táctica...');

    try {
      const offscreenVideo = document.createElement('video');
      offscreenVideo.crossOrigin = 'anonymous';
      offscreenVideo.src = videoUrl;
      offscreenVideo.muted = true;
      offscreenVideo.playsInline = true;

      await new Promise((resolve, reject) => {
        offscreenVideo.onloadedmetadata = resolve;
        offscreenVideo.onerror = reject;
      });

      const width = 1280;
      const height = 720;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No se pudo inicializar el contexto 2D');

      // Preload crest image if enabled
      let crestImg: HTMLImageElement | null = null;
      if (includeWatermark && crest && crest.url) {
        crestImg = new Image();
        crestImg.src = crest.url;
        await new Promise((res) => {
          if (crestImg) crestImg.onload = res;
        });
      }

      // Stream & MediaRecorder setup
      const fps = 30;
      const canvasStream = canvas.captureStream(fps);

      // Web Audio API mixer for coach voice
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const dest = audioCtx.createMediaStreamDestination();
      let hasAudioTrack = false;

      // Check mime type support
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      // Create merged stream if audio is present
      const combinedTracks = [...canvasStream.getVideoTracks()];
      if (dest.stream.getAudioTracks().length > 0) {
        combinedTracks.push(...dest.stream.getAudioTracks());
      }
      const combinedStream = new MediaStream(combinedTracks);

      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 3500000
      });

      const recordedChunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
      };

      recorder.start();

      // Render clips sequentially
      const totalClips = activeClipsToExport.length;
      for (let i = 0; i < totalClips; i++) {
        const clip = activeClipsToExport[i];
        setRenderStatusText(`Renderizando jugada ${i + 1} de ${totalClips}: "${clip.title}"...`);

        offscreenVideo.currentTime = clip.startTime;
        await new Promise((res) => {
          offscreenVideo.onseeked = res;
        });

        const clipDuration = clip.endTime - clip.startTime;
        const totalFrames = Math.max(10, Math.floor(clipDuration * fps));

        for (let f = 0; f < totalFrames; f++) {
          const currentT = clip.startTime + (f / totalFrames) * clipDuration;
          offscreenVideo.currentTime = currentT;
          await new Promise((res) => {
            offscreenVideo.onseeked = res;
          });

          // Draw base video frame
          ctx.drawImage(offscreenVideo, 0, 0, width, height);

          // Draw Telestrations if timestamp matches
          if (includeTelestrations && clip.telestrations.length > 0) {
            const activeFrame = clip.telestrations.find(
              (tf) => Math.abs(tf.timestamp - currentT) <= 0.8
            );
            if (activeFrame) {
              drawTelestrationsOnCanvas(ctx, activeFrame.shapes, width, height);
            }
          }

          // Draw Watermark / Club Crest
          if (includeWatermark && crestImg) {
            drawCrestOnCanvas(ctx, crestImg, crest, width, height);
          }

          // Draw Lower-Third Title Banner
          if (includeLowerThird && clip.lowerThird?.show) {
            const isIntro = clip.lowerThird.displayMode === 'intro';
            const clipElapsed = currentT - clip.startTime;
            if (!isIntro || clipElapsed <= 3.5) {
              drawLowerThirdOnCanvas(ctx, clip, width, height);
            }
          }

          // Update progress
          const currentProgress = Math.round(
            ((i * totalFrames + f) / (totalClips * totalFrames)) * 95
          );
          setRenderProgress(currentProgress);
        }
      }

      setRenderProgress(100);
      setRenderStatusText('Empaquetando archivo de vídeo final...');

      recorder.onstop = () => {
        const finalBlob = new Blob(recordedChunks, { type: mimeType });
        const finalUrl = URL.createObjectURL(finalBlob);
        setDownloadUrl(finalUrl);
        setIsRendering(false);
      };

      recorder.stop();
    } catch (err: any) {
      console.error('Error rendering video:', err);
      setIsRendering(false);
      setRenderStatusText('Error en la renderización: ' + (err.message || 'Error desconocido'));
    }
  };

  // Canvas drawing helpers
  const drawTelestrationsOnCanvas = (
    ctx: CanvasRenderingContext2D,
    shapes: any[],
    w: number,
    h: number
  ) => {
    shapes.forEach((s) => {
      ctx.save();
      ctx.strokeStyle = s.color || '#FACC15';
      ctx.fillStyle = s.color || '#FACC15';
      ctx.lineWidth = (s.width || 4) * 1.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (s.type === 'arrow_solid' || s.type === 'arrow_dashed') {
        if (!s.start || !s.end) return;
        const x1 = s.start.x * w;
        const y1 = s.start.y * h;
        const x2 = s.end.x * w;
        const y2 = s.end.y * h;

        ctx.beginPath();
        if (s.type === 'arrow_dashed') ctx.setLineDash([12, 8]);
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLength = 22;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(
          x2 - headLength * Math.cos(angle - Math.PI / 6),
          y2 - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          x2 - headLength * Math.cos(angle + Math.PI / 6),
          y2 - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
      } else if (s.type === 'circle') {
        if (!s.center || !s.radius) return;
        const cx = s.center.x * w;
        const cy = s.center.y * h;
        const r = s.radius * Math.min(w, h);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (s.type === 'text' && s.point && s.text) {
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(s.text, s.point.x * w, s.point.y * h);
      }
      ctx.restore();
    });
  };

  const drawCrestOnCanvas = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    c: ClubCrest,
    w: number,
    h: number
  ) => {
    ctx.save();
    ctx.globalAlpha = c.opacity;
    const size = c.size * 1.3;
    let x = w - size - 24;
    let y = 24;
    if (c.position === 'top-left') {
      x = 24;
      y = 24;
    } else if (c.position === 'bottom-left') {
      x = 24;
      y = h - size - 90;
    } else if (c.position === 'bottom-right') {
      x = w - size - 24;
      y = h - size - 90;
    }
    ctx.drawImage(img, x, y, size, size);
    ctx.restore();
  };

  const drawLowerThirdOnCanvas = (
    ctx: CanvasRenderingContext2D,
    clip: TacticalClip,
    w: number,
    h: number
  ) => {
    ctx.save();
    const boxX = 36;
    const boxY = h - 120;
    const boxW = 520;
    const boxH = 84;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.fillRect(boxX, boxY, boxW, boxH);

    // Accent line
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(boxX, boxY, 6, boxH);

    // Texts
    ctx.fillStyle = '#F59E0B';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText((clip.lowerThird?.category || 'CORTAZO PRO').toUpperCase(), boxX + 20, boxY + 22);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(clip.title, boxX + 20, boxY + 46);

    if (clip.notes) {
      ctx.fillStyle = '#CBD5E1';
      ctx.font = '13px sans-serif';
      const truncated = clip.notes.length > 55 ? clip.notes.substring(0, 52) + '...' : clip.notes;
      ctx.fillText(truncated, boxX + 20, boxY + 68);
    }
    ctx.restore();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div className="bg-neutral-900 border border-neutral-700 w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Exportar y Compartir Jugadas
            </h3>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white text-xs">
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-neutral-800 bg-neutral-950 text-xs">
          <button
            onClick={() => setActiveTab('video')}
            className={`flex-1 py-2.5 font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'video'
                ? 'border-b-2 border-amber-500 text-white bg-neutral-900'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Descargar Vídeo
          </button>
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex-1 py-2.5 font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'whatsapp'
                ? 'border-b-2 border-amber-500 text-white bg-neutral-900'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-emerald-400" />
            Enviar WhatsApp
          </button>
          <button
            onClick={() => setActiveTab('mobile')}
            className={`flex-1 py-2.5 font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'mobile'
                ? 'border-b-2 border-amber-500 text-white bg-neutral-900'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Vista Móvil (Jugador)
          </button>
        </div>

        {/* Tab 1: Video Rendering & Download */}
        {activeTab === 'video' && (
          <div className="p-5 space-y-4 overflow-y-auto">
            {/* Scope selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">Contenido a Exportar:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setExportScope('single')}
                  className={`p-3 text-left border transition-all ${
                    exportScope === 'single'
                      ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500'
                      : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="text-xs font-bold text-white">Jugada Actual</div>
                  <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                    {targetClip ? targetClip.title : 'Selecciona una jugada'}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setExportScope('compilation')}
                  className={`p-3 text-left border transition-all ${
                    exportScope === 'compilation'
                      ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500'
                      : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="text-xs font-bold text-white">
                    Recopilación Completa ({allFavoriteClips.length})
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    Todas las jugadas marcadas en Mi Selección
                  </div>
                </button>
              </div>
            </div>

            {/* Overlays toggles */}
            <div className="bg-neutral-950 p-3.5 border border-neutral-800 space-y-2">
              <div className="text-xs font-semibold text-neutral-300 mb-1">
                Capas a Incrustar en el Vídeo:
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-neutral-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTelestrations}
                    onChange={(e) => setIncludeTelestrations(e.target.checked)}
                    className="accent-amber-500"
                  />
                  Dibujos y Pizarra Táctica
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeWatermark}
                    onChange={(e) => setIncludeWatermark(e.target.checked)}
                    className="accent-amber-500"
                  />
                  Escudo del Club ({crest.name})
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeLowerThird}
                    onChange={(e) => setIncludeLowerThird(e.target.checked)}
                    className="accent-amber-500"
                  />
                  Rótulo Inferior (Lower-Third)
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeVoice}
                    onChange={(e) => setIncludeVoice(e.target.checked)}
                    className="accent-amber-500"
                  />
                  Audio con Nota de Voz
                </label>
              </div>
            </div>

            {/* Progress / Status */}
            {isRendering && (
              <div className="bg-neutral-950 p-3.5 border border-neutral-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-amber-400 font-semibold">{renderStatusText}</span>
                  <span className="font-mono text-white tabular-nums">{renderProgress}%</span>
                </div>
                <div className="h-2 bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all duration-200"
                    style={{ width: `${renderProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Download Button if ready */}
            {downloadUrl && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-700/60 flex items-center justify-between">
                <div className="text-xs text-emerald-300">
                  ✓ Vídeo procesado con éxito con todas las anotaciones.
                </div>
                <a
                  href={downloadUrl}
                  download={`cortazo_${exportScope === 'single' ? 'jugada' : 'recopilacion'}.webm`}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar Archivo
                </a>
              </div>
            )}

            {/* Start Render Button */}
            {!isRendering && !downloadUrl && (
              <button
                onClick={handleStartRender}
                disabled={activeClipsToExport.length === 0}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-800 disabled:text-neutral-500 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Film className="w-4 h-4" />
                Renderizar y Generar Vídeo
              </button>
            )}
          </div>
        )}

        {/* Tab 2: WhatsApp Sharing */}
        {activeTab === 'whatsapp' && (
          <div className="p-5 space-y-4">
            <div className="text-xs text-neutral-300">
              Envía la jugada o la recopilación directamente al grupo de WhatsApp del equipo. Los
              jugadores recibirán un enlace limpio para abrir la pizarra y las notas en su móvil sin
              necesidad de instalar nada.
            </div>

            {/* Preformatted Message Preview */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-neutral-400">
                Vista previa del mensaje a enviar:
              </label>
              <div className="bg-neutral-950 p-3 border border-neutral-800 font-mono text-xs text-neutral-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                {decodeURIComponent(getWhatsAppMessage())}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleCopyLink}
                className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 border border-neutral-700 transition-colors"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copiedLink ? '¡Enlace Copiado!' : 'Copiar Enlace Móvil'}
              </button>
              <button
                onClick={handleSendWhatsApp}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-md"
              >
                <Send className="w-4 h-4" />
                Abrir WhatsApp
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Mobile Player Preview */}
        {activeTab === 'mobile' && (
          <div className="p-5 space-y-4 flex flex-col items-center">
            <div className="text-xs text-neutral-400 text-center max-w-md">
              Así verán los jugadores esta jugada en su teléfono móvil sin necesidad de registro ni
              descargas.
            </div>

            {/* Simulated Smartphone Shell */}
            <div className="w-[280px] bg-neutral-950 border-4 border-neutral-800 rounded-2xl overflow-hidden shadow-2xl p-2 space-y-2">
              <div className="w-16 h-3 bg-neutral-800 rounded-full mx-auto" />

              {/* Mobile Viewport */}
              <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                <video
                  src={videoUrl}
                  playsInline
                  className="w-full h-full object-contain"
                  controls
                />
                {crest.url && (
                  <img
                    src={crest.url}
                    alt={crest.name}
                    className="absolute top-2 right-2 w-7 h-7 drop-shadow-sm pointer-events-none"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>

              {/* Mobile Info Sheet */}
              <div className="p-2 bg-neutral-900 space-y-1.5 text-left">
                <div className="text-[10px] text-amber-400 font-bold uppercase">
                  {firstClip?.lowerThird?.category || 'CORTAZO PRO'}
                </div>
                <div className="text-xs font-bold text-white leading-tight">
                  {firstClip?.title}
                </div>
                {firstClip?.notes && (
                  <div className="text-[11px] text-neutral-300 leading-snug">
                    {firstClip.notes}
                  </div>
                )}
                {firstClip?.lowerThird?.players && (
                  <div className="text-[10px] text-neutral-400">
                    Foco: {firstClip.lowerThird.players}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs px-4 py-1.5 border border-neutral-700 transition-colors"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copiedLink ? '¡Enlace Copiado!' : 'Copiar Enlace para Jugadores'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
