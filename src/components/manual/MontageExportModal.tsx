import React, { useState } from 'react';
import {
  Film,
  Download,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MoveUp,
  MoveDown,
  Trash2
} from 'lucide-react';
import { VolleyballFolder, ManualTacticalClip } from '../../types/manualTactical';
import { concatenateClipsWithFFmpeg } from '../../utils/videoMontage';
import { formatTimecodeShort } from '../../utils/timecode';

interface MontageExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: VolleyballFolder;
  clips: ManualTacticalClip[];
  videoSourceUrl: string;
}

export const MontageExportModal: React.FC<MontageExportModalProps> = ({
  isOpen,
  onClose,
  folder,
  clips: initialClips,
  videoSourceUrl
}) => {
  const [orderedClips, setOrderedClips] = useState<ManualTacticalClip[]>(initialClips);
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [currentClipTitle, setCurrentClipTitle] = useState('');
  const [outputBlobUrl, setOutputBlobUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    setOrderedClips(initialClips);
    setOutputBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setErrorMsg(null);
    setProgress(0);
    setIsRendering(false);
  }, [initialClips, folder]);

  React.useEffect(() => {
    return () => {
      if (outputBlobUrl) URL.revokeObjectURL(outputBlobUrl);
    };
  }, [outputBlobUrl]);

  if (!isOpen) return null;

  const totalDuration = orderedClips.reduce((acc, c) => acc + c.duration, 0);
  const defaultFilename = `VoleyClip_${folder.name.replace(/\s+/g, '_')}_Montaje.mp4`;

  const moveClip = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= orderedClips.length) return;
    const next = [...orderedClips];
    const [moved] = next.splice(index, 1);
    next.splice(newIdx, 0, moved);
    setOrderedClips(next);
  };

  const removeClipFromMontage = (clipId: string) => {
    setOrderedClips(orderedClips.filter((c) => c.id !== clipId));
  };

  const handleStartConcatenation = async () => {
    if (orderedClips.length === 0) return;
    if (!videoSourceUrl) {
      setErrorMsg('Sube primero el vídeo de tu partido en el reproductor principal.');
      return;
    }
    setIsRendering(true);
    setProgress(10);
    setErrorMsg(null);
    setOutputBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setCurrentClipTitle('Iniciando unión de clips...');

    try {
      const blobUrl = await concatenateClipsWithFFmpeg(
        videoSourceUrl,
        orderedClips,
        (currentIdx, _total, percent, title) => {
          setCurrentClipIndex(currentIdx);
          setProgress(percent);
          setCurrentClipTitle(title);
        },
        defaultFilename
      );

      setOutputBlobUrl(blobUrl);
      setProgress(100);
    } catch (err: any) {
      console.error('Error durante la concatenación:', err);
      setErrorMsg(err?.message || 'Error al procesar y unir los clips de vídeo.');
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020617]/80 backdrop-blur-xs">
      <div className="bg-[#1E293B] border border-[#334155] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0F172A] border-b border-[#334155] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{folder.icon}</span>
            <div>
              <h2 className="text-base font-bold text-white">
                Unir y Exportar: {folder.name}
              </h2>
              <p className="text-xs text-slate-400">
                Exportación MP4 fluida a 30 FPS constantes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isRendering}
            className="p-1.5 text-slate-400 hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Summary */}
          <div className="p-4 bg-[#0F172A] border border-[#334155] rounded-xl flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="text-slate-400">Clips en secuencia</span>
              <div className="text-sm font-bold text-white font-mono tabular-time">
                {orderedClips.length} {orderedClips.length === 1 ? 'clip' : 'clips'}
              </div>
            </div>

            <div className="space-y-0.5 text-right">
              <span className="text-slate-400">Duración total estimada</span>
              <div className="text-sm font-bold text-[#3B82F6] font-mono tabular-time">
                {totalDuration.toFixed(1)} segundos
              </div>
            </div>
          </div>

          {/* Batch Progress */}
          {isRendering && (
            <div className="p-4 bg-[#0F172A] border border-[#3B82F6]/50 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-white">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-[#3B82F6] animate-spin" />
                  <span>
                    Procesando clip {currentClipIndex} de {orderedClips.length}...
                  </span>
                </span>
                <span className="font-mono tabular-time text-sm text-[#3B82F6]">{progress}%</span>
              </div>

              <div className="w-full h-2.5 bg-[#1E293B] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#3B82F6] transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-400 font-mono truncate">
                {currentClipTitle || 'Extrayendo fotogramas y audio...'}
              </p>
            </div>
          )}

          {/* Success */}
          {outputBlobUrl && !isRendering && (
            <div className="p-4 bg-[#10B981]/15 border border-[#10B981]/50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3 text-[#10B981] font-semibold">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <div>
                  <div className="text-white text-sm">Vídeo generado con éxito</div>
                  <div className="text-slate-300 font-normal">
                    Archivo <span className="font-mono text-[#10B981]">{defaultFilename}</span> descargado.
                  </div>
                </div>
              </div>

              <a
                href={outputBlobUrl}
                download={defaultFilename}
                className="px-4 py-2 bg-[#10B981] hover:bg-emerald-400 text-[#0F172A] font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar MP4</span>
              </a>
            </div>
          )}

          {/* Error */}
          {errorMsg && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Sequence List */}
          <div>
            <div className="text-xs font-semibold text-slate-300 mb-2.5 flex items-center justify-between">
              <span>Orden de los clips ({orderedClips.length})</span>
              <span className="text-[11px] text-slate-400">
                Usa las flechas para reordenar
              </span>
            </div>

            {orderedClips.length === 0 ? (
              <div className="p-6 text-center bg-[#0F172A] border border-dashed border-[#334155] rounded-xl text-xs text-slate-400">
                No hay clips en esta categoría todavía.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {orderedClips.map((clip, idx) => (
                  <div
                    key={clip.id}
                    className="p-2.5 bg-[#0F172A] border border-[#334155] rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono tabular-time font-semibold text-slate-400 text-xs w-6">
                        #{idx + 1}
                      </span>

                      {clip.thumbnailUrl ? (
                        <img
                          src={clip.thumbnailUrl}
                          alt={clip.title}
                          className="w-14 h-8 object-cover rounded bg-[#1E293B] shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-8 rounded bg-[#1E293B] flex items-center justify-center shrink-0">
                          <Film className="w-3.5 h-3.5 text-slate-500" />
                        </div>
                      )}

                      <div className="truncate">
                        <div className="text-white font-medium truncate text-xs">
                          {clip.title}
                        </div>
                        <div className="text-[11px] font-mono tabular-time text-slate-400">
                          {formatTimecodeShort(clip.startTime)} → {formatTimecodeShort(clip.endTime)} ({clip.duration.toFixed(1)}s)
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => moveClip(idx, 'up')}
                        disabled={idx === 0 || isRendering}
                        className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                        title="Subir orden"
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveClip(idx, 'down')}
                        disabled={idx === orderedClips.length - 1 || isRendering}
                        className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                        title="Bajar orden"
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeClipFromMontage(clip.id)}
                        disabled={isRendering}
                        className="p-1.5 text-slate-400 hover:text-rose-400 disabled:opacity-30 cursor-pointer"
                        title="Quitar de este montaje"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#0F172A] border-t border-[#334155] flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            disabled={isRendering}
            className="px-4 py-2 bg-[#1E293B] hover:bg-slate-700 border border-[#334155] text-slate-200 rounded-lg text-xs font-medium cursor-pointer"
          >
            Cerrar
          </button>

          <button
            onClick={handleStartConcatenation}
            disabled={isRendering || orderedClips.length === 0}
            className="px-5 py-2.5 bg-[#3B82F6] hover:bg-blue-500 disabled:bg-[#1E293B] disabled:text-slate-500 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/20 disabled:shadow-none transition-all cursor-pointer"
          >
            {isRendering ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generando vídeo ({progress}%)...</span>
              </>
            ) : (
              <>
                <Film className="w-4 h-4" />
                <span>Unir y Exportar Vídeo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
