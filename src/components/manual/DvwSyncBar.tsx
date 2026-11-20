import React from 'react';
import {
  FileSpreadsheet,
  RefreshCw,
  Wand2,
  X,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { DvwMatchData } from '../../types/dvw';
import { formatTimecodeHMS } from '../../utils/timecode';

interface DvwSyncBarProps {
  dvwData: DvwMatchData;
  selectedSet: number;
  setOffsets: Record<number, number>;
  currentVideoTime: number;
  hasVideo: boolean;
  onSelectSet: (setNum: number) => void;
  onSyncSetWithCurrentVideo: (setNum: number) => void;
  onNudgeSetOffset: (setNum: number, deltaSec: number) => void;
  onOpenAutoClipModal: () => void;
  onClearDvw: () => void;
}

export const DvwSyncBar: React.FC<DvwSyncBarProps> = ({
  dvwData,
  selectedSet,
  setOffsets,
  currentVideoTime,
  hasVideo,
  onSelectSet,
  onSyncSetWithCurrentVideo,
  onNudgeSetOffset,
  onOpenAutoClipModal,
  onClearDvw
}) => {
  const firstServeSec = dvwData.firstServeBySet[selectedSet];
  const isExplicitlySynced = setOffsets[selectedSet] !== undefined;
  const isInheritedFromSet1 = !isExplicitlySynced && setOffsets[1] !== undefined;
  const activeOffset = isExplicitlySynced
    ? setOffsets[selectedSet]
    : isInheritedFromSet1
      ? setOffsets[1]
      : 0;

  const formatOffset = (sec: number) => {
    const sign = sec >= 0 ? '+' : '-';
    return `${sign}${Math.abs(sec).toFixed(1)}s`;
  };

  return (
    <div className="px-4 py-2.5 bg-[#1E293B] border-t border-[#334155] flex flex-wrap items-center justify-between gap-2.5 text-xs shrink-0">
      {/* Left: DVW Match Info + Set Selector + First Serve Timestamp */}
      <div className="flex items-center gap-2.5 flex-wrap min-w-0">
        <div className="flex items-center gap-1.5 text-[#10B981] font-semibold">
          <FileSpreadsheet className="w-4 h-4 shrink-0" />
          <span className="truncate max-w-[180px]" title={`${dvwData.homeTeam} vs ${dvwData.awayTeam}`}>
            {dvwData.homeTeam} vs {dvwData.awayTeam}
          </span>
        </div>

        <select
          value={selectedSet}
          onChange={(e) => onSelectSet(Number(e.target.value))}
          className="bg-[#0F172A] border border-[#334155] rounded-lg px-2 py-1 text-xs text-white font-medium focus:outline-none focus:border-[#3B82F6] cursor-pointer"
          title="Seleccionar Set a sincronizar"
        >
          {dvwData.setsPresent.map((s) => (
            <option key={s} value={s}>
              Set {s}
            </option>
          ))}
        </select>

        <span className="text-[11px] text-slate-300 font-mono tabular-time flex items-center gap-1 bg-[#0F172A] border border-[#334155] rounded-lg px-2 py-1">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>1er saque DVW:</span>
          <strong className="text-white">
            {firstServeSec !== undefined ? formatTimecodeHMS(firstServeSec) : '--:--:--'}
          </strong>
        </span>
      </div>

      {/* Center: Sync Set CTA + Offset + Fine-Tune Nudge Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => onSyncSetWithCurrentVideo(selectedSet)}
          disabled={!hasVideo || firstServeSec === undefined}
          className="px-3 py-1.5 bg-[#F97316] hover:bg-orange-500 disabled:bg-[#0F172A] disabled:text-slate-500 disabled:border disabled:border-[#334155] text-white font-semibold text-[11px] rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          title={`Usa el tiempo actual del vídeo (${formatTimecodeHMS(currentVideoTime)}) como 1er saque del Set ${selectedSet}`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sincronizar inicio de este Set con el vídeo actual</span>
        </button>

        {/* Offset Status & Fine Tuning */}
        <div className="flex items-center bg-[#0F172A] border border-[#334155] rounded-lg overflow-hidden">
          <span
            className={`px-2 py-1 text-[11px] font-mono tabular-time flex items-center gap-1 border-r border-[#334155] ${
              isExplicitlySynced
                ? 'text-[#10B981]'
                : isInheritedFromSet1
                  ? 'text-[#3B82F6]'
                  : 'text-slate-400'
            }`}
            title={
              isExplicitlySynced
                ? `Set ${selectedSet} sincronizado`
                : isInheritedFromSet1
                  ? 'Usando offset del Set 1 por defecto'
                  : 'Set pendiente de sincronizar (offset 0s)'
            }
          >
            {(isExplicitlySynced || isInheritedFromSet1) && <CheckCircle2 className="w-3 h-3" />}
            <span>Offset: {formatOffset(activeOffset)}</span>
          </span>

          {[-1.0, -0.5, 0.5, 1.0].map((delta) => (
            <button
              key={delta}
              onClick={() => onNudgeSetOffset(selectedSet, delta)}
              className="px-1.5 py-1 text-[10px] font-mono tabular-time text-slate-300 hover:text-white hover:bg-[#1E293B] border-r border-[#334155] last:border-r-0 transition-colors cursor-pointer"
              title={`Ajuste fino de offset (${delta > 0 ? '+' : ''}${delta}s)`}
            >
              {delta > 0 ? `+${delta.toFixed(1)}s` : `${delta.toFixed(1)}s`}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Auto-Generate Clips Button + Clear DVW */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={onOpenAutoClipModal}
          className="px-3 py-1.5 bg-[#3B82F6] hover:bg-blue-500 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-sm shadow-blue-500/20"
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>Auto-Generar Clips</span>
        </button>

        <button
          onClick={onClearDvw}
          className="p-1.5 text-slate-400 hover:text-rose-400 bg-[#0F172A] border border-[#334155] rounded-lg transition-colors cursor-pointer"
          title="Cerrar archivo .dvw"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
