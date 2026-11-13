import React from 'react';
import {
  Play,
  HandMetal,
  Zap,
  Target,
  ShieldAlert,
  Radio,
  CheckCircle2,
  Sparkles,
  Info,
  Clock,
  ShieldCheck,
  FilterX
} from 'lucide-react';
import { VolleyballPhaseEvent, VolleyballRally } from '../../types/volleyball';

interface ActionSequenceBarProps {
  activeRally: VolleyballRally;
  currentTime: number;
  onSeekToAction: (timestamp: number) => void;
  minConfidenceThreshold?: number;
}

export const ActionSequenceBar: React.FC<ActionSequenceBarProps> = ({
  activeRally,
  currentTime,
  onSeekToAction,
  minConfidenceThreshold = 0.8
}) => {
  if (!activeRally || !activeRally.phases || activeRally.phases.length === 0) {
    return null;
  }

  // Configuration for action color blocks
  const getPhaseTheme = (phase: VolleyballPhaseEvent['phase']) => {
    switch (phase) {
      case 'serve':
        return {
          label: 'SAQUE',
          colorBg: 'bg-emerald-500/20 hover:bg-emerald-500/30',
          border: 'border-emerald-500/60',
          text: 'text-emerald-400',
          badgeBg: 'bg-emerald-500 text-neutral-950',
          barColor: 'bg-emerald-500',
          icon: Radio
        };
      case 'reception':
        return {
          label: 'RECEPCIÓN',
          colorBg: 'bg-blue-500/20 hover:bg-blue-500/30',
          border: 'border-blue-500/60',
          text: 'text-blue-400',
          badgeBg: 'bg-blue-500 text-white',
          barColor: 'bg-blue-500',
          icon: Target
        };
      case 'set':
        return {
          label: 'COLOCACIÓN',
          colorBg: 'bg-amber-500/20 hover:bg-amber-500/30',
          border: 'border-amber-500/60',
          text: 'text-amber-400',
          badgeBg: 'bg-amber-500 text-neutral-950',
          barColor: 'bg-amber-500',
          icon: HandMetal
        };
      case 'attack':
        return {
          label: 'ATAQUE',
          colorBg: 'bg-rose-500/20 hover:bg-rose-500/30',
          border: 'border-rose-500/60',
          text: 'text-rose-400',
          badgeBg: 'bg-rose-500 text-white',
          barColor: 'bg-rose-500',
          icon: Zap
        };
      case 'block':
        return {
          label: 'BLOQUEO',
          colorBg: 'bg-purple-500/20 hover:bg-purple-500/30',
          border: 'border-purple-500/60',
          text: 'text-purple-400',
          badgeBg: 'bg-purple-500 text-white',
          barColor: 'bg-purple-500',
          icon: ShieldAlert
        };
      case 'defense':
        return {
          label: 'DEFENSA',
          colorBg: 'bg-cyan-500/20 hover:bg-cyan-500/30',
          border: 'border-cyan-500/60',
          text: 'text-cyan-400',
          badgeBg: 'bg-cyan-500 text-neutral-950',
          barColor: 'bg-cyan-500',
          icon: ShieldCheck
        };
      case 'whistle':
      default:
        return {
          label: 'SILBATO',
          colorBg: 'bg-slate-500/20 hover:bg-slate-500/30',
          border: 'border-slate-400/50',
          text: 'text-slate-300',
          badgeBg: 'bg-slate-300 text-neutral-950',
          barColor: 'bg-slate-400',
          icon: CheckCircle2
        };
    }
  };

  const rallyStart = activeRally.startTime;
  const rallyEnd = activeRally.endTime;
  const totalRallySpan = Math.max(0.1, rallyEnd - rallyStart);

  return (
    <div className="bg-neutral-950 border border-neutral-800 p-3.5 space-y-3 shadow-lg select-none">
      {/* Top Header of the Sequence Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800/80 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-amber-500 rotate-45 shrink-0" />
          <span className="text-xs font-extrabold uppercase tracking-wider text-white">
            Secuencia Táctica Micro-Acción (VolleyAI)
          </span>
          <span className="text-[11px] text-neutral-400">
            · Punto #{activeRally.rallyNumber} (Set {activeRally.setNumber})
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          {/* Whistle Acoustic Validation Badge */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-neutral-900 border border-neutral-700 font-mono text-emerald-400">
            <Radio className="w-3 h-3 text-emerald-400" />
            <span>
              Silbato: 3.8 kHz ({(activeRally.cvTrackingData?.whistleConfidence * 100).toFixed(0)}%)
            </span>
          </div>

          {/* Anti-False Positive Tag */}
          <div className="hidden sm:flex items-center gap-1 text-neutral-400 font-mono">
            <ShieldCheck className="w-3 h-3 text-amber-400" />
            <span>Filtro Saludos & Aplausos: ACTIVO</span>
          </div>
        </div>
      </div>

      {/* Proportional Timeline Bar */}
      <div className="relative w-full h-8 bg-neutral-900 rounded overflow-hidden border border-neutral-800 flex items-center">
        {/* Playhead Indicator */}
        {currentTime >= rallyStart && currentTime <= rallyEnd && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white z-20 shadow-[0_0_8px_rgba(255,255,255,0.8)] transition-all"
            style={{
              left: `${Math.min(100, Math.max(0, ((currentTime - rallyStart) / totalRallySpan) * 100))}%`
            }}
          >
            <div className="w-2 h-2 -ml-[3px] bg-white rounded-full -top-1 absolute" />
          </div>
        )}

        {/* Phase Action Segments on Timeline */}
        {activeRally.phases.map((phase, idx) => {
          const theme = getPhaseTheme(phase.phase);
          const nextTimestamp =
            idx < activeRally.phases.length - 1
              ? activeRally.phases[idx + 1].timestamp
              : rallyEnd;
          const leftPercent = Math.max(0, ((phase.timestamp - rallyStart) / totalRallySpan) * 100);
          const widthPercent = Math.max(
            4,
            ((Math.max(0.4, nextTimestamp - phase.timestamp)) / totalRallySpan) * 100
          );
          const isCurrentlyActive =
            currentTime >= phase.timestamp - 0.5 && currentTime < nextTimestamp;

          return (
            <div
              key={phase.id}
              onClick={() => onSeekToAction(phase.timestamp)}
              className={`absolute top-0 bottom-0 cursor-pointer border-r border-neutral-950/40 flex items-center justify-center transition-all ${
                theme.barColor
              } ${isCurrentlyActive ? 'opacity-100 ring-2 ring-white z-10' : 'opacity-70 hover:opacity-95'}`}
              style={{
                left: `${leftPercent}%`,
                width: `${widthPercent}%`
              }}
              title={`${theme.label} (${phase.timestamp.toFixed(1)}s) - Confianza: ${Math.round(
                (phase.confidence ?? 0.95) * 100
              )}%`}
            >
              <span className="text-[10px] font-bold text-neutral-950 drop-shadow truncate px-1 hidden md:inline">
                {theme.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Interactive Micro-Action Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {activeRally.phases.map((phase) => {
          const theme = getPhaseTheme(phase.phase);
          const Icon = theme.icon;
          const isCurrentlyActive =
            currentTime >= phase.timestamp - 0.6 && currentTime <= phase.timestamp + 1.4;
          const confidencePct = Math.round((phase.confidence ?? 0.95) * 100);
          const isHighConfidence = (phase.confidence ?? 0.95) >= minConfidenceThreshold;

          return (
            <div
              key={phase.id}
              onClick={() => onSeekToAction(phase.timestamp)}
              className={`p-2 rounded border cursor-pointer transition-all flex flex-col justify-between ${
                theme.colorBg
              } ${theme.border} ${
                isCurrentlyActive
                  ? 'ring-2 ring-amber-400 scale-[1.02] shadow-md bg-neutral-900'
                  : 'hover:scale-[1.01]'
              }`}
            >
              {/* Card Header: Phase Label & Icon */}
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1.5">
                  <Icon className={`w-3.5 h-3.5 ${theme.text}`} />
                  <span className={`text-[11px] font-extrabold ${theme.text}`}>
                    {theme.label}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-neutral-400">
                  {phase.timestamp.toFixed(1)}s
                </span>
              </div>

              {/* Action Key Specific Details */}
              <div className="my-1.5 space-y-0.5">
                <div className="text-xs font-bold text-white truncate">
                  {phase.playerNumber || '#Equipo'} {phase.playerName ? `· ${phase.playerName}` : ''}
                </div>
                <div className="text-[10px] text-neutral-300 truncate">
                  {phase.phase === 'serve' && (
                    <span>{phase.serveType === 'jump_power' ? 'Salto Potencia' : 'Flotante'} ({phase.serveSpeedKmh || 90} km/h)</span>
                  )}
                  {phase.phase === 'reception' && (
                    <span>Pase Calidad: <strong className="text-emerald-400">{phase.receptionQuality || '#'}</strong> ({phase.zone || 'Z6'})</span>
                  )}
                  {phase.phase === 'set' && (
                    <span>Destino: <strong className="text-amber-400">{phase.setDestinationZone || phase.targetZone || 'Z4'}</strong> (Tempo 1)</span>
                  )}
                  {phase.phase === 'attack' && (
                    <span>{phase.attackOutcome === 'kill' ? 'Punto Directo' : 'En Juego'} · {phase.zone || 'Z4'}</span>
                  )}
                  {phase.phase === 'block' && (
                    <span>Bloqueo {phase.blockType || 'doble'} {phase.blockTouched ? '(Tocado)' : ''}</span>
                  )}
                  {phase.phase === 'defense' && (
                    <span>{phase.defenseType || 'campo'} ({phase.zone || 'Z5'})</span>
                  )}
                  {phase.phase === 'whistle' && (
                    <span>Pitido 3.8 kHz validado</span>
                  )}
                </div>
              </div>

              {/* Card Footer: Confidence Badge & Jump Button */}
              <div className="flex items-center justify-between pt-1 border-t border-neutral-800/60 text-[10px]">
                <div
                  className={`px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-0.5 ${
                    isHighConfidence
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                  }`}
                  title={`Confianza IA: ${confidencePct}% | Acústica: ${Math.round((phase.impactAcousticConfidence ?? 0.9) * 100)}%`}
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>{confidencePct}%</span>
                </div>

                <span className="text-neutral-400 hover:text-white flex items-center gap-0.5">
                  <Play className="w-2.5 h-2.5 fill-current" />
                  <span>-1.5s</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
