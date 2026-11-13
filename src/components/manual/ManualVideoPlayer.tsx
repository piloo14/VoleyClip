import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef
} from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Scissors,
  Maximize2,
  Minimize2,
  PenTool,
  Upload,
  Link as LinkIcon,
  Film,
  RotateCcw,
  RotateCw,
  X,
  ArrowRightToLine,
  ArrowLeftToLine,
  Undo2,
  Save,
  Trash2,
  Type,
  Circle,
  MoveUpRight,
  Spline,
  UserCheck
} from 'lucide-react';
import { VolleyballFolder, ManualTacticalClip } from '../../types/manualTactical';
import { captureVideoThumbnail } from '../../utils/thumbnailGenerator';
import { uploadSourceVideoToServer } from '../../utils/videoMontage';
import { formatTimecodeHMS, formatTimecodeShort } from '../../utils/timecode';
import { TelestrationCanvas } from '../canvas/TelestrationCanvas';
import { TelestrationShape, TelestrationTool } from '../../types/tactical';

export interface CutFeedbackInfo {
  folderName: string;
  icon: string;
  key: string;
  start: number;
  end: number;
}

export interface ManualVideoPlayerHandle {
  cutToFolder: (folderId: string, customKeyLabel?: string) => void;
  quickCut: () => void;
  markIn: () => void;
  markOut: () => void;
  togglePlay: () => void;
  stepFrame: (frames: number) => void;
  skipSeconds: (sec: number) => void;
  seekTo: (time: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
}

export interface ManualVideoPlayerProps {
  videoUrl: string;
  videoTitle: string;
  folders: VolleyballFolder[];
  activeFolderId: string;
  activeClip?: ManualTacticalClip | null;
  openTelestrationNonce?: number;
  preRollSec?: number; // default 1.5s
  postRollSec?: number; // default 2.0s
  onSelectFolder: (folderId: string) => void;
  onClipCreated: (newClip: ManualTacticalClip) => void;
  onSaveClipTelestrations?: (
    clipId: string,
    shapes: TelestrationShape[],
    updatedThumbnailUrl?: string
  ) => void;
  onVideoSourceChange: (newUrl: string, title: string) => void;
  externalSeekTime?: number | null;
}

export const ManualVideoPlayer = forwardRef<ManualVideoPlayerHandle, ManualVideoPlayerProps>(
  (
    {
      videoUrl,
      videoTitle,
      folders,
      activeFolderId,
      activeClip = null,
      openTelestrationNonce = 0,
      preRollSec = 1.5,
      postRollSec = 2.0,
      onSelectFolder,
      onClipCreated,
      onSaveClipTelestrations,
      onVideoSourceChange,
      externalSeekTime
    },
    ref
  ) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    // In / Out Marks
    const [markIn, setMarkIn] = useState<number | null>(null);
    const [markOut, setMarkOut] = useState<number | null>(null);

    // Visual On-Screen Shutter / Cut Flash Feedback
    const [cutFeedback, setCutFeedback] = useState<CutFeedbackInfo | null>(null);
    const [isFlashing, setIsFlashing] = useState(false);

    // Telestration Drawing State
    const [isTelestrationOpen, setIsTelestrationOpen] = useState(false);
    const [activeTool, setActiveTool] = useState<TelestrationTool>('ball_trajectory');
    const [activeColor, setActiveColor] = useState('#F97316');
    const [activeWidth, setActiveWidth] = useState(4);
    const [currentShapes, setCurrentShapes] = useState<TelestrationShape[]>([]);
    const [videoBox, setVideoBox] = useState({ left: 0, top: 0, width: 854, height: 480 });

    // Source change
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [customUrl, setCustomUrl] = useState('');
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const activeFolder = folders.find((f) => f.id === activeFolderId) || folders[0];

    // Compute exact rendered video bounds (object-contain) so annotations align pixel-for-pixel
    const updateVideoBox = useCallback(() => {
      const container = containerRef.current;
      if (!container) return;
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      if (cw <= 0 || ch <= 0) return;

      const vw = videoRef.current?.videoWidth || 16;
      const vh = videoRef.current?.videoHeight || 9;
      const containerAspect = cw / ch;
      const videoAspect = vw / vh;

      let renderW = cw;
      let renderH = ch;
      if (videoAspect > containerAspect) {
        renderW = cw;
        renderH = cw / videoAspect;
      } else {
        renderH = ch;
        renderW = ch * videoAspect;
      }

      setVideoBox({
        left: Math.round((cw - renderW) / 2),
        top: Math.round((ch - renderH) / 2),
        width: Math.max(1, Math.round(renderW)),
        height: Math.max(1, Math.round(renderH))
      });
    }, []);

    useEffect(() => {
      updateVideoBox();
      const container = containerRef.current;
      if (!container) return;
      const observer = new ResizeObserver(() => updateVideoBox());
      observer.observe(container);
      window.addEventListener('resize', updateVideoBox);
      return () => {
        observer.disconnect();
        window.removeEventListener('resize', updateVideoBox);
      };
    }, [updateVideoBox, videoUrl]);

    // Load saved drawings whenever the inspected activeClip changes
    useEffect(() => {
      if (activeClip) {
        setCurrentShapes(activeClip.telestrations ? [...activeClip.telestrations] : []);
      } else {
        setCurrentShapes([]);
      }
    }, [activeClip?.id]);

    // Open drawing mode when requested from a clip card
    useEffect(() => {
      if (openTelestrationNonce > 0 && videoUrl) {
        if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
          setIsPlaying(false);
        }
        setIsTelestrationOpen(true);
      }
    }, [openTelestrationNonce, videoUrl]);

