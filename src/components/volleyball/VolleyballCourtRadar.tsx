import React, { useState } from 'react';
import { VolleyballRally, VolleyballPhaseEvent } from '../../types/volleyball';
import { Shield, Eye, Activity, Volume2, Radio, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';

interface VolleyballCourtRadarProps {
  currentRally?: VolleyballRally;
  currentTime: number;
}

export const VolleyballCourtRadar: React.FC<VolleyballCourtRadarProps> = ({
  currentRally,
  currentTime
}) => {
  if (!currentRally) return null;

  const [activeSubTab, setActiveSubTab] = useState<'court' | 'acoustic'>('court');

  // Determine active volleyball phase at currentTime
  const sortedPhases = [...currentRally.phases].sort((a, b) => a.timestamp - b.timestamp);
  const activePhase =
    sortedPhases
      .slice()
      .reverse()
      .find((p) => currentTime >= p.timestamp) || sortedPhases[0];

  // Ball velocity & tracking
  const peakSpeed = currentRally.cvTrackingData?.ballPeakVelocityKmh || 96.5;
  const whistleHz = currentRally.cvTrackingData?.whistlePeakHz || 3850;
  const crestFactor = currentRally.cvTrackingData?.audioCrestFactor || 16.4;
  const applauseRejection = currentRally.cvTrackingData?.applauseRejectionScore || 0.97;
  const impactConf = currentRally.cvTrackingData?.ballImpactConfidence || 0.95;

  return (
    <div className="bg-neutral-900 border border-neutral-800 p-3 space-y-3 select-none">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-2">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Radar Táctico FIVB (9x18m) & Validación Acústica IA
          </h3>
        </div>

        {/* Sub-tab Switch */}
        <div className="flex items-center gap-1 bg-neutral-950 p-0.5 border border-neutral-800 text-[11px]">
          <button
            onClick={() => setActiveSubTab('court')}
            className={`px-2 py-0.5 font-semibold transition-colors ${
              activeSubTab === 'court'
                ? 'bg-amber-500 text-neutral-950 font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Pista 2D
          </button>
          <button
            onClick={() => setActiveSubTab('acoustic')}
            className={`px-2 py-0.5 font-semibold transition-colors flex items-center gap-1 ${
              activeSubTab === 'acoustic'
                ? 'bg-amber-500 text-neutral-950 font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Radio className="w-3 h-3" />
            <span>Espectro Acústico ({whistleHz} Hz)</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'court' ? (
        <>
          {/* 2D Court Diagram + Zone Overlays */}
          <div className="relative aspect-[18/9] bg-orange-950/20 border-2 border-orange-500/60 rounded-xs overflow-hidden flex shadow-inner">
            {/* Left Court (Team Away / Far side) */}
            <div className="flex-1 border-r-4 border-white relative flex flex-col justify-between p-1 text-[10px] font-mono text-neutral-400">
              {/* Top row: Z4, Z3, Z2 */}
              <div className="flex justify-between items-center px-2 pt-1">
                <span className={activePhase?.zone === 'Z4' ? 'text-amber-400 font-bold' : ''}>Z4</span>
                <span className={activePhase?.zone === 'Z3' ? 'text-amber-400 font-bold' : ''}>Z3</span>
                <span className={activePhase?.zone === 'Z2' ? 'text-amber-400 font-bold' : ''}>Z2</span>
              </div>

              {/* 3m Attack Line */}
              <div className="absolute right-12 top-0 bottom-0 border-r border-dashed border-red-500/50" />

              {/* Bottom row: Z5, Z6, Z1 */}
              <div className="flex justify-between items-center px-2 pb-1">
                <span className={activePhase?.zone === 'Z5' ? 'text-amber-400 font-bold' : ''}>Z5</span>
                <span className={activePhase?.zone === 'Z6' || activePhase?.zone === 'Pipe' ? 'text-amber-400 font-bold' : ''}>
                  Z6/Pipe
                </span>
                <span className={activePhase?.zone === 'Z1' ? 'text-amber-400 font-bold' : ''}>Z1</span>
              </div>
            </div>

            {/* Center Net */}
            <div className="w-1 bg-white relative z-10 flex items-center justify-center">
              <span className="text-[8px] bg-neutral-900 text-white px-0.5 py-1 -rotate-90 whitespace-nowrap border border-white">
                RED
              </span>
            </div>

            {/* Right Court (Team Home / Near side) */}
            <div className="flex-1 relative flex flex-col justify-between p-1 text-[10px] font-mono text-neutral-400">
              {/* 3m Attack Line */}
              <div className="absolute left-12 top-0 bottom-0 border-r border-dashed border-red-500/50" />

              {/* Top row: Z2, Z3, Z4 */}
              <div className="flex justify-between items-center px-2 pt-1">
                <span className={activePhase?.zone === 'Z2' ? 'text-amber-400 font-bold' : ''}>Z2</span>
                <span className={activePhase?.zone === 'Z3' ? 'text-amber-400 font-bold' : ''}>Z3</span>
                <span className={activePhase?.zone === 'Z4' ? 'text-amber-400 font-bold' : ''}>Z4</span>
              </div>

              {/* Bottom row: Z1, Z6, Z5 */}
              <div className="flex justify-between items-center px-2 pb-1">
                <span className={activePhase?.zone === 'Z1' ? 'text-amber-400 font-bold' : ''}>Z1</span>
                <span className={activePhase?.zone === 'Z6' || activePhase?.zone === 'Pipe' ? 'text-amber-400 font-bold' : ''}>
                  Z6/Pipe
                </span>
                <span className={activePhase?.zone === 'Z5' ? 'text-amber-400 font-bold' : ''}>Z5</span>
              </div>
            </div>

            {/* Ball Position Marker if courtCoord available */}
            {activePhase?.courtCoord && (
              <div
                style={{
                  left: `${activePhase.courtCoord.x * 100}%`,
                  top: `${activePhase.courtCoord.y * 100}%`
                }}
                className="absolute w-3.5 h-3.5 bg-amber-400 border border-white rounded-full -translate-x-1/2 -translate-y-1/2 shadow-lg animate-ping"
              />
            )}
          </div>

          {/* Active Phase Live Scout Breakdown Card */}
          {activePhase && (
            <div className="bg-neutral-950 p-2.5 border border-neutral-800 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="bg-amber-500 text-neutral-950 font-extrabold px-1.5 py-0.5 text-[10px] uppercase">
                    {activePhase.phase}
                  </span>
                  <span className="font-semibold text-white">
                    {activePhase.playerName || activePhase.playerNumber || 'Acción'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-1.5 py-0.2 bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                    Confianza: {Math.round((activePhase.confidence ?? 0.95) * 100)}%
                  </span>
                  <span className="font-mono text-neutral-400 tabular-nums">
                    t={activePhase.timestamp.toFixed(1)}s
                  </span>
                </div>
              </div>

              {/* Specific phase parameters */}
              <div className="text-[11px] text-neutral-300 leading-relaxed">
                {activePhase.phase === 'serve' && (
                  <span>
                    Saque {activePhase.serveType} a {activePhase.serveSpeedKmh} km/h hacia{' '}
                    {activePhase.targetZone}.
                  </span>
                )}
                {activePhase.phase === 'reception' && (
                  <span>
                    Recepción calidad{' '}
                    <strong className="text-amber-400 font-bold text-xs">
                      "{activePhase.receptionQuality}"
                    </strong>{' '}
                    en {activePhase.zone}.
                  </span>
                )}
                {activePhase.phase === 'set' && (
                  <span>
                    Colocación sistema{' '}
                    <strong className="text-blue-400">{activePhase.system}</strong> hacia{' '}
                    <strong className="text-amber-400">{activePhase.setDestinationZone}</strong> (
                    {activePhase.setTempo}).
                  </span>
                )}
                {activePhase.phase === 'attack' && (
                  <span>
                    Ataque remate {activePhase.attackType} ({activePhase.attackOutcome}).
                  </span>
                )}
                {activePhase.phase === 'block' && (
                  <span>
                    Bloqueo {activePhase.blockType} cerrando cono de trayectoria rival.
                  </span>
                )}
                {activePhase.phase === 'defense' && (
                  <span>
                    Defensa {activePhase.defenseType} manteniendo balón vivo en K2.
                  </span>
                )}
                {activePhase.phase === 'whistle' && (
                  <span>Pitido validado por sensor espectral STFT en {whistleHz} Hz.</span>
                )}
                {activePhase.note && (
                  <span className="block text-neutral-400 italic mt-0.5">{activePhase.note}</span>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Acoustic Spectrogram & False Positive Validation Widget */
        <div className="p-3 bg-neutral-950 border border-neutral-800 space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-white uppercase text-[11px]">
                Validación de Silbato vs Ruido de Aplausos (STFT Audio Pipeline)
              </span>
            </div>
            <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 border border-emerald-500/30">
              Pico Fox40: {whistleHz} Hz
            </span>
          </div>

          {/* Visual Frequency Spectrum Mockup */}
          <div className="space-y-1">
            <div className="text-[10px] text-neutral-400 flex justify-between font-mono">
              <span>500 Hz</span>
              <span className="text-emerald-400 font-bold">3.8 kHz (Silbato Puro)</span>
              <span>8 kHz</span>
              <span>16 kHz</span>
            </div>
            {/* Visual Bar representation of audio spectrum */}
            <div className="h-14 bg-neutral-900 border border-neutral-800 rounded p-1 flex items-end gap-1">
              {[12, 18, 14, 22, 28, 20, 35, 95, 88, 30, 24, 18, 14, 12, 10, 8, 6].map((h, i) => (
                <div
                  key={i}
                  style={{ height: `${h}%` }}
                  className={`flex-1 transition-all ${
                    i === 7 || i === 8
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                      : 'bg-neutral-700/60'
                  }`}
                  title={`${i * 1000} Hz`}
                />
              ))}
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
            <div className="p-2 bg-neutral-900 border border-neutral-800 rounded">
              <div className="text-[10px] text-neutral-400">Factor de Cresta:</div>
              <div className="text-emerald-400 font-bold text-sm">+{crestFactor} dB</div>
              <div className="text-[9px] text-neutral-500">Tono puro (&gt;14 dB)</div>
            </div>

            <div className="p-2 bg-neutral-900 border border-neutral-800 rounded">
              <div className="text-[10px] text-neutral-400">Rechazo Aplausos:</div>
              <div className="text-emerald-400 font-bold text-sm">{(applauseRejection * 100).toFixed(0)}%</div>
              <div className="text-[9px] text-neutral-500">Banda ancha descartada</div>
            </div>

            <div className="p-2 bg-neutral-900 border border-neutral-800 rounded">
              <div className="text-[10px] text-neutral-400">Impacto Balón:</div>
              <div className="text-amber-400 font-bold text-sm">{(impactConf * 100).toFixed(0)}%</div>
              <div className="text-[9px] text-neutral-500">Transitorio acústico</div>
            </div>

            <div className="p-2 bg-neutral-900 border border-neutral-800 rounded">
              <div className="text-[10px] text-neutral-400">Filtro Saludos:</div>
              <div className="text-emerald-400 font-bold text-sm">ACTIVO</div>
              <div className="text-[9px] text-neutral-500">0.0s - 0.7s descartado</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
