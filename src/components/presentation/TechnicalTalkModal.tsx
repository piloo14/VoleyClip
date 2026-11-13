import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  X,
  Volume2,
  Tv,
  Star,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { ClubCrest, TacticalClip } from '../../types/tactical';
import { TelestrationCanvas } from '../canvas/TelestrationCanvas';

interface TechnicalTalkModalProps {
  isOpen: boolean;
  onClose: () => void;
  clips: TacticalClip[]; // Only favorite clips ("Mi Selección")
  videoUrl: string;
  crest: ClubCrest;
}

export const TechnicalTalkModal: React.FC<TechnicalTalkModalProps> = ({
  isOpen,
  onClose,
  clips,
  videoUrl,
  crest
}) => {
  if (!isOpen || clips.length === 0) return null;

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentClip = clips[currentIndex];

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentShapes, setCurrentShapes] = useState<any[]>([]);
  const [activeFrameNote, setActiveFrameNote] = useState('');
  const [pausedAtFrame, setPausedAtFrame] = useState(false);
  const [videoDims, setVideoDims] = useState({ width: 1280, height: 720 });

  // Update dims
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setVideoDims({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [isOpen]);

  // When changing clip, cue video to clip.startTime and reset
  useEffect(() => {
    if (videoRef.current && currentClip) {
      videoRef.current.currentTime = currentClip.startTime;
      setCurrentTime(currentClip.startTime);
      setPausedAtFrame(false);
      setCurrentShapes([]);
      setActiveFrameNote('');

      // Auto-start play
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          // Play voice note if exists
          if (currentClip.voiceNoteUrl && audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(console.error);
          }
        })
        .catch(console.error);
    }
  }, [currentIndex, currentClip]);

  const handleTimeUpdate = () => {
    if (!videoRef.current || !currentClip) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    // Check if clip reaches end
    if (time >= currentClip.endTime) {
      videoRef.current.pause();
      setIsPlaying(false);
      // Next clip after 1.5s delay if available
      if (currentIndex < clips.length - 1) {
        setTimeout(() => {
          setCurrentIndex((prev) => prev + 1);
        }, 800);
      }
      return;
    }

    // Auto-pause at telestration points
    if (isPlaying) {
      const match = currentClip.telestrations.find(
        (f) => Math.abs(f.timestamp - time) <= 0.18
      );

      if (match && !pausedAtFrame) {
        videoRef.current.pause();
        setIsPlaying(false);
        setPausedAtFrame(true);
        setCurrentShapes(match.shapes);
        setActiveFrameNote(match.note || '');
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      if (audioRef.current) audioRef.current.pause();
    } else {
      setPausedAtFrame(false);
      videoRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
      if (audioRef.current && currentClip.voiceNoteUrl) {
        audioRef.current.play().catch(console.error);
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < clips.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Keyboard controls in talk mode
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowRight') {
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        handlePrev();
      } else if (e.code === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPlaying, currentIndex, clips.length]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col select-none overflow-hidden animate-in fade-in duration-200">
      {/* Top Presentation Bar */}
      <div className="h-14 bg-neutral-950 border-b border-neutral-800 px-6 flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm tracking-wider uppercase">
            <Tv className="w-4 h-4" />
            <span>Charla Técnica del Entrenador</span>
          </div>
          <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 font-mono">
            Jugada {currentIndex + 1} de {clips.length}
          </span>
        </div>

        {/* Playlist selector bar */}
        <div className="hidden md:flex items-center gap-1.5 overflow-x-auto max-w-xl">
          {clips.map((c, idx) => (
            <button
              key={c.id}
              onClick={() => setCurrentIndex(idx)}
              className={`text-xs px-2.5 py-1 border transition-colors truncate max-w-[130px] ${
                idx === currentIndex
                  ? 'bg-amber-500 text-neutral-950 font-bold border-amber-400'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
              }`}
            >
              {idx + 1}. {c.title}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 px-3 py-1.5 transition-colors"
        >
          <X className="w-4 h-4" />
          Salir (Esc)
        </button>
      </div>

      {/* Main Theatre Viewport */}
      <div
        ref={containerRef}
        className="flex-1 relative bg-black flex items-center justify-center overflow-hidden"
      >
        <video
          ref={videoRef}
          src={videoUrl}
          playsInline
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onClick={togglePlay}
        />

        {/* Audio Element for voice notes */}
        {currentClip.voiceNoteUrl && (
          <audio ref={audioRef} src={currentClip.voiceNoteUrl} />
        )}

        {/* Club Crest Watermark */}
        {crest && crest.url && (
          <img
            src={crest.url}
            alt={crest.name}
            style={{
              position: 'absolute',
              top: '24px',
              right: '24px',
              width: `${crest.size * 1.1}px`,
              height: `${crest.size * 1.1}px`,
              opacity: crest.opacity,
              zIndex: 25,
              pointerEvents: 'none'
            }}
          />
        )}

        {/* Telestration Canvas overlay */}
        <TelestrationCanvas
          width={videoDims.width}
          height={videoDims.height}
          shapes={currentShapes}
          activeTool="arrow_solid"
          activeColor="#FACC15"
          activeWidth={4}
          isDrawingEnabled={false}
          onShapesChange={() => {}}
        />

        {/* Auto-pause Frame Banner */}
        {pausedAtFrame && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-30 bg-amber-500 text-neutral-950 px-6 py-2 shadow-2xl flex items-center gap-4 animate-bounce">
            <span className="font-bold text-sm">⏸️ Pizarra congelada para la explicación</span>
            {activeFrameNote && <span className="font-semibold italic">"{activeFrameNote}"</span>}
            <button
              onClick={togglePlay}
              className="bg-neutral-950 text-white font-bold text-xs px-4 py-1 hover:bg-neutral-800 transition-colors"
            >
              Continuar ▶
            </button>
          </div>
        )}

        {/* Lower-Third Title & Tactical Coach Instructions */}
        <div className="absolute bottom-20 left-8 right-8 z-25 flex items-end justify-between pointer-events-none">
          <div className="bg-neutral-950/95 border-l-4 border-amber-500 p-4 max-w-xl shadow-2xl backdrop-blur-md">
            <div className="text-[11px] font-bold text-amber-400 tracking-wider uppercase">
              {currentClip.lowerThird?.category || 'CHARLA TÁCTICA'}
            </div>
            <h2 className="text-xl font-extrabold text-white mt-0.5">
              {currentClip.title}
            </h2>
            {currentClip.notes && (
              <p className="text-sm text-neutral-200 mt-1 leading-relaxed">
                {currentClip.notes}
              </p>
            )}
            {currentClip.lowerThird?.players && (
              <div className="text-xs text-neutral-400 mt-2 font-medium">
                Jugadores en foco: {currentClip.lowerThird.players}
              </div>
            )}
          </div>

          {/* Voice note indicator */}
          {currentClip.voiceNoteUrl && (
            <div className="bg-blue-950/90 border border-blue-700/80 px-4 py-2 flex items-center gap-2 text-blue-200 text-xs shadow-2xl backdrop-blur-sm">
              <Volume2 className="w-4 h-4 text-blue-400 animate-pulse" />
              <span>Audio del Entrenador Reproduciéndose</span>
            </div>
          )}
        </div>
      </div>

      {/* Presentation Bottom Navigation Bar */}
      <div className="h-16 bg-neutral-950 border-t border-neutral-800 px-6 flex items-center justify-between z-30">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold border border-neutral-800 transition-colors"
        >
          <SkipBack className="w-4 h-4" />
          Jugada Anterior
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="w-10 h-10 flex items-center justify-center bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>
        </div>

        <button
          onClick={handleNext}
          disabled={currentIndex === clips.length - 1}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-950 text-xs font-bold transition-colors"
        >
          Siguiente Jugada
          <SkipForward className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
