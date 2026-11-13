import React from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { VolleyballFolder } from '../../types/manualTactical';

interface ClearClipsModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalClipsCount: number;
  activeFolder: VolleyballFolder;
  activeFolderClipsCount: number;
  onConfirmClearAll: () => void;
  onConfirmClearActiveFolder: () => void;
}

export const ClearClipsModal: React.FC<ClearClipsModalProps> = ({
  isOpen,
  onClose,
  totalClipsCount,
  activeFolder,
  activeFolderClipsCount,
  onConfirmClearAll,
  onConfirmClearActiveFolder
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020617]/80 backdrop-blur-xs">
      <div className="bg-[#1E293B] border border-[#334155] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-6 py-4 bg-[#0F172A] border-b border-[#334155] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-rose-500/20 text-rose-400 rounded-lg">
              <Trash2 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">
              Limpiar Clips Recortados
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-200 text-xs">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              Esta acción eliminará de forma permanente los clips seleccionados del análisis actual.
            </div>
          </div>

          <div className="text-xs text-slate-300 space-y-2">
            <div className="flex items-center justify-between p-3 bg-[#0F172A] border border-[#334155] rounded-xl">
              <span className="text-slate-400">Total de clips en el proyecto</span>
              <span className="font-mono tabular-time font-bold text-white text-sm">
                {totalClipsCount}
              </span>
            </div>
            {activeFolderClipsCount > 0 && (
              <div className="flex items-center justify-between p-3 bg-[#0F172A] border border-[#334155] rounded-xl">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <span>{activeFolder.icon}</span>
                  <span>Clips en {activeFolder.name}</span>
                </span>
                <span className="font-mono tabular-time font-bold text-[#F97316] text-sm">
                  {activeFolderClipsCount}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => {
                onConfirmClearAll();
                onClose();
              }}
              className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar todos los clips ({totalClipsCount})</span>
            </button>

            {activeFolderClipsCount > 0 && activeFolderClipsCount < totalClipsCount && (
              <button
                onClick={() => {
                  onConfirmClearActiveFolder();
                  onClose();
                }}
                className="w-full py-2.5 px-4 bg-[#0F172A] hover:bg-slate-800 text-slate-200 border border-[#334155] font-medium text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>{activeFolder.icon}</span>
                <span>
                  Vaciar solo {activeFolder.name} ({activeFolderClipsCount})
                </span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-full py-2 px-4 bg-transparent hover:bg-[#0F172A] text-slate-400 hover:text-white border border-[#334155] rounded-xl text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
