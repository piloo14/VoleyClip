import React, { useState } from 'react';
import { Shield, Activity, Clock, Plus, Trash2, ArrowRight } from 'lucide-react';
import { MatchPeriod, PossessionInterval } from '../../types/tactical';

interface PossessionMomentumPanelProps {
  homeTeam: string;
  awayTeam: string;
  homeColor: string;
  awayColor: string;
  periods: MatchPeriod[];
  possessions: PossessionInterval[];
  currentVideoTime: number;
  videoDuration: number;
  onAddPossession: (possession: Omit<PossessionInterval, 'id'>) => void;
  onDeletePossession: (id: string) => void;
  onSeekTo: (timestamp: number) => void;
}

export const PossessionMomentumPanel: React.FC<PossessionMomentumPanelProps> = ({
  homeTeam,
  awayTeam,
  homeColor,
  awayColor,
  periods,
  possessions,
  currentVideoTime,
  videoDuration,
  onAddPossession,
  onDeletePossession,
  onSeekTo
}) => {
  const [activeRecordingTeam, setActiveRecordingTeam] = useState<'home' | 'away' | 'dead' | null>(
    null
  );
  const [intervalStartTime, setIntervalStartTime] = useState<number | null>(null);
  const [intervalNote, setIntervalNote] = useState('');

  // Calculate possession statistics
  const totalTrackedSeconds = possessions.reduce((acc, p) => acc + (p.endSec - p.startSec), 0);
  const homeSeconds = possessions
    .filter((p) => p.team === 'home')
    .reduce((acc, p) => acc + (p.endSec - p.startSec), 0);
  const awaySeconds = possessions
    .filter((p) => p.team === 'away')
    .reduce((acc, p) => acc + (p.endSec - p.startSec), 0);
  const deadSeconds = possessions
    .filter((p) => p.team === 'dead')
    .reduce((acc, p) => acc + (p.endSec - p.startSec), 0);

  const homePct = totalTrackedSeconds > 0 ? Math.round((homeSeconds / totalTrackedSeconds) * 100) : 50;
  const awayPct = totalTrackedSeconds > 0 ? Math.round((awaySeconds / totalTrackedSeconds) * 100) : 50;
  const deadPct = totalTrackedSeconds > 0 ? Math.round((deadSeconds / totalTrackedSeconds) * 100) : 0;

  const formatMinSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}m ${s}s`;
  };

  const handleStartInterval = (team: 'home' | 'away' | 'dead') => {
    if (activeRecordingTeam && intervalStartTime !== null) {
      // Complete previous interval up to current time
      const endSec = Math.max(intervalStartTime + 0.5, currentVideoTime);
      onAddPossession({
        team: activeRecordingTeam,
        startSec: intervalStartTime,
        endSec,
        note: intervalNote.trim() || undefined
      });
      setIntervalNote('');
    }
    setActiveRecordingTeam(team);
    setIntervalStartTime(currentVideoTime);
  };

  const handleFinishInterval = () => {
    if (activeRecordingTeam && intervalStartTime !== null) {
      const endSec = Math.max(intervalStartTime + 0.5, currentVideoTime);
      onAddPossession({
        team: activeRecordingTeam,
        startSec: intervalStartTime,
        endSec,
        note: intervalNote.trim() || undefined
      });
      setActiveRecordingTeam(null);
      setIntervalStartTime(null);
      setIntervalNote('');
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Ritmo y Posesión del Partido
          </h3>
        </div>
        <div className="text-xs text-neutral-400 font-mono tabular-nums">
          Total analizado: {formatMinSec(totalTrackedSeconds)}
        </div>
      </div>

      {/* Primary Momentum Comparison Bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs font-semibold">
          <span className="flex items-center gap-1.5" style={{ color: homeColor }}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: homeColor }} />
            {homeTeam}: {homePct}% ({formatMinSec(homeSeconds)})
          </span>
          <span className="flex items-center gap-1.5" style={{ color: awayColor }}>
            {awayTeam}: {awayPct}% ({formatMinSec(awaySeconds)})
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: awayColor }} />
          </span>
        </div>

        {/* Momentum Bar */}
        <div className="h-3 bg-neutral-950 flex overflow-hidden border border-neutral-800">
          <div
            style={{ width: `${homePct}%`, backgroundColor: homeColor }}
            className="h-full transition-all duration-300"
            title={`${homeTeam}: ${homePct}%`}
          />
          {deadPct > 0 && (
            <div
              style={{ width: `${deadPct}%` }}
              className="h-full bg-neutral-700 transition-all duration-300"
              title={`Balón muerto / disputa: ${deadPct}%`}
            />
          )}
          <div
            style={{ width: `${awayPct}%`, backgroundColor: awayColor }}
            className="h-full transition-all duration-300"
            title={`${awayTeam}: ${awayPct}%`}
          />
        </div>
      </div>

      {/* Live Possession Logger Buttons */}
      <div className="bg-neutral-950 border border-neutral-800 p-3 space-y-2.5">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="font-medium text-neutral-300">Registrar Posesión en Directo</span>
          <span className="font-mono tabular-nums text-amber-400">
            Segundo actual: {currentVideoTime.toFixed(1)}s
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleStartInterval('home')}
            className={`py-2 px-3 text-xs font-bold transition-all border ${
              activeRecordingTeam === 'home'
                ? 'bg-amber-500 text-neutral-950 border-amber-400 ring-2 ring-amber-400'
                : 'bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-700'
            }`}
          >
            Posesión Local
          </button>
          <button
            onClick={() => handleStartInterval('away')}
            className={`py-2 px-3 text-xs font-bold transition-all border ${
              activeRecordingTeam === 'away'
                ? 'bg-blue-500 text-white border-blue-400 ring-2 ring-blue-400'
                : 'bg-neutral-900 hover:bg-neutral-800 text-white border-neutral-700'
            }`}
          >
            Posesión Rival
          </button>
          <button
            onClick={() => handleStartInterval('dead')}
            className={`py-2 px-3 text-xs font-bold transition-all border ${
              activeRecordingTeam === 'dead'
                ? 'bg-neutral-600 text-white border-neutral-400 ring-2 ring-neutral-400'
                : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border-neutral-700'
            }`}
          >
            Balón Muerto
          </button>
        </div>

        {activeRecordingTeam && (
          <div className="flex items-center gap-2 pt-1 border-t border-neutral-800">
            <input
              type="text"
              value={intervalNote}
              onChange={(e) => setIntervalNote(e.target.value)}
              placeholder="Nota del ritmo (ej. Transición 3c2, Racha favorable)..."
              className="flex-1 bg-neutral-900 border border-neutral-700 text-xs px-2.5 py-1 text-white focus:outline-none focus:border-amber-500"
            />
            <button
              onClick={handleFinishInterval}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1 transition-colors whitespace-nowrap"
            >
              Fijar Tramo
            </button>
          </div>
        )}
      </div>

      {/* Period Timeline & Registered Intervals */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-neutral-300">
          Distribución por Cuartos / Períodos
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {periods.map((period) => {
            const pIntervals = possessions.filter(
              (p) =>
                (p.startSec >= period.startSec && p.startSec < period.endSec) ||
                (p.endSec > period.startSec && p.endSec <= period.endSec)
            );
            const pHomeSec = pIntervals
              .filter((p) => p.team === 'home')
              .reduce((acc, p) => acc + (p.endSec - p.startSec), 0);
            const pAwaySec = pIntervals
              .filter((p) => p.team === 'away')
              .reduce((acc, p) => acc + (p.endSec - p.startSec), 0);
            const pTotal = pHomeSec + pAwaySec;
            const pHomePct = pTotal > 0 ? Math.round((pHomeSec / pTotal) * 100) : 50;

            return (
              <div
                key={period.id}
                className="bg-neutral-950 p-2.5 border border-neutral-800 space-y-1.5"
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-white">{period.name}</span>
                  <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums">
                    <span style={{ color: homeColor }}>{pHomePct}%</span>
                    <span className="text-neutral-500">vs</span>
                    <span style={{ color: awayColor }}>{100 - pHomePct}%</span>
                  </div>
                </div>

                {/* Sub-bar for this quarter */}
                <div className="h-1.5 bg-neutral-800 flex overflow-hidden">
                  <div style={{ width: `${pHomePct}%`, backgroundColor: homeColor }} className="h-full" />
                  <div
                    style={{ width: `${100 - pHomePct}%`, backgroundColor: awayColor }}
                    className="h-full"
                  />
                </div>

                {/* Interactive intervals list */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {pIntervals.map((interval) => (
                    <div
                      key={interval.id}
                      onClick={() => onSeekTo(interval.startSec)}
                      className={`group cursor-pointer text-[10px] px-2 py-0.5 border flex items-center gap-1 transition-colors ${
                        interval.team === 'home'
                          ? 'bg-amber-950/40 border-amber-800/60 text-amber-300 hover:bg-amber-900/60'
                          : interval.team === 'away'
                          ? 'bg-blue-950/40 border-blue-800/60 text-blue-300 hover:bg-blue-900/60'
                          : 'bg-neutral-800/40 border-neutral-700 text-neutral-400'
                      }`}
                      title={`Clic para saltar el vídeo a ${interval.startSec.toFixed(1)}s`}
                    >
                      <span className="font-mono">
                        {interval.startSec.toFixed(1)}s-{interval.endSec.toFixed(1)}s
                      </span>
                      {interval.note && <span className="truncate max-w-[90px]">({interval.note})</span>}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePossession(interval.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-400 ml-0.5"
                        title="Eliminar tramo"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
