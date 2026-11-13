import React, { useState, useRef } from 'react';
import {
  Film,
  Download,
  Trash2,
  Play,
  Pause,
  Repeat,
  Plus,
  MoveRight,
  Folder,
  Layers,
  Edit2,
  Check,
  Share2,
  Clock,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { VolleyballFolder, ManualTacticalClip } from '../../types/manualTactical';

interface FolderClipManagerProps {
  folders: VolleyballFolder[];
  activeFolderId: string;
  clips: ManualTacticalClip[];
  onSelectFolder: (folderId: string) => void;
  onAddFolder: (folder: VolleyballFolder) => void;
  onDeleteFolder?: (folderId: string) => void;
  onSelectClipToPlay: (clip: ManualTacticalClip) => void;
  onDeleteClip: (clipId: string) => void;
  onMoveClipToFolder: (clipId: string, targetFolderId: string) => void;
  onUpdateClipTitle: (clipId: string, newTitle: string) => void;
  onRequestMontageExport: (folderId: string) => void;
  onExportIndividualClip: (clip: ManualTacticalClip) => void;
}

export const FolderClipManager: React.FC<FolderClipManagerProps> = ({
  folders,
  activeFolderId,
  clips,
  onSelectFolder,
  onAddFolder,
  onDeleteFolder,
  onSelectClipToPlay,
  onDeleteClip,
  onMoveClipToFolder,
  onUpdateClipTitle,
  onRequestMontageExport,
  onExportIndividualClip
}) => {
  const activeFolder = folders.find((f) => f.id === activeFolderId) || folders[0];
  const folderClips = clips.filter((c) => c.folderId === activeFolderId);

  // Custom folder creation modal / state
  const [showAddFolderInput, setShowAddFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderIcon, setNewFolderIcon] = useState('⚡');

  // Title editing state
  const [editingClipId, setEditingClipId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState('');

  // Secondary loop preview state
  const [previewingClipId, setPreviewingClipId] = useState<string | null>(null);

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const newFolder: VolleyballFolder = {
      id: `folder_custom_${Date.now()}`,
      name: newFolderName.trim(),
      icon: newFolderIcon || '📁',
      color: '#3B82F6',
      isCustom: true
    };

    onAddFolder(newFolder);
    onSelectFolder(newFolder.id);
    setNewFolderName('');
    setShowAddFolderInput(false);
  };

  const startEditTitle = (clip: ManualTacticalClip) => {
    setEditingClipId(clip.id);
    setEditingTitleText(clip.title);
  };

  const saveEditTitle = (clipId: string) => {
    if (editingTitleText.trim()) {
      onUpdateClipTitle(clipId, editingTitleText.trim());
    }
    setEditingClipId(null);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 flex flex-col shadow-2xl select-none">
      {/* 1. VISUAL FOLDER TABS HEADER */}
      <div className="p-2.5 bg-neutral-950 border-b border-neutral-800">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800/60 mb-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white">
            <Layers className="w-4 h-4 text-amber-500" />
            <span>Carpetas de Clips de Voleibol</span>
          </div>

          <button
            onClick={() => setShowAddFolderInput(!showAddFolderInput)}
            className="flex items-center gap-1 text-[11px] px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Nueva Carpeta</span>
          </button>
        </div>

        {/* Custom Folder Creator Input */}
        {showAddFolderInput && (
          <form onSubmit={handleCreateFolder} className="p-2.5 mb-2 bg-neutral-900 border border-neutral-800 flex items-center gap-2 text-xs">
            <select
              value={newFolderIcon}
              onChange={(e) => setNewFolderIcon(e.target.value)}
              className="bg-neutral-950 border border-neutral-700 py-1 px-2 text-base text-white"
            >
              <option value="🏐">🏐</option>
              <option value="💥">💥</option>
              <option value="🛡️">🛡️</option>
              <option value="📥">📥</option>
              <option value="⚡">⚡</option>
              <option value="🎯">🎯</option>
              <option value="⭐">⭐</option>
              <option value="🔥">🔥</option>
            </select>

            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nombre de la carpeta (ej. Saques en Salto, Errores)..."
              className="flex-1 bg-neutral-950 border border-neutral-700 px-3 py-1 text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              autoFocus
            />

            <button
              type="submit"
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs"
            >
              Crear
            </button>
            <button
              type="button"
              onClick={() => setShowAddFolderInput(false)}
              className="px-2 py-1 text-neutral-400 hover:text-white text-xs"
            >
              ✕
            </button>
          </form>
        )}

        {/* Folder Tabs Buttons List */}
        <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-0.5">
          {folders.map((folder) => {
            const count = clips.filter((c) => c.folderId === folder.id).length;
            const isSelected = folder.id === activeFolderId;

            return (
              <button
                key={folder.id}
                onClick={() => onSelectFolder(folder.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-bold border transition-all ${
                  isSelected
                    ? 'bg-neutral-900 text-white border-amber-500 shadow-md ring-1 ring-amber-500/50'
                    : 'bg-neutral-950/70 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700'
                }`}
              >
                <span className="text-base">{folder.icon}</span>
                <span className="truncate">{folder.name}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    isSelected ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 🎬 HIGHLIGHTED ACTION BANNER: "GENERAR VÍDEO CON TODOS LOS CLIPS" */}
      <div className="p-3.5 bg-neutral-950 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3 shadow-inner">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{activeFolder.icon}</span>
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              Carpeta: {activeFolder.name}
              <span className="text-xs font-mono font-normal text-neutral-400">
                ({folderClips.length} {folderClips.length === 1 ? 'clip guardado' : 'clips guardados'})
              </span>
            </h3>
            <p className="text-[11px] text-neutral-400">
              {activeFolder.description || 'Clips tácticos clasificados para análisis'}
            </p>
          </div>
        </div>

        {/* Big CTA to Stitch and Export all Clips in this Folder */}
        <button
          onClick={() => onRequestMontageExport(activeFolder.id)}
          disabled={folderClips.length === 0}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:border-neutral-700 text-neutral-950 font-black text-xs flex items-center gap-2 border border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
          title={`Unir todos los ${folderClips.length} clips de esta carpeta en un único archivo de vídeo`}
        >
          <Film className="w-4 h-4" />
          <span>🎬 Generar vídeo con todos los clips ({folderClips.length})</span>
        </button>
      </div>

      {/* 3. VISUAL CLIPS GRID CARDS */}
      <div className="p-3.5 max-h-[580px] overflow-y-auto">
        {folderClips.length === 0 ? (
          <div className="text-center py-12 px-4 border-2 border-dashed border-neutral-800 rounded bg-neutral-950/40">
            <div className="text-3xl mb-2">{activeFolder.icon}</div>
            <div className="text-sm font-bold text-white mb-1">
              No hay clips en {activeFolder.name}
            </div>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto mb-4">
              Usa el reproductor superior y haz clic en <strong>"✂️ Recortar Clip [C]"</strong> o marca con <strong>[I]</strong> y <strong>[O]</strong> para guardar jugadas aquí.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {folderClips.map((clip, index) => {
              const isEditing = editingClipId === clip.id;
              const isPreviewing = previewingClipId === clip.id;

              return (
                <div
                  key={clip.id}
                  className="bg-neutral-950 border border-neutral-800 rounded-none overflow-hidden flex flex-col justify-between group hover:border-neutral-700 transition-all shadow-md"
                >
                  {/* Thumbnail & Video Preview Area */}
                  <div
                    onClick={() => {
                      onSelectClipToPlay(clip);
                      setPreviewingClipId(isPreviewing ? null : clip.id);
                    }}
                    className="relative aspect-video bg-neutral-900 cursor-pointer overflow-hidden group/thumb"
                  >
                    {clip.thumbnailUrl ? (
                      <img
                        src={clip.thumbnailUrl}
                        alt={clip.title}
                        className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-600 bg-neutral-950">
                        <Film className="w-8 h-8 opacity-40" />
                      </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                    {/* Index Badge */}
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/70 backdrop-blur-xs font-mono text-[10px] text-white font-bold border border-white/20">
                      #{index + 1}
                    </div>

                    {/* Duration Badge */}
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-amber-500 text-neutral-950 font-mono text-[10px] font-extrabold shadow">
                      {clip.duration.toFixed(1)}s
                    </div>

                    {/* Timecode interval */}
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/80 font-mono text-[10px] text-neutral-300">
                      {clip.startTime.toFixed(1)}s → {clip.endTime.toFixed(1)}s
                    </div>

                    {/* Hover Play Icon Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 bg-black/40 transition-opacity">
                      <div className="p-3 rounded-full bg-amber-500 text-neutral-950 shadow-lg">
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Card Content & Title */}
                  <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editingTitleText}
                            onChange={(e) => setEditingTitleText(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-700 px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                            autoFocus
                          />
                          <button
                            onClick={() => saveEditTitle(clip.id)}
                            className="p-1 bg-amber-500 text-neutral-950 hover:bg-amber-400"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-1.5">
                          <h4
                            onClick={() => onSelectClipToPlay(clip)}
                            className="text-xs font-bold text-white hover:text-amber-400 cursor-pointer line-clamp-2 leading-snug"
                          >
                            {clip.title}
                          </h4>
                          <button
                            onClick={() => startEditTitle(clip)}
                            className="text-neutral-500 hover:text-white p-0.5 shrink-0"
                            title="Renombrar clip"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {clip.notes && (
                        <p className="text-[11px] text-neutral-400 line-clamp-2 mt-1 italic">
                          {clip.notes}
                        </p>
                      )}
                    </div>

                    {/* Footer Controls: Move to Folder, Export, Delete */}
                    <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                      {/* Move Folder Dropdown */}
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-neutral-500">Mover:</span>
                        <select
                          value={clip.folderId}
                          onChange={(e) => onMoveClipToFolder(clip.id, e.target.value)}
                          className="bg-neutral-900 border border-neutral-700 text-neutral-300 text-[10px] py-0.5 px-1 focus:outline-none focus:border-amber-500"
                        >
                          {folders.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.icon} {f.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Individual Actions: Play Loop, Export, Delete */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onExportIndividualClip(clip)}
                          className="p-1.5 text-neutral-400 hover:text-emerald-400 hover:bg-neutral-900 transition-colors"
                          title="Descargar este clip individual"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onDeleteClip(clip.id)}
                          className="p-1.5 text-neutral-400 hover:text-rose-400 hover:bg-neutral-900 transition-colors"
                          title="Eliminar clip"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
