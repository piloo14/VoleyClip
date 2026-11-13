import React, { useRef, useState } from 'react';
import {
  X,
  FileJson,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Layers,
  Scissors
} from 'lucide-react';
import { VolleyballFolder, ManualTacticalClip } from '../../types/manualTactical';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: VolleyballFolder[];
  clips: ManualTacticalClip[];
  videoTitle: string;
  onExportBackup: () => void;
  onImportBackup: (backupData: { folders: VolleyballFolder[]; clips: ManualTacticalClip[] }) => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  folders,
  clips,
  onExportBackup,
  onImportBackup
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importStatus, setImportStatus] = useState<{
    type: 'idle' | 'success' | 'error';
    message: string;
  }>({ type: 'idle', message: '' });

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);

        if (!Array.isArray(data.folders) || !Array.isArray(data.clips)) {
          setImportStatus({
            type: 'error',
            message: 'El archivo JSON no contiene listas válidas de carpetas y clips.'
          });
          return;
        }

        onImportBackup({
          folders: data.folders,
          clips: data.clips
        });

        setImportStatus({
          type: 'success',
          message: `Copia restaurada: ${data.clips.length} clips en ${data.folders.length} categorías.`
        });

        setTimeout(() => {
          onClose();
        }, 1400);
      } catch {
        setImportStatus({
          type: 'error',
          message: 'Error al leer el archivo JSON: formato no válido.'
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#020617]/80 backdrop-blur-xs">
      <div className="bg-[#1E293B] border border-[#334155] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="px-6 py-4 bg-[#0F172A] border-b border-[#334155] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#3B82F6]/20 text-[#3B82F6] rounded-lg">
              <HardDrive className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">
              Copia de Seguridad (JSON)
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
          <p className="text-xs text-slate-300 leading-relaxed">
            Guarda tus categorías, marcas de tiempo y notas tácticas en un archivo JSON local para respaldar o compartir tu análisis.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 bg-[#0F172A] border border-[#334155] rounded-xl text-xs">
              <Layers className="w-4 h-4 text-[#3B82F6]" />
              <div>
                <div className="text-slate-400 text-[11px]">Categorías</div>
                <div className="font-bold text-white font-mono tabular-time">
                  {folders.length}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-[#0F172A] border border-[#334155] rounded-xl text-xs">
              <Scissors className="w-4 h-4 text-[#F97316]" />
              <div>
                <div className="text-slate-400 text-[11px]">Clips</div>
                <div className="font-bold text-white font-mono tabular-time">
                  {clips.length}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-[#0F172A] border border-[#334155] rounded-xl space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <FileJson className="w-4 h-4 text-[#3B82F6]" />
                <span>Exportar Configuración de Clips</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">.json</span>
            </div>
            <button
              onClick={onExportBackup}
              className="w-full py-2.5 px-4 bg-[#3B82F6] hover:bg-blue-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Archivo JSON</span>
            </button>
          </div>

          <div className="p-4 bg-[#0F172A] border border-[#334155] rounded-xl space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-[#10B981]" />
                <span>Restaurar desde Archivo JSON</span>
              </span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json,application/json"
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-4 bg-[#1E293B] hover:bg-slate-700 text-slate-200 border border-[#334155] font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <FileJson className="w-4 h-4 text-[#10B981]" />
              <span>Seleccionar Archivo JSON</span>
            </button>

            {importStatus.message && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  importStatus.type === 'success'
                    ? 'bg-[#10B981]/15 border border-[#10B981]/40 text-emerald-200'
                    : 'bg-rose-500/15 border border-rose-500/40 text-rose-200'
                }`}
              >
                {importStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{importStatus.message}</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-3.5 bg-[#0F172A] border-t border-[#334155] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1E293B] hover:bg-slate-700 border border-[#334155] text-slate-200 font-medium text-xs rounded-lg cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
