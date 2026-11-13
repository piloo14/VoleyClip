import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Edit3,
  BookmarkPlus,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';
import {
  ClubCrest,
  LowerThirdConfig,
  MatchPeriod,
  PossessionInterval,
  TelestrationFrame,
  TelestrationShape,
  TelestrationTool
} from '../../types/tactical';
import { TelestrationCanvas } from '../canvas/TelestrationCanvas';

interface TacticalVideoPlayerProps {
  videoUrl: string;
  videoTitle: string;
  crest: ClubCrest;
  periods: MatchPeriod[];
  possessions: PossessionInterval[];
  homeColor: string;
  awayColor: string;
  markIn: number | null;
  markOut: number | null;
  telestrationFrames: TelestrationFrame[];
  currentClipLowerThird?: LowerThirdConfig;
  onSetMarkIn: (time: number) => void;
  onSetMarkOut: (time: number) => void;
  onCreateClipFromMarks: () => void;
  onSaveTelestrationAtCurrentTime: (shapes: TelestrationShape[], note?: string) => void;
  selectedPeriodId?: string;
  externalSeekTime?: number | null;
  onCurrentTimeChange?: (time: number) => void;
}

export const TacticalVideoPlayer: React.FC<TacticalVideoPlayerProps> = ({
  videoUrl,
  videoTitle,
  crest,
  periods,
  possessions,
  homeColor,
  awayColor,
  markIn,
  markOut,
  telestrationFrames,
  currentClipLowerThird,
  onSetMarkIn,
  onSetMarkOut,
  onCreateClipFromMarks,
  onSaveTelestrationAtCurrentTime,
  externalSeekTime,
  onCurrentTimeChange
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<1 | 1.5 | 2>(1);

  // Telestration State
  const [isTelestrationOpen, setIsTelestrationOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<TelestrationTool>('arrow_solid');
  const [activeColor, setActiveColor] = useState('#FACC15'); // Neon tactical yellow
  const [activeWidth, setActiveWidth] = useState(4);
  const [currentShapes, setCurrentShapes] = useState<TelestrationShape[]>([]);
  const [activeTelestrationNote, setActiveTelestrationNote] = useState('');
  const [pausedByTelestration, setPausedByTelestration] = useState(false);
  const lastTriggeredFrameId = useRef<string | null>(null);

  // Video Dimensions for Canvas mapping
  const [videoDims, setVideoDims] = useState({ width: 854, height: 480 });

  // Update canvas size whenever container resizes
  useEffect(() => {
    const updateDims = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setVideoDims({ width: clientWidth, height: clientHeight });
      }
    };
    updateDims();
    window.addEventListener('resize', updateDims);
    return () => window.removeEventListener('resize', updateDims);
  }, []);

  // Handle external seek request
  useEffect(() => {
    if (externalSeekTime !== null && externalSeekTime !== undefined && videoRef.current) {
      videoRef.current.currentTime = externalSeekTime;
      setCurrentTime(externalSeekTime);
      checkActiveTelestration(externalSeekTime);
    }
  }, [externalSeekTime]);

  const checkActiveTelestration = useCallback(
    (time: number) => {
      // Find if there is a telestration frame within 0.25s
      const matchingFrame = telestrationFrames.find(
        (f) => Math.abs(f.timestamp - time) <= 0.25
      );

      if (matchingFrame) {
        setCurrentShapes(matchingFrame.shapes);
        setActiveTelestrationNote(matchingFrame.note || '');
        return matchingFrame;
      } else if (!isTelestrationOpen) {
        setCurrentShapes([]);
        setActiveTelestrationNote('');
        return null;
      }
      return null;
    },
    [telestrationFrames, isTelestrationOpen]
  );

  // Video timeupdate handler
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    onCurrentTimeChange?.(time);

    // Auto-pause detection when playing:
    // If we hit a programmed telestration frame, auto-pause so coach or player sees it!
    if (isPlaying) {
      const match = telestrationFrames.find(
        (f) => Math.abs(f.timestamp - time) <= 0.18
      );

      if (match && lastTriggeredFrameId.current !== match.id) {
        lastTriggeredFrameId.current = match.id;
        videoRef.current.pause();
        setIsPlaying(false);
        setPausedByTelestration(true);
        setCurrentShapes(match.shapes);
        setActiveTelestrationNote(match.note || '');
      } else if (!match) {
        // Reset triggered ID if we've moved past
        lastTriggeredFrameId.current = null;
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      setPausedByTelestration(false);
      videoRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const stepFrame = (frames: number) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    // 25 fps standard -> ~0.04s per frame
    const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + frames * 0.04));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    checkActiveTelestration(newTime);
  };

  const skipSeconds = (seconds: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    checkActiveTelestration(newTime);
  };

  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      checkActiveTelestration(newTime);
    }
  };

  const changeSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
    }
  };

  const handleSaveTelestration = () => {
    if (currentShapes.length === 0) return;
    onSaveTelestrationAtCurrentTime(currentShapes, activeTelestrationNote);
    setIsTelestrationOpen(false);
  };

  const handleClearTelestration = () => {
    setCurrentShapes([]);
  };

  const formatTimecode = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const millis = Math.floor((sec % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis
      .toString()
      .padStart(2, '0')}`;
  };

  // Determine Crest positioning style
  const getCrestStyle = () => {
    const pos = crest.position;
    const size = crest.size;
    const style: React.CSSProperties = {
      position: 'absolute',
      width: `${size}px`,
      height: `${size}px`,
      opacity: crest.opacity,
      zIndex: 25,
      pointerEvents: 'none'
    };

    if (pos === 'top-left') {
      style.top = '16px';
      style.left = '16px';
    } else if (pos === 'top-right') {
      style.top = '16px';
      style.right = '16px';
    } else if (pos === 'bottom-left') {
      style.bottom = '80px';
      style.left = '16px';
    } else {
      style.bottom = '80px';
      style.right = '16px';
    }
    return style;
  };

  // Keyboard shortcuts (Space, Left/Right arrow, I/O for mark in/out)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        stepFrame(e.shiftKey ? -25 : -1);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        stepFrame(e.shiftKey ? 25 : 1);
      } else if (e.key === 'i' || e.key === 'I') {
        onSetMarkIn(currentTime);
      } else if (e.key === 'o' || e.key === 'O') {
        onSetMarkOut(currentTime);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTime, duration, onSetMarkIn, onSetMarkOut]);

  // Lower-third visibility calculation
  const showLowerThird =
    currentClipLowerThird?.show &&
    (currentClipLowerThird.displayMode === 'always' || currentTime <= 4);

  return (
    <div className="flex flex-col bg-neutral-950 border border-neutral-800 overflow-hidden shadow-2xl">
      {/* Main Viewport */}
      <div
        ref={containerRef}
        className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden select-none"
      >
        {/* Video Element */}
        <video
          ref={videoRef}
          src={videoUrl}
          playsInline
          className={`w-full h-full object-contain transition-transform duration-150 ${
            zoomLevel === 1.5 ? 'scale-150 cursor-grab' : zoomLevel === 2 ? 'scale-200 cursor-grab' : 'scale-100'
          }`}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          onClick={togglePlay}
        />

        {/* Club Crest Overlay ("Tu Escudo") */}
        {crest && crest.url && (
          <img
            src={crest.url}
            alt={crest.name}
            style={getCrestStyle()}
            className="drop-shadow-md select-none"
            referrerPolicy="no-referrer"
          />
        )}

        {/* Lower-Third Broadcast Banner */}
        {showLowerThird && currentClipLowerThird && (
          <div className="absolute bottom-16 left-6 z-25 max-w-lg bg-neutral-950/90 border border-amber-500/40 p-3 shadow-2xl backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="text-[10px] tracking-wider font-bold text-amber-400 uppercase">
              {currentClipLowerThird.category || 'ANÁLISIS TÁCTICO'}
            </div>
            <div className="text-sm font-bold text-white leading-tight">
              {currentClipLowerThird.title}
            </div>
            {currentClipLowerThird.coachNote && (
              <div className="text-xs text-neutral-300 mt-0.5">
                {currentClipLowerThird.coachNote}
              </div>
            )}
            {currentClipLowerThird.players && (
              <div className="text-[11px] text-neutral-400 mt-1">
                Jugadores: {currentClipLowerThird.players}
              </div>
            )}
          </div>
        )}

        {/* Auto-Pause Tactical Telestration Notification */}
        {pausedByTelestration && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-amber-500 text-neutral-950 px-4 py-1.5 font-bold text-xs shadow-2xl flex items-center gap-3 animate-bounce">
            <span>⏸️ Pizarra táctica activada en este segundo</span>
            {activeTelestrationNote && <span className="font-normal italic">"{activeTelestrationNote}"</span>}
            <button
              onClick={togglePlay}
              className="bg-neutral-950 text-white px-2.5 py-0.5 text-xs hover:bg-neutral-800 transition-colors"
            >
              Reanudar ▶
            </button>
          </div>
        )}

        {/* Telestration Vector Canvas Overlay */}
        <TelestrationCanvas
          width={videoDims.width}
          height={videoDims.height}
          shapes={currentShapes}
          activeTool={activeTool}
          activeColor={activeColor}
          activeWidth={activeWidth}
          isDrawingEnabled={isTelestrationOpen}
          onShapesChange={setCurrentShapes}
        />

        {/* Active Telestration Floating Controls when Drawing Mode is active */}
        {isTelestrationOpen && (
          <div className="absolute top-4 left-4 z-30 bg-neutral-900/95 border border-neutral-700 p-2 shadow-2xl flex flex-wrap items-center gap-2 backdrop-blur-md">
            {/* Tools */}
            <div className="flex items-center gap-1 border-r border-neutral-700 pr-2">
              <button
                onClick={() => setActiveTool('arrow_solid')}
                className={`p-1.5 text-xs font-semibold ${
                  activeTool === 'arrow_solid'
                    ? 'bg-amber-500 text-neutral-950'
                    : 'text-neutral-300 hover:bg-neutral-800'
                }`}
                title="Flecha continua de movimiento"
              >
                Flecha ➔
              </button>
              <button
                onClick={() => setActiveTool('arrow_dashed')}
                className={`p-1.5 text-xs font-semibold ${
                  activeTool === 'arrow_dashed'
                    ? 'bg-amber-500 text-neutral-950'
                    : 'text-neutral-300 hover:bg-neutral-800'
                }`}
                title="Flecha discontinua de pase"
              >
                Pase ⇢
              </button>
              <button
                onClick={() => setActiveTool('circle')}
                className={`p-1.5 text-xs font-semibold ${
                  activeTool === 'circle'
                    ? 'bg-amber-500 text-neutral-950'
                    : 'text-neutral-300 hover:bg-neutral-800'
                }`}
                title="Círculo de jugador"
              >
                Círculo ⭕
              </button>
              <button
                onClick={() => setActiveTool('spotlight')}
                className={`p-1.5 text-xs font-semibold ${
                  activeTool === 'spotlight'
                    ? 'bg-amber-500 text-neutral-950'
                    : 'text-neutral-300 hover:bg-neutral-800'
                }`}
                title="Foco de atención (Spotlight táctico)"
              >
                Foco 🔦
              </button>
              <button
                onClick={() => setActiveTool('rect')}
                className={`p-1.5 text-xs font-semibold ${
                  activeTool === 'rect'
                    ? 'bg-amber-500 text-neutral-950'
                    : 'text-neutral-300 hover:bg-neutral-800'
                }`}
                title="Zona / Rectángulo táctico"
              >
                Zona ▭
              </button>
              <button
                onClick={() => setActiveTool('freehand')}
                className={`p-1.5 text-xs font-semibold ${
                  activeTool === 'freehand'
                    ? 'bg-amber-500 text-neutral-950'
                    : 'text-neutral-300 hover:bg-neutral-800'
                }`}
                title="Lápiz libre"
              >
                Lápiz ✏️
              </button>
              <button
                onClick={() => setActiveTool('text')}
                className={`p-1.5 text-xs font-semibold ${
                  activeTool === 'text'
                    ? 'bg-amber-500 text-neutral-950'
                    : 'text-neutral-300 hover:bg-neutral-800'
                }`}
                title="Texto táctico"
              >
                Texto 🔤
              </button>
            </div>

            {/* Colors */}
            <div className="flex items-center gap-1 border-r border-neutral-700 pr-2">
              {[
                { hex: '#FACC15', label: 'Amarillo' },
                { hex: '#EF4444', label: 'Rojo' },
                { hex: '#3B82F6', label: 'Azul' },
                { hex: '#22C55E', label: 'Verde' },
                { hex: '#FFFFFF', label: 'Blanco' }
              ].map((c) => (
                <button
                  key={c.hex}
                  onClick={() => setActiveColor(c.hex)}
                  className={`w-5 h-5 border ${
                    activeColor === c.hex ? 'border-white ring-1 ring-white' : 'border-neutral-600'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                />
              ))}
            </div>

            {/* Stroke Width */}
            <div className="flex items-center gap-1 border-r border-neutral-700 pr-2 text-xs text-neutral-400">
              <button
                onClick={() => setActiveWidth(2)}
                className={`px-1.5 py-0.5 ${activeWidth === 2 ? 'bg-neutral-700 text-white' : ''}`}
              >
                Fino
              </button>
              <button
                onClick={() => setActiveWidth(4)}
                className={`px-1.5 py-0.5 ${activeWidth === 4 ? 'bg-neutral-700 text-white' : ''}`}
              >
                Medio
              </button>
              <button
                onClick={() => setActiveWidth(7)}
                className={`px-1.5 py-0.5 ${activeWidth === 7 ? 'bg-neutral-700 text-white' : ''}`}
              >
                Grueso
              </button>
            </div>

            {/* Note attached to this frame */}
            <input
              type="text"
              value={activeTelestrationNote}
              onChange={(e) => setActiveTelestrationNote(e.target.value)}
              placeholder="Nota para este segundo..."
              className="bg-neutral-950 border border-neutral-700 text-xs px-2 py-1 text-white focus:outline-none focus:border-amber-500 w-44"
            />

            {/* Frame actions */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleClearTelestration}
                className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs px-2 py-1"
                title="Limpiar dibujos actuales"
              >
                Borrar
              </button>
              <button
                onClick={handleSaveTelestration}
                className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs px-3 py-1 transition-colors"
                title="Fijar y guardar este fotograma"
              >
                Guardar Fotograma
              </button>
              <button
                onClick={() => setIsTelestrationOpen(false)}
                className="text-neutral-400 hover:text-white text-xs px-1.5 py-1"
                title="Cerrar pizarra"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Scrub Bar & Timeline Momentum Track */}
      <div className="px-4 pt-3 pb-1 bg-neutral-900 border-t border-neutral-800">
        <div className="relative group">
          {/* Timeline Possession Ribbon */}
          <div className="absolute top-1.5 left-0 right-0 h-1.5 bg-neutral-800 rounded-xs pointer-events-none overflow-hidden flex">
            {duration > 0 &&
              possessions.map((p) => {
                const left = (p.startSec / duration) * 100;
                const width = ((p.endSec - p.startSec) / duration) * 100;
                const bg =
                  p.team === 'home' ? homeColor : p.team === 'away' ? awayColor : '#475569';
                return (
                  <div
                    key={p.id}
                    style={{ left: `${left}%`, width: `${width}%`, backgroundColor: bg }}
                    className="h-full absolute opacity-70"
                    title={`Posesión: ${p.team === 'home' ? 'Local' : p.team === 'away' ? 'Rival' : 'Muerto'} (${p.startSec.toFixed(1)}s - ${p.endSec.toFixed(1)}s)`}
                  />
                );
              })}
          </div>

          {/* Mark In / Out Shaded Zone */}
          {markIn !== null && markOut !== null && duration > 0 && (
            <div
              style={{
                left: `${(markIn / duration) * 100}%`,
                width: `${((markOut - markIn) / duration) * 100}%`
              }}
              className="absolute top-0 bottom-0 bg-amber-500/25 border-x-2 border-amber-400 pointer-events-none z-10"
            />
          )}

          {/* Telestration Markers on Timeline */}
          {duration > 0 &&
            telestrationFrames.map((f) => (
              <div
                key={f.id}
                style={{ left: `${(f.timestamp / duration) * 100}%` }}
                className="absolute top-0 w-2 h-3 bg-amber-400 -translate-x-1/2 pointer-events-none z-15"
                title={`Pizarra táctica: ${f.timestamp.toFixed(2)}s`}
              />
            ))}

          {/* Range Scrubber */}
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.01}
            value={currentTime}
            onChange={handleScrubberChange}
            className="w-full relative z-20 accent-amber-500 cursor-pointer h-4 opacity-80 hover:opacity-100"
          />
        </div>

        {/* Timecode and Period indicator */}
        <div className="flex items-center justify-between text-xs text-neutral-400 mt-1 font-mono tabular-nums">
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold">{formatTimecode(currentTime)}</span>
            <span>/</span>
            <span>{formatTimecode(duration)}</span>
          </div>

          {/* Mark in / out indicators */}
          <div className="flex items-center gap-3">
            {markIn !== null && (
              <span className="text-neutral-300">
                In: <span className="text-amber-400 font-semibold">{formatTimecode(markIn)}</span>
              </span>
            )}
            {markOut !== null && (
              <span className="text-neutral-300">
                Out: <span className="text-amber-400 font-semibold">{formatTimecode(markOut)}</span>
              </span>
            )}
            {markIn !== null && markOut !== null && markOut > markIn && (
              <span className="text-amber-400 font-bold bg-neutral-950 px-1.5 py-0.5 border border-amber-500/30">
                Clip: {(markOut - markIn).toFixed(1)}s
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Primary Coach Transport & Tactical Actions Toolbar */}
      <div className="p-3 bg-neutral-900 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Playback controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => stepFrame(-1)}
            className="p-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Cuadro anterior (-0.04s) [Flecha Izquierda]"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => skipSeconds(-1)}
            className="p-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors text-xs font-mono"
            title="Retroceder 1 segundo"
          >
            -1s
          </button>

          <button
            onClick={togglePlay}
            className="w-8 h-8 flex items-center justify-center bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold transition-colors mx-1"
            title={isPlaying ? 'Pausar (Espacio)' : 'Reproducir (Espacio)'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={() => skipSeconds(1)}
            className="p-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors text-xs font-mono"
            title="Avanzar 1 segundo"
          >
            +1s
          </button>
          <button
            onClick={() => stepFrame(1)}
            className="p-1.5 text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Cuadro siguiente (+0.04s) [Flecha Derecha]"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Speed Selector */}
          <div className="flex items-center gap-0.5 ml-2 bg-neutral-950 p-0.5 border border-neutral-800">
            {[0.25, 0.5, 0.75, 1, 1.5].map((rate) => (
              <button
                key={rate}
                onClick={() => changeSpeed(rate)}
                className={`px-1.5 py-0.5 text-[11px] font-mono transition-colors ${
                  playbackRate === rate
                    ? 'bg-amber-500 text-neutral-950 font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>

        {/* Center: In / Out Mark & Clip Builder */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onSetMarkIn(currentTime)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
            title="Punto de inicio del clip (Tecla I)"
          >
            [ In
          </button>
          <button
            onClick={() => onSetMarkOut(currentTime)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
            title="Punto final del clip (Tecla O)"
          >
            Out ]
          </button>
          <button
            onClick={onCreateClipFromMarks}
            disabled={markIn === null || markOut === null || markOut <= markIn}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed text-neutral-950 transition-colors"
            title="Crear clip a partir de los puntos In y Out"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            Crear Jugada
          </button>
        </div>

        {/* Right: Telestration Toggle, Zoom & Fullscreen */}
        <div className="flex items-center gap-2">
          {/* Telestration Pizarra */}
          <button
            onClick={() => {
              if (isPlaying && videoRef.current) {
                videoRef.current.pause();
                setIsPlaying(false);
              }
              setIsTelestrationOpen(!isTelestrationOpen);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold border transition-colors ${
              isTelestrationOpen
                ? 'bg-amber-500 text-neutral-950 border-amber-400'
                : 'bg-neutral-800 text-neutral-200 border-neutral-700 hover:bg-neutral-700'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            {isTelestrationOpen ? 'Cerrar Pizarra' : 'Pizarra Táctica'}
          </button>

          {/* Zoom button */}
          <button
            onClick={() => setZoomLevel(zoomLevel === 1 ? 1.5 : zoomLevel === 1.5 ? 2 : 1)}
            className={`p-1.5 text-xs font-mono border transition-colors ${
              zoomLevel > 1
                ? 'bg-neutral-700 text-amber-400 border-amber-500'
                : 'text-neutral-400 border-neutral-800 hover:text-white'
            }`}
            title="Zoom táctico para análisis de detalle"
          >
            {zoomLevel}x
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-neutral-400 hover:text-white transition-colors"
            title="Pantalla completa"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