    // External seek time (e.g. clicking clip to inspect)
    useEffect(() => {
      if (externalSeekTime !== null && externalSeekTime !== undefined && videoRef.current) {
        videoRef.current.currentTime = externalSeekTime;
        setCurrentTime(externalSeekTime);
      }
    }, [externalSeekTime]);

    // Play / Pause toggle
    const togglePlay = useCallback(() => {
      if (!videoRef.current) return;
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch((e) => console.warn(e));
      }
    }, [isPlaying]);

    // Step frame at 30fps
    const stepFrame = useCallback(
      (frames: number) => {
        if (!videoRef.current) return;
        videoRef.current.pause();
        setIsPlaying(false);
        const newTime = Math.max(
          0,
          Math.min(duration || 100, videoRef.current.currentTime + frames * (1 / 30))
        );
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      },
      [duration]
    );

    // Skip seconds forward/backward (does NOT force pause)
    const skipSeconds = useCallback(
      (sec: number) => {
        if (!videoRef.current) return;
        const current = videoRef.current.currentTime;
        const maxDuration =
          videoRef.current.duration && !isNaN(videoRef.current.duration)
            ? videoRef.current.duration
            : duration || 999999;
        const newTime = Math.max(0, Math.min(maxDuration, current + sec));
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      },
      [duration]
    );

    // In / Out setters
    const handleMarkIn = useCallback(() => {
      if (!videoRef.current) return;
      const t = videoRef.current.currentTime;
      setMarkIn(t);
      if (markOut !== null && markOut <= t) {
        setMarkOut(Math.min(duration || 100, t + 3.5));
      }
    }, [duration, markOut]);

    const handleMarkOut = useCallback(() => {
      if (!videoRef.current) return;
      const t = videoRef.current.currentTime;
      setMarkOut(t);
      if (markIn === null || markIn >= t) {
        setMarkIn(Math.max(0, t - 3.5));
      }
    }, [markIn]);

    // CORE CUT TO TARGET FOLDER (1.5s antes / 2.0s después or manual IN/OUT)
    const cutToFolder = useCallback(
      (targetFolderId: string, customKeyLabel?: string) => {
        if (!videoRef.current || !videoUrl) return;

        let start = 0;
        let end = 0;

        const maxDuration = duration || (videoRef.current ? videoRef.current.duration : 0) || 999999;

        if (markIn !== null && markOut !== null && markOut > markIn) {
          start = markIn;
          end = Math.min(maxDuration, markOut);
        } else {
          const cTime = videoRef.current.currentTime;
          start = Math.max(0, cTime - preRollSec);
          end = Math.min(maxDuration, cTime + postRollSec);
        }

        const clipDuration = +(end - start).toFixed(2);
        if (clipDuration < 0.2) return;

        const shapesSnapshot = currentShapes.length > 0 ? [...currentShapes] : undefined;
        const thumbnail = captureVideoThumbnail(videoRef.current, 320, 180, shapesSnapshot);
        const folder = folders.find((f) => f.id === targetFolderId) || folders[0];
        const keyLabel = customKeyLabel || folder.shortcutKey || 'C';

        const newClip: ManualTacticalClip = {
          id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          title: `${folder.name} (${formatTimecodeShort(start)} - ${formatTimecodeShort(end)})`,
          folderId: folder.id,
          startTime: +start.toFixed(2),
          endTime: +end.toFixed(2),
          duration: clipDuration,
          thumbnailUrl: thumbnail,
          telestrations: shapesSnapshot,
          notes: '',
          createdAt: Date.now()
        };

        onClipCreated(newClip);
        onSelectFolder(folder.id);

        setCutFeedback({
          folderName: folder.name,
          icon: folder.icon,
          key: keyLabel,
          start: +start.toFixed(1),
          end: +end.toFixed(1)
        });
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 180);
        setTimeout(() => setCutFeedback(null), 2400);

        setMarkIn(null);
        setMarkOut(null);
        setIsTelestrationOpen(false);
      },
      [
        videoUrl,
        markIn,
        markOut,
        preRollSec,
        postRollSec,
        duration,
        folders,
        currentShapes,
        onClipCreated,
        onSelectFolder
      ]
    );

    const handleSaveDrawingToActiveClip = useCallback(() => {
      if (!activeClip || !onSaveClipTelestrations) return;
      const updatedThumb = videoRef.current
        ? captureVideoThumbnail(videoRef.current, 320, 180, currentShapes)
        : activeClip.thumbnailUrl;
      onSaveClipTelestrations(activeClip.id, [...currentShapes], updatedThumb);
      setIsTelestrationOpen(false);
    }, [activeClip, onSaveClipTelestrations, currentShapes]);

    const handleUndoLastShape = useCallback(() => {
      setCurrentShapes((prev) => prev.slice(0, -1));
    }, []);

    const executeQuickCut = useCallback(() => {
      cutToFolder(activeFolderId);
    }, [cutToFolder, activeFolderId]);

    useImperativeHandle(
      ref,
      () => ({
        cutToFolder,
        quickCut: executeQuickCut,
        markIn: handleMarkIn,
        markOut: handleMarkOut,
        togglePlay,
        stepFrame,
        skipSeconds,
        seekTo: (time: number) => {
          if (videoRef.current) {
            videoRef.current.currentTime = time;
            setCurrentTime(time);
          }
        },
        getCurrentTime: () => (videoRef.current ? videoRef.current.currentTime : 0),
        getDuration: () => duration
      }),
      [
        cutToFolder,
        executeQuickCut,
        handleMarkIn,
        handleMarkOut,
        togglePlay,
        stepFrame,
        skipSeconds,
        duration
      ]
    );

    // GLOBAL KEYBOARD SHORTCUTS
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        if (
          target &&
          (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
        ) {
          return;
        }

        const key = e.key;
        const code = e.code;

        if (code === 'Space' || key === ' ') {
          e.preventDefault();
          togglePlay();
          return;
        }

        if (key === 'c' || key === 'C') {
          e.preventDefault();
          cutToFolder('folder_colocacion', 'C');
          return;
        }

        if (key === '4') {
          e.preventDefault();
          cutToFolder('folder_ataque_z4', '4');
          return;
        }

        if (key === '3') {
          e.preventDefault();
          cutToFolder('folder_ataque_z3', '3');
          return;
        }

        if (key === '2') {
          e.preventDefault();
          cutToFolder('folder_ataque_z2', '2');
          return;
        }

        if (key === 'r' || key === 'R') {
          e.preventDefault();
          cutToFolder('folder_recepcion', 'R');
          return;
        }

        if (key === 'd' || key === 'D') {
          e.preventDefault();
          cutToFolder('folder_defensa', 'D');
          return;
        }

        if (key === 'i' || key === 'I') {
          e.preventDefault();
          handleMarkIn();
          return;
        }

        if (key === 'o' || key === 'O') {
          e.preventDefault();
          handleMarkOut();
          return;
        }

        if (key === 'ArrowLeft' || code === 'ArrowLeft') {
          e.preventDefault();
          if (e.shiftKey) {
            stepFrame(-1);
          } else {
            skipSeconds(-5);
          }
          return;
        }

        if (key === 'ArrowRight' || code === 'ArrowRight') {
          e.preventDefault();
          if (e.shiftKey) {
            stepFrame(1);
          } else {
            skipSeconds(5);
          }
          return;
        }

        if (code === 'KeyJ' || key === 'j' || key === 'J') {
          e.preventDefault();
          skipSeconds(-5);
          return;
        }

        if (code === 'KeyL' || key === 'l' || key === 'L') {
          e.preventDefault();
          skipSeconds(5);
          return;
        }

        if (code === 'KeyK' || key === 'k' || key === 'K') {
          e.preventDefault();
          togglePlay();
          return;
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePlay, cutToFolder, handleMarkIn, handleMarkOut, stepFrame, skipSeconds]);

    // Local file upload
    const handleLocalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const blobUrl = URL.createObjectURL(file);
        (window as any).__lastUploadedServerVideoPath = undefined;
        (window as any).__lastUploadedFile = file;
        (window as any).__lastUploadedBlobUrl = blobUrl;
        onVideoSourceChange(blobUrl, file.name.replace(/\.[^/.]+$/, ''));
        if (file.size <= 24 * 1024 * 1024) {
          uploadSourceVideoToServer(file).catch(console.warn);
        }
      }
    };

    // Drag and drop video upload
    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file && (file.type.startsWith('video/') || file.name.match(/\.(mp4|mov|webm|mkv|avi)$/i))) {
        const blobUrl = URL.createObjectURL(file);
        (window as any).__lastUploadedServerVideoPath = undefined;
        (window as any).__lastUploadedFile = file;
        (window as any).__lastUploadedBlobUrl = blobUrl;
        onVideoSourceChange(blobUrl, file.name.replace(/\.[^/.]+$/, ''));
        if (file.size <= 24 * 1024 * 1024) {
          uploadSourceVideoToServer(file).catch(console.warn);
        }
      }
    };

    const toggleFullscreen = () => {
      if (!containerRef.current) return;
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
      } else {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    };

    const hasInOutSelection = markIn !== null && markOut !== null && markOut > markIn;

    return (
      <div className="h-full flex flex-col bg-[#1E293B] border border-[#334155] rounded-xl shadow-xl select-none overflow-hidden">
        {/* Player Header Strip */}
        <div className="px-4 py-2.5 bg-[#0F172A]/80 border-b border-[#334155] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Film className="w-4 h-4 text-[#3B82F6] shrink-0" />
            <span className="font-semibold text-slate-100 truncate max-w-[220px] sm:max-w-md">
              {videoTitle || 'Sin partido cargado'}
            </span>
            {videoUrl && (
              <>
                <span className="text-slate-600 hidden sm:inline" aria-hidden="true">
                  ·
                </span>
                <span className="hidden sm:inline text-[11px] text-slate-400 font-mono tabular-time whitespace-nowrap">
                  Ventana auto: -{preRollSec}s / +{postRollSec}s
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <input
              type="file"
              ref={fileInputRef}
              accept="video/*"
              onChange={handleLocalFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-[#3B82F6] hover:bg-blue-500 text-white rounded-lg flex items-center gap-1.5 transition-colors font-semibold text-xs cursor-pointer whitespace-nowrap shrink-0"
              title="Cargar vídeo local (MP4, MOV, WebM)"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{videoUrl ? 'Cambiar Vídeo' : 'Subir Vídeo'}</span>
            </button>

            <button
              onClick={() => setShowUrlInput(!showUrlInput)}
              className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors font-medium text-xs cursor-pointer whitespace-nowrap shrink-0 ${
                showUrlInput
                  ? 'bg-slate-700 text-white border-slate-500'
                  : 'bg-[#1E293B] hover:bg-slate-700 text-slate-300 border-[#334155]'
              }`}
              title="Cargar vídeo mediante URL directa"
            >
              <LinkIcon className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span>URL</span>
            </button>
          </div>
        </div>

        {/* URL Input Drawer */}
        {showUrlInput && (
          <div className="px-4 py-2.5 bg-[#0F172A] border-b border-[#334155] flex items-center gap-2 text-xs shrink-0">
            <input
              type="text"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="Pega la URL directa del vídeo MP4..."
              className="flex-1 bg-[#1E293B] border border-[#334155] rounded-lg px-3 py-1.5 text-slate-100 font-mono placeholder-slate-500 text-xs focus:outline-none focus:border-[#3B82F6]"
            />
            <button
              onClick={() => {
                if (customUrl.trim()) {
                  (window as any).__lastUploadedServerVideoPath = undefined;
                  (window as any).__lastUploadedFile = undefined;
                  (window as any).__lastUploadedBlobUrl = undefined;
                  onVideoSourceChange(customUrl.trim(), 'Partido Voleibol (URL)');
                  setShowUrlInput(false);
                }
              }}
              className="px-3.5 py-1.5 bg-[#3B82F6] hover:bg-blue-500 text-white font-semibold rounded-lg cursor-pointer whitespace-nowrap"
            >
              Cargar
            </button>
            <button
              onClick={() => setShowUrlInput(false)}
              className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
              aria-label="Cerrar barra de URL"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* MAIN VIDEO VIEWPORT */}
        <div
          ref={containerRef}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={handleDrop}
          className={`relative flex-1 bg-[#020617] flex items-center justify-center overflow-hidden min-h-[260px] sm:min-h-[340px] transition-all ${
            isFlashing ? 'ring-2 ring-inset ring-[#F97316]' : ''
          } ${isDraggingOver ? 'ring-2 ring-inset ring-[#3B82F6] bg-slate-900' : ''}`}
        >
          {!videoUrl ? (
            /* Friendly 3-Step Visual Empty State */
            <div className="w-full h-full flex flex-col items-center justify-center p-6 sm:p-8 text-center overflow-y-auto">
              <div className="max-w-xl w-full space-y-6">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-2xl bg-[#1E293B] border border-[#334155] flex items-center justify-center mb-4 text-[#3B82F6] shadow-lg">
                    <Upload className="w-7 h-7" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    Carga tu partido en VoleyClip
                  </h2>
                  <p className="text-sm text-slate-400 mt-1.5 max-w-md leading-relaxed">
                    Arrastra tu grabación aquí o selecciona un archivo MP4, MOV o WebM para recortar jugadas al instante.
                  </p>
                </div>

                {/* 3-Step Visual Workflow */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                  <div className="p-3.5 bg-[#1E293B]/90 border border-[#334155] rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2 text-[#3B82F6] font-semibold text-xs">
                      <Upload className="w-4 h-4 shrink-0" />
                      <span>1. Sube el partido</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Procesamiento local rápido sin límites de tamaño para partidos completos.
                    </p>
                  </div>

                  <div className="p-3.5 bg-[#1E293B]/90 border border-[#334155] rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2 text-[#F97316] font-semibold text-xs">
                      <Scissors className="w-4 h-4 shrink-0" />
                      <span>2. Marca IN / OUT</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Usa los botones [ IN / OUT ] o teclas rápidas (C, 4, 3, 2, D, R).
                    </p>
                  </div>

                  <div className="p-3.5 bg-[#1E293B]/90 border border-[#334155] rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2 text-[#10B981] font-semibold text-xs">
                      <Film className="w-4 h-4 shrink-0" />
                      <span>3. Exporta en MP4</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Une los clips seleccionados en un vídeo fluido a 30 FPS constantes.
                    </p>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-3 bg-[#3B82F6] hover:bg-blue-500 text-white font-semibold text-sm rounded-xl inline-flex items-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer transition-all active:scale-[0.98]"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Seleccionar Vídeo del Partido</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                src={videoUrl}
                playsInline
                crossOrigin="anonymous"
                className="w-full h-full object-contain cursor-pointer"
                onClick={togglePlay}
                onTimeUpdate={() => {
                  if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                }}
                onLoadedMetadata={() => {
                  if (videoRef.current) setDuration(videoRef.current.duration || 0);
                  updateVideoBox();
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />

              {/* ON-SCREEN CUT CONFIRMATION TOAST */}
              {cutFeedback && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-[#0F172A]/95 border border-[#10B981] text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-3 text-xs backdrop-blur-md">
                  <span className="text-lg shrink-0">{cutFeedback.icon}</span>
                  <div className="text-left">
                    <div className="text-[#10B981] font-semibold flex items-center gap-2">
                      <span>Clip guardado en {cutFeedback.folderName}</span>
                      <span className="px-1.5 py-0.5 bg-[#1E293B] border border-[#334155] text-slate-200 font-mono text-[10px] rounded">
                        {cutFeedback.key}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300 font-mono tabular-time">
                      {formatTimecodeShort(cutFeedback.start)} → {formatTimecodeShort(cutFeedback.end)}
                    </div>
                  </div>
                </div>
              )}

              {/* Saved/Active Clip Annotation Status Chip (when paused & drawings exist) */}
              {!isTelestrationOpen && currentShapes.length > 0 && !isPlaying && (
                <div className="absolute top-3 left-3 z-30 bg-[#0F172A]/90 border border-[#334155] rounded-lg px-3 py-1.5 flex items-center gap-2.5 text-xs backdrop-blur-xs shadow-lg">
                  <PenTool className="w-3.5 h-3.5 text-[#F97316]" />
                  <span className="text-slate-200 font-medium truncate max-w-[180px]">
                    {activeClip ? activeClip.title : 'Anotación temporal'}
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    {currentShapes.length} {currentShapes.length === 1 ? 'trazo' : 'trazos'}
                  </span>
                  <button
                    onClick={() => setIsTelestrationOpen(true)}
                    className="text-[#3B82F6] hover:text-blue-400 font-semibold cursor-pointer"
                  >
                    Editar
                  </button>
                </div>
              )}

              {/* Pixel-Aligned Tactical Drawing Canvas Overlay (Editable when Pizarra is open, Read-Only when paused with saved shapes) */}
              {(isTelestrationOpen ||
                (currentShapes.length > 0 &&
                  (!isPlaying ||
                    (activeClip &&
                      currentTime >= activeClip.startTime - 0.5 &&
                      currentTime <= activeClip.endTime + 0.5)))) && (
                <div
                  style={{
                    left: `${videoBox.left}px`,
                    top: `${videoBox.top}px`,
                    width: `${videoBox.width}px`,
                    height: `${videoBox.height}px`
                  }}
                  className={`absolute z-20 ${
                    isTelestrationOpen ? 'pointer-events-auto' : 'pointer-events-none'
                  }`}
                >
                  <TelestrationCanvas
                    width={videoBox.width}
                    height={videoBox.height}
                    shapes={currentShapes}
                    activeTool={activeTool}
                    activeColor={activeColor}
                    activeWidth={activeWidth}
                    isDrawingEnabled={isTelestrationOpen}
                    onShapesChange={setCurrentShapes}
                    onClear={() => setCurrentShapes([])}
                  />
                </div>
              )}

              {/* Center Play Button when Paused */}
              {!isPlaying && !isTelestrationOpen && (
                <button
                  onClick={togglePlay}
                  aria-label="Reproducir vídeo"
                  className="absolute w-16 h-16 rounded-full bg-[#0F172A]/75 hover:bg-[#3B82F6] text-white flex items-center justify-center transition-all transform hover:scale-105 border border-white/20 backdrop-blur-xs shadow-2xl cursor-pointer z-30"
                >
                  <Play className="w-7 h-7 fill-current ml-0.5" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Tactical Telestration Drawing Toolbar */}
        {isTelestrationOpen && (
          <div className="px-4 py-2.5 bg-[#0F172A] border-t border-[#334155] flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0">
            {/* Drawing Tools */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'ball_trajectory', label: 'Trayectoria Balón', icon: Spline },
                { id: 'arrow_solid', label: 'Movimiento', icon: MoveUpRight },
                { id: 'player_pin', label: 'Jugador (1,2..)', icon: UserCheck },
                { id: 'circle', label: 'Zona', icon: Circle },
                { id: 'text', label: 'Texto', icon: Type }
              ].map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTool(t.id as TelestrationTool)}
                    className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                      activeTool === t.id
                        ? 'bg-[#3B82F6] text-white border-[#3B82F6]'
                        : 'bg-[#1E293B] text-slate-300 border-[#334155] hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Colors, Stroke Width, Undo & Save Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-[#1E293B] border border-[#334155] rounded-lg px-2 py-1">
                {['#F97316', '#3B82F6', '#10B981', '#EF4444', '#FACC15', '#FFFFFF'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setActiveColor(c)}
                    style={{ backgroundColor: c }}
                    aria-label={`Color ${c}`}
                    className={`w-4 h-4 rounded-full border cursor-pointer ${
                      activeColor === c ? 'ring-2 ring-white scale-110' : 'border-[#334155]'
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center bg-[#1E293B] border border-[#334155] rounded-lg p-0.5">
                {[
                  { w: 3, label: 'Fino' },
                  { w: 5, label: 'Grueso' }
                ].map((s) => (
                  <button
                    key={s.w}
                    onClick={() => setActiveWidth(s.w)}
                    className={`px-2 py-1 text-[10px] font-medium rounded-md cursor-pointer ${
                      activeWidth === s.w
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleUndoLastShape}
                disabled={currentShapes.length === 0}
                className="px-2.5 py-1.5 text-[11px] bg-[#1E293B] hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-[#334155] rounded-lg flex items-center gap-1 cursor-pointer"
                title="Deshacer último trazo"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Deshacer</span>
              </button>

              <button
                onClick={() => setCurrentShapes([])}
                disabled={currentShapes.length === 0}
                className="px-2.5 py-1.5 text-[11px] bg-[#1E293B] hover:bg-slate-700 disabled:opacity-40 text-slate-300 border border-[#334155] rounded-lg flex items-center gap-1 cursor-pointer"
                title="Borrar todo el dibujo"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Limpiar</span>
              </button>

              {activeClip && onSaveClipTelestrations ? (
                <button
                  onClick={handleSaveDrawingToActiveClip}
                  className="px-3 py-1.5 text-[11px] bg-[#10B981] hover:bg-emerald-400 text-[#0F172A] font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                  title={`Guardar anotaciones en "${activeClip.title}"`}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar en Jugada</span>
                </button>
              ) : (
                <button
                  onClick={executeQuickCut}
                  className="px-3 py-1.5 text-[11px] bg-[#F97316] hover:bg-orange-500 text-white font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                  title="Crear nuevo clip con estas anotaciones"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Guardar como Clip</span>
                </button>
              )}

              <button
                onClick={() => setIsTelestrationOpen(false)}
                className="px-2.5 py-1.5 text-[11px] bg-[#1E293B] hover:bg-slate-700 text-slate-300 border border-[#334155] rounded-lg cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* Timeline Scrubber Track */}
        <div className="px-4 pt-3 pb-1.5 bg-[#0F172A]/95 border-t border-[#334155] shrink-0">
          <div className="relative w-full h-5 flex items-center group/timeline cursor-pointer">
            <div
              className="w-full h-2 bg-[#1E293B] rounded-full relative overflow-hidden border border-[#334155]"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                if (videoRef.current && duration > 0) {
                  videoRef.current.currentTime = pos * duration;
                }
              }}
            >
              <div
                className="h-full bg-[#3B82F6]"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />

              {hasInOutSelection && duration > 0 && (
                <div
                  className="absolute top-0 bottom-0 bg-[#F97316]/40 border-l-2 border-r-2 border-[#F97316]"
                  style={{
                    left: `${(markIn! / duration) * 100}%`,
                    width: `${Math.max(1, ((markOut! - markIn!) / duration) * 100)}%`
                  }}
                />
              )}
            </div>

            {/* Scrubber thumb */}
            <div
              className="w-3.5 h-3.5 bg-white rounded-full absolute -ml-1.5 shadow-md pointer-events-none group-hover/timeline:scale-125 transition-transform ring-2 ring-[#3B82F6]"
              style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />

            {/* In Pin */}
            {markIn !== null && duration > 0 && (
              <div
                className="absolute -top-1 w-3 h-4 bg-[#10B981] rounded-xs shadow font-mono text-[9px] text-[#0F172A] font-bold flex items-center justify-center pointer-events-none"
                style={{ left: `${(markIn / duration) * 100}%` }}
              >
                I
              </div>
            )}

            {/* Out Pin */}
            {markOut !== null && duration > 0 && (
              <div
                className="absolute -top-1 w-3 h-4 bg-[#F97316] rounded-xs shadow font-mono text-[9px] text-white font-bold flex items-center justify-center pointer-events-none"
                style={{ left: `${(markOut / duration) * 100}%` }}
              >
                O
              </div>
            )}
          </div>
        </div>

        {/* Studio Transport & Prominent [ IN / OUT ] Deck */}
        <div className="px-4 py-2.5 bg-[#0F172A]/95 border-t border-[#334155]/70 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          {/* Left: Playback Transport + Monospace Timecode */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={togglePlay}
              disabled={!videoUrl}
              className="w-9 h-9 bg-[#3B82F6] hover:bg-blue-500 disabled:bg-[#1E293B] disabled:text-slate-500 text-white rounded-lg flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Reproducir / Pausar (Espacio)"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            <button
              onClick={() => skipSeconds(-5)}
              disabled={!videoUrl}
              className="h-9 px-2.5 bg-[#1E293B] hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-[#334155] rounded-lg flex items-center gap-1 font-mono text-xs cursor-pointer transition-colors"
              title="Retroceder 5s (Flecha Izquierda)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>-5s</span>
            </button>

            <button
              onClick={() => stepFrame(-1)}
              disabled={!videoUrl}
              className="h-9 px-2 bg-[#1E293B] hover:bg-slate-700 disabled:opacity-40 text-slate-300 border border-[#334155] rounded-lg hidden sm:flex items-center gap-0.5 font-mono text-[11px] cursor-pointer transition-colors"
              title="Retroceder 1 fotograma (Shift + ←)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>1f</span>
            </button>

            <button
              onClick={() => stepFrame(1)}
              disabled={!videoUrl}
              className="h-9 px-2 bg-[#1E293B] hover:bg-slate-700 disabled:opacity-40 text-slate-300 border border-[#334155] rounded-lg hidden sm:flex items-center gap-0.5 font-mono text-[11px] cursor-pointer transition-colors"
              title="Avanzar 1 fotograma (Shift + →)"
            >
              <span>1f</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => skipSeconds(5)}
              disabled={!videoUrl}
              className="h-9 px-2.5 bg-[#1E293B] hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-[#334155] rounded-lg flex items-center gap-1 font-mono text-xs cursor-pointer transition-colors"
              title="Avanzar 5s (Flecha Derecha)"
            >
              <span>+5s</span>
              <RotateCw className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <div className="font-mono tabular-time text-xs bg-[#1E293B] border border-[#334155] rounded-lg px-3 h-9 flex items-center gap-1.5 ml-1">
              <span className="text-white font-semibold">{formatTimecodeHMS(currentTime)}</span>
              <span className="text-slate-500">/</span>
              <span className="text-slate-400">{formatTimecodeHMS(duration)}</span>
            </div>
          </div>

          {/* Center: Prominent [ IN / OUT ] + Cut Action */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleMarkIn}
              disabled={!videoUrl}
              className={`h-9 px-3.5 rounded-lg font-mono text-xs font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40 whitespace-nowrap ${
                markIn !== null
                  ? 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]'
                  : 'bg-[#1E293B] hover:bg-slate-700 text-slate-200 border-[#334155]'
              }`}
              title="Marcar punto de entrada [Tecla I]"
            >
              <ArrowRightToLine className="w-3.5 h-3.5" />
              <span>[ IN</span>
              {markIn !== null && (
                <span className="text-[11px] opacity-90">{formatTimecodeShort(markIn)}</span>
              )}
            </button>

            <button
              onClick={handleMarkOut}
              disabled={!videoUrl}
              className={`h-9 px-3.5 rounded-lg font-mono text-xs font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40 whitespace-nowrap ${
                markOut !== null
                  ? 'bg-[#F97316]/20 text-[#F97316] border-[#F97316]'
                  : 'bg-[#1E293B] hover:bg-slate-700 text-slate-200 border-[#334155]'
              }`}
              title="Marcar punto de salida [Tecla O]"
            >
              <span>OUT ]</span>
              <ArrowLeftToLine className="w-3.5 h-3.5" />
              {markOut !== null && (
                <span className="text-[11px] opacity-90">{formatTimecodeShort(markOut)}</span>
              )}
            </button>

            {(markIn !== null || markOut !== null) && (
              <button
                onClick={() => {
                  setMarkIn(null);
                  setMarkOut(null);
                }}
                className="h-9 px-2 text-slate-400 hover:text-white bg-[#1E293B] border border-[#334155] rounded-lg cursor-pointer"
                title="Limpiar marcas IN / OUT"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={executeQuickCut}
              disabled={!videoUrl}
              className="h-9 px-4 bg-[#F97316] hover:bg-orange-500 disabled:bg-[#1E293B] disabled:text-slate-500 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-sm"
              title={`Añadir clip a ${activeFolder.name}`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Añadir Clip</span>
            </button>
          </div>

          {/* Right: Speed, Blackboard, Fullscreen */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#1E293B] border border-[#334155] rounded-lg p-0.5">
              {[0.5, 0.75, 1, 1.5].map((rate) => (
                <button
                  key={rate}
                  onClick={() => {
                    setPlaybackRate(rate);
                    if (videoRef.current) videoRef.current.playbackRate = rate;
                  }}
                  className={`px-2 py-1 text-[11px] font-mono font-semibold rounded-md transition-colors cursor-pointer ${
                    playbackRate === rate
                      ? 'bg-[#3B82F6] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                if (isPlaying) togglePlay();
                setIsTelestrationOpen(!isTelestrationOpen);
              }}
              disabled={!videoUrl}
              className={`h-9 px-3 rounded-lg border flex items-center gap-1.5 font-medium text-xs transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap ${
                isTelestrationOpen
                  ? 'bg-[#F97316] text-white border-[#F97316]'
                  : 'bg-[#1E293B] text-slate-300 border-[#334155] hover:text-white'
              }`}
              title="Dibujar sobre fotograma pausado"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pizarra</span>
            </button>

            <button
              onClick={toggleFullscreen}
              disabled={!videoUrl}
              className="h-9 w-9 bg-[#1E293B] border border-[#334155] rounded-lg flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
              title="Pantalla completa"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Visible Keyboard Shortcuts Bar */}
        <div className="px-4 py-2 bg-[#0F172A] border-t border-[#334155]/60 flex items-center justify-between gap-4 text-[11px] overflow-x-auto shrink-0">
          <div className="flex items-center gap-3 whitespace-nowrap">
            <span className="text-slate-400 font-medium">Atajos rápidos:</span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <kbd className="px-1.5 py-0.5 bg-[#1E293B] border border-[#334155] text-slate-100 font-mono text-[10px] rounded">
                Espacio
              </kbd>
              <span>Pausa</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <kbd className="px-1.5 py-0.5 bg-[#1E293B] border border-[#334155] text-[#10B981] font-mono text-[10px] rounded">
                I
              </kbd>
              <span>Entrada</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <kbd className="px-1.5 py-0.5 bg-[#1E293B] border border-[#334155] text-[#F97316] font-mono text-[10px] rounded">
                O
              </kbd>
              <span>Salida</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <kbd className="px-1.5 py-0.5 bg-[#1E293B] border border-[#334155] text-slate-100 font-mono text-[10px] rounded">
                ← / →
              </kbd>
              <span>±5s</span>
            </span>
          </div>

          <div className="hidden xl:flex items-center gap-2.5 font-mono text-[10px] text-slate-400 whitespace-nowrap">
            <span>Corte directo:</span>
            {folders.slice(0, 6).map((f) => (
              <span key={f.id} className="flex items-center gap-1 text-slate-300">
                <kbd className="px-1.5 py-0.5 bg-[#1E293B] border border-[#334155] text-[#3B82F6] font-bold rounded">
                  {f.shortcutKey || '·'}
                </kbd>
                <span>{f.name}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }
);

ManualVideoPlayer.displayName = 'ManualVideoPlayer';
