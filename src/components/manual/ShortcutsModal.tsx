import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const folderShortcuts = [
    { key: 'C', folder: 'Colocación', icon: '🏐', desc: 'Recorta (-1.5s / +2s) en Colocación' },
    { key: '4', folder: 'Ataque Z4', icon: '💥', desc: 'Recorta (-1.5s / +2s) en Zona 4' },
    { key: '3', folder: 'Ataque Z3', icon: '💥', desc: 'Recorta (-1.5s / +2s) en Zona 3' },
    { key: '2', folder: 'Ataque Z2', icon: '💥', desc: 'Recorta (-1.5s / +2s) en Zona 2' },
    { key: 'D', folder: 'Defensa', icon: '🛡️', desc: 'Recorta (-1.5s / +2s) en Defensa' },
    { key: 'R', folder: 'Recepción', icon: '📥', desc: 'Recorta (-1.5s / +2s) en Recepción' }
  ];

  const playbackShortcuts = [
    { key: 'Espacio', desc: 'Reproducir o pausar el vídeo' },
    { key: 'I', desc: 'Marcar punto de entrada [ IN ]' },
    { key: 'O', desc: 'Marcar punto de salida [ OUT ]' },
    { key: '← / →', desc: 'Retroceder o avanzar 5 segundos' },
    { key: 'Shift + ← / →', desc: 'Avanzar o retroceder 1 fotograma' },
    { key: 'J / L', desc: 'Salto rápido -5s / +5s' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020617]/80 backdrop-blur-xs">
      <div className="bg-[#1E293B] border border-[#334155] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 bg-[#0F172A] border-b border-[#334155] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-5 h-5 text-[#3B82F6]" />
            <h3 className="text-sm font-bold text-white">
              Atajos de Teclado en VoleyClip
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
          <div>
            <div className="text-xs font-semibold text-slate-200 mb-2.5 flex items-center justify-between">
              <span>Recorte Rápido por Categoría (-1.5s / +2.0s)</span>
              <span className="text-[11px] text-slate-400 font-mono">1 tecla</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {folderShortcuts.map((s) => (
                <div
                  key={s.key}
                  className="flex items-center justify-between p-3 bg-[#0F172A] border border-[#334155] rounded-xl"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base shrink-0">{s.icon}</span>
                    <div className="truncate">
                      <div className="text-xs font-semibold text-white">{s.folder}</div>
                      <div className="text-[11px] text-slate-400 truncate">{s.desc}</div>
                    </div>
                  </div>
                  <kbd className="px-2.5 py-1 bg-[#3B82F6] text-white font-mono text-xs font-bold rounded-md ml-2 shrink-0">
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-200 mb-2.5">
              Reproducción y Marcas IN / OUT
            </div>

            <div className="space-y-1.5">
              {playbackShortcuts.map((s) => (
                <div
                  key={s.key}
                  className="flex items-center justify-between px-3 py-2.5 bg-[#0F172A] border border-[#334155] rounded-xl"
                >
                  <span className="text-xs text-slate-200">{s.desc}</span>
                  <kbd className="px-2.5 py-0.5 bg-[#1E293B] border border-[#334155] text-slate-200 font-mono text-xs font-semibold rounded-md">
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-3.5 bg-[#0F172A] border-t border-[#334155] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#3B82F6] hover:bg-blue-500 text-white font-semibold text-xs rounded-lg cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
