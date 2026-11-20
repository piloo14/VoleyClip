import React, { useMemo, useState } from 'react';
import {
  X,
  Wand2,
  Film,
  Filter,
  AlertTriangle,
  Plus,
  Play,
  Scissors
} from 'lucide-react';
import {
  DvwClipFilterOptions,
  DvwEvaluationCode,
  DvwMatchData,
  DvwSkillCode
} from '../../types/dvw';
import { VolleyballFolder } from '../../types/manualTactical';
import {
  EVALUATION_LABELS,
  SKILL_LABELS,
  buildDvwClipsPreview
} from '../../utils/dvwParser';
import { formatTimecodeShort } from '../../utils/timecode';

interface DvwAutoClipModalProps {
  isOpen: boolean;
  onClose: () => void;
  dvwData: DvwMatchData | null;
  setOffsets: Record<number, number>;
  videoDuration: number;
  hasVideo: boolean;
  folders: VolleyballFolder[];
  activeFolderId: string;
  onAddGeneratedClips: (
    filters: DvwClipFilterOptions,
    targetFolderMode: 'active' | 'by_skill' | string
  ) => void;
  onPreviewSeek?: (timeSec: number) => void;
}

export const DvwAutoClipModal: React.FC<DvwAutoClipModalProps> = ({
  isOpen,
  onClose,
  dvwData,
  setOffsets,
  videoDuration,
  hasVideo,
  folders,
  activeFolderId,
  onAddGeneratedClips,
  onPreviewSeek
}) => {
  const [mode, setMode] = useState<'action' | 'rally'>('action');
  const [team, setTeam] = useState<'all' | 'home' | 'away'>('all');
  const [selectedSet, setSelectedSet] = useState<'all' | number>('all');
  const [playerKey, setPlayerKey] = useState<string>('all');
  const [skill, setSkill] = useState<'all' | DvwSkillCode>('all');
  const [evaluation, setEvaluation] = useState<'all' | DvwEvaluationCode>('all');
  const [preRollSec, setPreRollSec] = useState<number>(3);
  const [postRollSec, setPostRollSec] = useState<number>(2);
  const [targetFolderMode, setTargetFolderMode] = useState<string>('active');

  const filters: DvwClipFilterOptions = useMemo(
    () => ({
      mode,
      team,
      set: selectedSet,
      playerKey,
      skill,
      evaluation,
      preRollSec: Number.isFinite(preRollSec) ? Math.max(0, preRollSec) : 3,
      postRollSec: Number.isFinite(postRollSec) ? Math.max(0, postRollSec) : 2
    }),
    [mode, team, selectedSet, playerKey, skill, evaluation, preRollSec, postRollSec]
  );

  // Dynamic players dropdown filtered by team
  const filteredPlayers = useMemo(() => {
    if (!dvwData) return [];
    const list =
      team === 'all' ? dvwData.players : dvwData.players.filter((p) => p.team === team);
    return [...list].sort((a, b) => Number(a.number) - Number(b.number));
  }, [dvwData, team]);

  // Live matched clips preview
  const matchedClips = useMemo(() => {
    if (!dvwData) return [];
    return buildDvwClipsPreview(dvwData, filters, setOffsets, videoDuration);
  }, [dvwData, filters, setOffsets, videoDuration]);

  if (!isOpen || !dvwData) return null;

  const hasAnySyncedSet = Object.keys(setOffsets).length > 0;
  const activeFolder = folders.find((f) => f.id === activeFolderId) || folders[0];

  const handleSubmit = () => {
    if (matchedClips.length === 0) return;
    onAddGeneratedClips(filters, targetFolderMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020617]/85 backdrop-blur-xs">
      <div className="bg-[#1E293B] border border-[#334155] rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0F172A] border-b border-[#334155] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-[#3B82F6]/20 text-[#3B82F6] rounded-xl shrink-0">
              <Wand2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-white truncate">
                Auto-Generar Clips desde Scouting (.dvw)
              </h2>
              <p className="text-xs text-slate-400 truncate">
                {dvwData.homeTeam} vs {dvwData.awayTeam} · {dvwData.actions.length} acciones registradas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {!hasAnySyncedSet && (
            <div className="p-3 bg-[#F97316]/15 border border-[#F97316]/40 rounded-xl flex items-start gap-2.5 text-xs text-orange-200">
              <AlertTriangle className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
              <div>
                <strong>Sincronización pendiente:</strong> Todavía no has sincronizado el 1er saque con el vídeo. Se usará el tiempo bruto del archivo .dvw (offset 0s) hasta que sincronices un Set en la barra inferior del reproductor.
              </div>
            </div>
          )}

          {/* 1. Cut Mode Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5 text-[#F97316]" />
              <span>Modo de Recorte</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setMode('action')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  mode === 'action'
                    ? 'bg-[#3B82F6]/15 border-[#3B82F6] text-white'
                    : 'bg-[#0F172A] border-[#334155] text-slate-300 hover:border-slate-500'
                }`}
              >
                <div className="text-xs font-semibold">Por Acción Individual</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Recorta exactamente alrededor del momento de la acción filtrada.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('rally')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  mode === 'rally'
                    ? 'bg-[#3B82F6]/15 border-[#3B82F6] text-white'
                    : 'bg-[#0F172A] border-[#334155] text-slate-300 hover:border-slate-500'
                }`}
              >
                <div className="text-xs font-semibold">Por Punto Completo (Rally)</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Detecta desde el saque inicial (S) hasta el final del punto (p).
                </div>
              </button>
            </div>
          </div>

          {/* 2. Dynamic Tactical Filters */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#3B82F6]" />
              <span>Filtros Tácticos</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Team */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Equipo</label>
                <select
                  value={team}
                  onChange={(e) => {
                    setTeam(e.target.value as 'all' | 'home' | 'away');
                    setPlayerKey('all');
                  }}
                  className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#3B82F6]"
                >
                  <option value="all">Ambos equipos</option>
                  <option value="home">Local: {dvwData.homeTeam}</option>
                  <option value="away">Visitante: {dvwData.awayTeam}</option>
                </select>
              </div>

              {/* Set */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Set</label>
                <select
                  value={selectedSet}
                  onChange={(e) =>
                    setSelectedSet(e.target.value === 'all' ? 'all' : Number(e.target.value))
                  }
                  className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#3B82F6]"
                >
                  <option value="all">Todos los sets</option>
                  {dvwData.setsPresent.map((s) => (
                    <option key={s} value={s}>
                      Set {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Player */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Jugadora</label>
                <select
                  value={playerKey}
                  onChange={(e) => setPlayerKey(e.target.value)}
                  className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#3B82F6]"
                >
                  <option value="all">Todas las jugadoras ({filteredPlayers.length})</option>
                  {filteredPlayers.map((p) => (
                    <option key={`${p.team}:${p.number}`} value={`${p.team}:${p.number}`}>
                      #{p.number} {p.fullName} ({p.team === 'home' ? 'Loc' : 'Vis'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Skill */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Fundamento</label>
                <select
                  value={skill}
                  onChange={(e) => setSkill(e.target.value as 'all' | DvwSkillCode)}
                  className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#3B82F6]"
                >
                  <option value="all">Todos los fundamentos</option>
                  {(Object.keys(SKILL_LABELS) as DvwSkillCode[]).map((code) => (
                    <option key={code} value={code}>
                      {SKILL_LABELS[code]} ({code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Evaluation */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Valoración</label>
                <select
                  value={evaluation}
                  onChange={(e) => setEvaluation(e.target.value as 'all' | DvwEvaluationCode)}
                  className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#3B82F6]"
                >
                  <option value="all">Todas las valoraciones</option>
                  {(Object.keys(EVALUATION_LABELS) as DvwEvaluationCode[]).map((code) => (
                    <option key={code} value={code}>
                      {EVALUATION_LABELS[code]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Folder */}
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">Carpeta de destino</label>
                <select
                  value={targetFolderMode}
                  onChange={(e) => setTargetFolderMode(e.target.value)}
                  className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#3B82F6]"
                >
                  <option value="active">Carpeta actual: {activeFolder.name}</option>
                  <option value="by_skill">Automática según fundamento</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.icon} {f.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 3. Pre-roll & Post-roll Margins */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#0F172A] border border-[#334155] rounded-xl">
            <div className="space-y-1">
              <label className="text-[11px] text-slate-300 font-medium">
                Margen anterior (IN, segundos)
              </label>
              <input
                type="number"
                min={0}
                max={30}
                step={0.5}
                value={preRollSec}
                onChange={(e) => setPreRollSec(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#1E293B] border border-[#334155] rounded-lg px-3 py-1.5 text-xs font-mono tabular-time text-white focus:outline-none focus:border-[#3B82F6]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-300 font-medium">
                Margen posterior (OUT, segundos)
              </label>
              <input
                type="number"
                min={0}
                max={30}
                step={0.5}
                value={postRollSec}
                onChange={(e) => setPostRollSec(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#1E293B] border border-[#334155] rounded-lg px-3 py-1.5 text-xs font-mono tabular-time text-white focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
          </div>

          {/* 4. Live Match Counter & Preview List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">
                Vista previa de resultados
              </span>
              <span className="font-mono tabular-time font-semibold text-[#10B981]">
                {matchedClips.length}{' '}
                {matchedClips.length === 1 ? 'jugada encontrada' : 'jugadas encontradas'}
              </span>
            </div>

            {matchedClips.length === 0 ? (
              <div className="p-5 text-center bg-[#0F172A] border border-dashed border-[#334155] rounded-xl text-xs text-slate-400">
                Ninguna acción coincide con los filtros actuales. Prueba ampliar el equipo, fundamento o valoración.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {matchedClips.slice(0, 50).map((item, idx) => (
                  <div
                    key={item.key}
                    className="px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-lg flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono tabular-time text-[11px] text-slate-500 w-6 shrink-0">
                        #{idx + 1}
                      </span>
                      <span className="text-slate-100 font-medium truncate">
                        {item.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono tabular-time text-[11px] text-slate-300">
                        {formatTimecodeShort(item.startTime)} → {formatTimecodeShort(item.endTime)}
                      </span>
                      <span className="font-mono tabular-time text-[10px] px-1.5 py-0.5 bg-[#1E293B] border border-[#334155] text-[#3B82F6] rounded">
                        {item.duration.toFixed(1)}s
                      </span>
                      {onPreviewSeek && hasVideo && (
                        <button
                          type="button"
                          onClick={() => onPreviewSeek(item.startTime)}
                          className="p-1 text-slate-400 hover:text-[#3B82F6] cursor-pointer"
                          title="Ir a este momento en el vídeo"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {matchedClips.length > 50 && (
                  <div className="text-center text-[11px] text-slate-400 py-1">
                    Mostrando los primeros 50 de {matchedClips.length} clips encontrados...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#0F172A] border-t border-[#334155] flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1E293B] hover:bg-slate-700 border border-[#334155] text-slate-200 rounded-lg text-xs font-medium cursor-pointer"
          >
            Cancelar
          </button>

          <button
            onClick={handleSubmit}
            disabled={matchedClips.length === 0}
            className="px-5 py-2.5 bg-[#10B981] hover:bg-emerald-400 disabled:bg-[#1E293B] disabled:text-slate-500 text-[#0F172A] font-bold text-xs rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Añadir a la cola de clips ({matchedClips.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
