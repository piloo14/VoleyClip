import React, { useState } from 'react';
import {
  Scissors,
  Film,
  Download,
  Trash2,
  Play,
  Plus,
  Check,
  Edit2,
  Layers,
  Loader2,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  FileJson,
  SlidersHorizontal,
  PenTool,
  Clock
} from 'lucide-react';
import { VolleyballFolder, ManualTacticalClip } from '../../types/manualTactical';
import { concatenateClipsWithFFmpeg, sortClipsChronologically } from '../../utils/videoMontage';
import { formatTimecodeShort } from '../../utils/timecode';

interface TacticalRightSidebarProps {
  folders: VolleyballFolder[];
  activeFolderId: string;
  activeClipId?: string | null;
  clips: ManualTacticalClip[];
  videoSourceUrl: string;
  preRollSec: number;
  postRollSec: number;
  onSelectFolder: (folderId: string) => void;
  onAddFolder: (folder: VolleyballFolder) => void;
  onDeleteFolder?: (folderId: string) => void;
  onTriggerQuickCut: (folderId?: string) => void;
  onSelectClipToPlay: (clip: ManualTacticalClip) => void;
  onOpenClipTelestration?: (clip: ManualTacticalClip) => void;
  onDeleteClip: (clipId: string) => void;
  onMoveClipToFolder: (clipId: string, targetFolderId: string) => void;
  onReorderClipInFolder?: (clipId: string, direction: 'up' | 'down') => void;
  onUpdateClipTitle: (clipId: string, newTitle: string) => void;
  onUpdateClipNotes: (clipId: string, notes: string) => void;
  onUpdateClipTimes?: (clipId: string, startTime: number, endTime: number) => void;
  onOpenMontageModal: (folderId: string) => void;
  onExportIndividualClip: (clip: ManualTacticalClip) => void;
  onClearFolderClips?: (folderId: string) => void;
  onOpenClearModal?: () => void;
  onExportBackup?: () => void;
  onOpenBackupModal?: () => void;
}

export const TacticalRightSidebar: React.FC<TacticalRightSidebarProps> = ({
  folders,
  activeFolderId,
  activeClipId = null,
  clips,
  videoSourceUrl,
  preRollSec,
  postRollSec,
  onSelectFolder,
  onAddFolder,
  onTriggerQuickCut,
  onSelectClipToPlay,
  onOpenClipTelestration,
  onDeleteClip,
  onMoveClipToFolder,
  onReorderClipInFolder,
  onUpdateClipTitle,
  onUpdateClipNotes,
  onUpdateClipTimes,
  onOpenMontageModal,
  onExportIndividualClip,
  onClearFolderClips,
  onOpenClearModal,
  onOpenBackupModal
}) => {
  const activeFolder = folders.find((f) => f.id === activeFolderId) || folders[0];
  const activeFolderClips = sortClipsChronologically(
    clips.filter((c) => c.folderId === activeFolderId)
  );
  const totalFolderDuration = activeFolderClips.reduce((acc, c) => acc + c.duration, 0);

  // New Folder creation state
  const [showAddFolderInput, setShowAddFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderIcon, setNewFolderIcon] = useState('⚡');
  const [newFolderKey, setNewFolderKey] = useState('');

  // Title & Time editing state
  const [editingClipId, setEditingClipId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState('');
  const [editingTimesClipId, setEditingTimesClipId] = useState<string | null>(null);

  // Sidebar Inline Concatenation Rendering State
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [currentRenderingClipIdx, setCurrentRenderingClipIdx] = useState(0);
  const [renderingClipTitle, setRenderingClipTitle] = useState('');
  const [renderSuccessBlobUrl, setRenderSuccessBlobUrl] = useState<string | null>(null);
  const [sidebarError, setSidebarError] = useState<string | null>(null);

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const newFolder: VolleyballFolder = {
      id: `folder_custom_${Date.now()}`,
      name: newFolderName.trim(),
      icon: newFolderIcon || '📁',
      color: '#3B82F6',
      shortcutKey: newFolderKey.trim() ? newFolderKey.trim().toUpperCase() : undefined,
      isCustom: true
    };

    onAddFolder(newFolder);
    onSelectFolder(newFolder.id);
    setNewFolderName('');
    setNewFolderKey('');
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

  React.useEffect(() => {
    return () => {
      if (renderSuccessBlobUrl) URL.revokeObjectURL(renderSuccessBlobUrl);
    };
  }, [renderSuccessBlobUrl]);

  // Direct In-Sidebar Montage Concatenation
  const handleStartSidebarMontage = async () => {
    if (activeFolderClips.length === 0 || isRendering) return;
    if (!videoSourceUrl) {
      setSidebarError('Sube primero el vídeo de tu partido para exportar.');
      return;
    }

    setIsRendering(true);
    setRenderProgress(10);
    setSidebarError(null);
    setRenderSuccessBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setRenderingClipTitle('Preparando clips para exportación...');

    const targetFilename = `VoleyClip_${activeFolder.name.replace(/\s+/g, '_')}.mp4`;

    const clipsToJoin = sortClipsChronologically(activeFolderClips);

    try {
      const blobUrl = await concatenateClipsWithFFmpeg(
        videoSourceUrl,
        clipsToJoin,
        (currentIdx, _total, percent, title) => {
          setCurrentRenderingClipIdx(currentIdx);
          setRenderProgress(percent);
          setRenderingClipTitle(title);
        },
        targetFilename
      );

      setRenderSuccessBlobUrl(blobUrl);
      setRenderProgress(100);
    } catch (err: any) {
      console.error('Error al generar montaje:', err);
      setSidebarError(err?.message || 'Error al unir los clips de vídeo.');
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <aside className="h-full flex flex-col bg-[#1E293B] border border-[#334155] rounded-xl shadow-xl select-none overflow-hidden">
      {/* 1. TOP QUICK CUT CTA */}
      <div className="p-3.5 bg-[#0F172A]/85 border-b border-[#334155] space-y-2 shrink-0">
        <button
          onClick={() => onTriggerQuickCut(activeFolder.id)}
          className="w-full py-2.5 px-4 bg-[#F97316] hover:bg-orange-500 active:scale-[0.99] text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 transition-all cursor-pointer whitespace-nowrap"
          title={`Recortar en ${activeFolder.name} (-${preRollSec}s / +${postRollSec}s)`}
        >
          <Scissors className="w-4 h-4 shrink-0" />
          <span>Recortar Clip en {activeFolder.name}</span>
          <kbd className="ml-1 px-1.5 py-0.5 bg-black/25 text-white font-mono text-[10px] rounded">
            {activeFolder.shortcutKey || 'C'}
          </kbd>
        </button>

        <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
          <span className="font-mono tabular-time">
            Ventana: -{preRollSec}s / +{postRollSec}s
          </span>
          <span className="truncate max-w-[160px] text-slate-300 font-medium">
            {activeFolder.icon} {activeFolder.name}
          </span>
        </div>
      </div>

      {/* 2. TACTICAL FOLDERS SELECTOR */}
      <div className="p-3 bg-[#0F172A]/45 border-b border-[#334155] shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>Categorías de Juego</span>
          </span>

          <div className="flex items-center gap-2">
            {onOpenBackupModal && (
              <button
                onClick={onOpenBackupModal}
                className="text-[11px] text-slate-400 hover:text-[#3B82F6] flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                title="Respaldo y restauración JSON"
              >
                <FileJson className="w-3.5 h-3.5" />
                <span>JSON</span>
              </button>
            )}
            <button
              onClick={() => setShowAddFolderInput(!showAddFolderInput)}
              className="text-[11px] text-slate-300 hover:text-white bg-[#1E293B] border border-[#334155] hover:border-slate-500 flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
              title="Crear nueva categoría"
            >
              <Plus className="w-3 h-3 text-[#3B82F6]" />
              <span>Nueva</span>
            </button>
          </div>
        </div>

        {/* Custom Folder Form */}
        {showAddFolderInput && (
          <form
            onSubmit={handleCreateFolder}
            className="p-2 mb-2.5 bg-[#0F172A] border border-[#334155] rounded-lg flex items-center gap-1.5 text-xs"
          >
            <select
              value={newFolderIcon}
              onChange={(e) => setNewFolderIcon(e.target.value)}
              className="bg-[#1E293B] border border-[#334155] rounded py-1 px-1 text-sm text-white"
            >
              <option value="🏐">🏐</option>
              <option value="💥">💥</option>
              <option value="🛡️">🛡️</option>
              <option value="📥">📥</option>
              <option value="⚡">⚡</option>
              <option value="🎯">🎯</option>
              <option value="⭐">⭐</option>
            </select>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nombre..."
              className="flex-1 min-w-0 bg-[#1E293B] border border-[#334155] rounded px-2 py-1 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#3B82F6]"
              autoFocus
            />
            <input
              type="text"
              maxLength={1}
              value={newFolderKey}
              onChange={(e) => setNewFolderKey(e.target.value)}
              placeholder="Tecla"
              className="w-11 bg-[#1E293B] border border-[#334155] rounded px-1 py-1 text-center text-[#3B82F6] font-mono font-bold text-xs uppercase"
              title="Tecla de atajo"
            />
            <button
              type="submit"
              className="px-2.5 py-1 bg-[#3B82F6] hover:bg-blue-500 text-white font-semibold rounded text-xs cursor-pointer"
            >
              Crear
            </button>
          </form>
        )}

        {/* Folders Grid */}
        <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-0.5">
          {folders.map((folder) => {
            const count = clips.filter((c) => c.folderId === folder.id).length;
            const isSelected = folder.id === activeFolderId;

            return (
              <button
                key={folder.id}
                onClick={() => onSelectFolder(folder.id)}
                className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs border transition-all text-left cursor-pointer ${
                  isSelected
                    ? 'bg-[#3B82F6]/15 text-white border-[#3B82F6]'
                    : 'bg-[#0F172A]/70 text-slate-300 border-[#334155] hover:bg-[#0F172A] hover:text-white'
                }`}
                title={`Pulsa [${folder.shortcutKey || ''}] para recortar en ${folder.name}`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm shrink-0">{folder.icon}</span>
                  <span className="truncate font-medium text-[11px]">{folder.name}</span>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-1">
                  {folder.shortcutKey && (
                    <kbd
                      className={`text-[10px] font-mono font-semibold px-1 py-0.2 rounded ${
                        isSelected
                          ? 'bg-[#3B82F6] text-white'
                          : 'bg-[#1E293B] text-slate-300 border border-[#334155]'
                      }`}
                    >
                      {folder.shortcutKey}
                    </kbd>
                  )}
                  <span className="text-[11px] font-mono tabular-time text-slate-400">
                    {count}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. CLIP QUEUE HEADER */}
      <div className="px-3.5 py-2.5 bg-[#0F172A]/60 border-b border-[#334155] flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-white truncate">
            Cola: {activeFolder.name}
          </span>
          <span className="text-slate-400 font-mono tabular-time text-[11px] shrink-0">
            {activeFolderClips.length} · {totalFolderDuration.toFixed(1)}s
          </span>
        </div>

        {activeFolderClips.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onOpenMontageModal(activeFolder.id)}
              className="text-[11px] text-[#3B82F6] hover:text-blue-400 flex items-center gap-1 cursor-pointer font-medium"
              title="Abrir vista completa de secuencia"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Secuencia</span>
            </button>
            <button
              onClick={() =>
                onOpenClearModal
                  ? onOpenClearModal()
                  : onClearFolderClips && onClearFolderClips(activeFolder.id)
              }
              className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1"
              title={`Vaciar clips de ${activeFolder.name}`}
            >
              <Trash2 className="w-3 h-3" />
              <span>Vaciar</span>
            </button>
          </div>
        )}
      </div>

      {/* CLIP QUEUE CARDS */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-[200px]">
        {activeFolderClips.length === 0 ? (
          <div className="py-10 px-4 text-center border border-dashed border-[#334155] rounded-xl bg-[#0F172A]/40">
            <div className="w-10 h-10 rounded-xl bg-[#1E293B] border border-[#334155] flex items-center justify-center mx-auto mb-3 text-lg">
              {activeFolder.icon}
            </div>
            <div className="text-xs font-semibold text-white mb-1">
              Sin clips en {activeFolder.name}
            </div>
            <p className="text-[11px] text-slate-400 max-w-[220px] mx-auto leading-relaxed">
              Pulsa{' '}
              <kbd className="px-1.5 py-0.5 bg-[#1E293B] border border-[#334155] text-[#3B82F6] font-mono rounded">
                {activeFolder.shortcutKey || 'C'}
              </kbd>{' '}
              o usa los botones <strong className="text-slate-200">[ IN / OUT ]</strong> para añadir jugadas a esta cola.
            </p>
          </div>
        ) : (
          activeFolderClips.map((clip, index) => {
            const isEditing = editingClipId === clip.id;
            const isActiveClip = activeClipId === clip.id;
            const drawingCount = clip.telestrations?.length || 0;

            return (
              <div
                key={clip.id}
                className={`bg-[#0F172A] border rounded-xl overflow-hidden flex flex-col transition-colors group ${
                  isActiveClip
                    ? 'border-[#3B82F6] ring-1 ring-[#3B82F6]/40'
                    : 'border-[#334155] hover:border-slate-500'
                }`}
              >
                {/* Thumbnail Preview */}
                <div
                  onClick={() => onSelectClipToPlay(clip)}
                  className="relative aspect-video bg-[#020617] cursor-pointer overflow-hidden group/thumb"
                >
                  {clip.thumbnailUrl ? (
                    <img
                      src={clip.thumbnailUrl}
                      alt={clip.title}
                      className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                      <Film className="w-6 h-6 opacity-50" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/30 pointer-events-none" />

                  {/* Order & Duration */}
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-[#0F172A]/85 border border-[#334155] rounded font-mono tabular-time text-[10px] text-white font-semibold">
                    #{index + 1}
                  </div>

                  <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-[#3B82F6] text-white rounded font-mono tabular-time text-[10px] font-semibold shadow">
                    {clip.duration.toFixed(1)}s
                  </div>

                  {/* Timecode Range */}
                  <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-[#0F172A]/85 rounded font-mono tabular-time text-[10px] text-slate-200">
                    {formatTimecodeShort(clip.startTime)} → {formatTimecodeShort(clip.endTime)}
                  </div>

                  {/* Saved Drawing Indicator */}
                  {drawingCount > 0 && (
                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-[#F97316] text-white rounded font-mono tabular-time text-[10px] font-semibold flex items-center gap-1 shadow">
                      <PenTool className="w-2.5 h-2.5" />
                      <span>{drawingCount}</span>
                    </div>
                  )}

                  {/* Preview Hover Button */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 bg-black/35 transition-opacity">
                    <div className="w-10 h-10 rounded-full bg-[#3B82F6] text-white flex items-center justify-center shadow-lg">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Card Details & Actions */}
                <div className="p-3 space-y-2">
                  {/* Title / Inline Rename */}
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={editingTitleText}
                        onChange={(e) => setEditingTitleText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditTitle(clip.id);
                          if (e.key === 'Escape') setEditingClipId(null);
                        }}
                        className="w-full bg-[#1E293B] border border-[#3B82F6] rounded-md px-2 py-1 text-xs text-white focus:outline-none font-medium"
                        autoFocus
                      />
                      <button
                        onClick={() => saveEditTitle(clip.id)}
                        className="p-1.5 bg-[#10B981] text-white rounded-md hover:bg-emerald-500 cursor-pointer"
                        title="Guardar nombre"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <h4
                        onClick={() => onSelectClipToPlay(clip)}
                        className="text-xs font-semibold text-slate-100 hover:text-[#3B82F6] cursor-pointer truncate"
                      >
                        {clip.title}
                      </h4>
                      <button
                        onClick={() => startEditTitle(clip)}
                        className="text-slate-400 hover:text-white p-1 shrink-0 cursor-pointer"
                        title="Renombrar clip"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Quick Note */}
                  <input
                    type="text"
                    defaultValue={clip.notes || ''}
                    onBlur={(e) => onUpdateClipNotes(clip.id, e.target.value)}
                    placeholder="Nota rápida (ej. bloqueo doble, zaguero)..."
                    className="w-full bg-[#1E293B] border border-[#334155] focus:border-[#3B82F6] rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none transition-colors"
                  />

                  {/* Manual IN / OUT Time Fine-Tuner Drawer */}
                  {editingTimesClipId === clip.id && onUpdateClipTimes && (
                    <div className="p-2 bg-[#1E293B] border border-[#334155] rounded-lg grid grid-cols-2 gap-2 text-[10px]">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[#10B981] font-mono font-semibold">IN</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateClipTimes(
                                clip.id,
                                Math.max(0, +(clip.startTime - 0.5).toFixed(2)),
                                clip.endTime
                              )
                            }
                            className="px-1.5 py-0.5 bg-[#0F172A] border border-[#334155] rounded text-slate-200 hover:text-white font-mono cursor-pointer"
                          >
                            -0.5
                          </button>
                          <span className="font-mono tabular-time text-white">
                            {formatTimecodeShort(clip.startTime)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateClipTimes(
                                clip.id,
                                Math.min(clip.endTime - 0.3, +(clip.startTime + 0.5).toFixed(2)),
                                clip.endTime
                              )
                            }
                            className="px-1.5 py-0.5 bg-[#0F172A] border border-[#334155] rounded text-slate-200 hover:text-white font-mono cursor-pointer"
                          >
                            +0.5
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[#F97316] font-mono font-semibold">OUT</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateClipTimes(
                                clip.id,
                                clip.startTime,
                                Math.max(clip.startTime + 0.3, +(clip.endTime - 0.5).toFixed(2))
                              )
                            }
                            className="px-1.5 py-0.5 bg-[#0F172A] border border-[#334155] rounded text-slate-200 hover:text-white font-mono cursor-pointer"
                          >
                            -0.5
                          </button>
                          <span className="font-mono tabular-time text-white">
                            {formatTimecodeShort(clip.endTime)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateClipTimes(
                                clip.id,
                                clip.startTime,
                                +(clip.endTime + 0.5).toFixed(2)
                              )
                            }
                            className="px-1.5 py-0.5 bg-[#0F172A] border border-[#334155] rounded text-slate-200 hover:text-white font-mono cursor-pointer"
                          >
                            +0.5
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quick Actions Row: Reorder, Preview, Move Folder, Download, Delete */}
                  <div className="pt-2 border-t border-[#334155]/70 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {onReorderClipInFolder && (
                        <>
                          <button
                            onClick={() => onReorderClipInFolder(clip.id, 'up')}
                            disabled={index === 0}
                            className="p-1.5 rounded-md bg-[#1E293B] border border-[#334155] text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
                            title="Mover arriba en la cola"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => onReorderClipInFolder(clip.id, 'down')}
                            disabled={index === activeFolderClips.length - 1}
                            className="p-1.5 rounded-md bg-[#1E293B] border border-[#334155] text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
                            title="Mover abajo en la cola"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </>
                      )}

                      <select
                        value={clip.folderId}
                        onChange={(e) => onMoveClipToFolder(clip.id, e.target.value)}
                        className="bg-[#1E293B] border border-[#334155] rounded-md text-slate-300 text-[10px] py-1 px-1.5 focus:outline-none focus:border-[#3B82F6] max-w-[105px] truncate"
                        title="Mover clip a otra categoría"
                      >
                        {folders.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.icon} {f.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {onUpdateClipTimes && (
                        <button
                          onClick={() =>
                            setEditingTimesClipId((curr) => (curr === clip.id ? null : clip.id))
                          }
                          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                            editingTimesClipId === clip.id
                              ? 'text-[#3B82F6] bg-[#3B82F6]/15'
                              : 'text-slate-300 hover:text-[#3B82F6] hover:bg-[#1E293B]'
                          }`}
                          title="Ajustar tiempos IN / OUT manualmente"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onOpenClipTelestration && (
                        <button
                          onClick={() => onOpenClipTelestration(clip)}
                          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                            drawingCount > 0
                              ? 'text-[#F97316] bg-[#F97316]/15 hover:bg-[#F97316]/25'
                              : 'text-slate-300 hover:text-[#F97316] hover:bg-[#1E293B]'
                          }`}
                          title="Dibujar trayectorias o posiciones sobre este clip"
                        >
                          <PenTool className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => onSelectClipToPlay(clip)}
                        className="p-1.5 rounded-md text-slate-300 hover:text-[#3B82F6] hover:bg-[#1E293B] transition-colors cursor-pointer"
                        title="Previsualizar jugada"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onExportIndividualClip(clip)}
                        className="p-1.5 rounded-md text-slate-300 hover:text-[#10B981] hover:bg-[#1E293B] transition-colors cursor-pointer"
                        title="Descargar este clip (.mp4)"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteClip(clip.id)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-[#1E293B] transition-colors cursor-pointer"
                        title="Eliminar clip"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. PINNED PRIMARY EXPORT ACTION BAR */}
      <div className="p-3.5 bg-[#0F172A] border-t border-[#334155] shrink-0 space-y-2.5">
        {/* Batch Progress Bar */}
        {isRendering && (
          <div className="p-3 bg-[#1E293B] border border-[#3B82F6]/40 rounded-xl space-y-2 text-xs">
            <div className="flex items-center justify-between font-semibold text-slate-100">
              <span className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 text-[#3B82F6] animate-spin" />
                <span>
                  Procesando {currentRenderingClipIdx} de {activeFolderClips.length}
                </span>
              </span>
              <span className="font-mono tabular-time text-[#3B82F6]">{renderProgress}%</span>
            </div>
            <div className="w-full h-2 bg-[#0F172A] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#3B82F6] transition-all duration-200 rounded-full"
                style={{ width: `${renderProgress}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 font-mono truncate">
              {renderingClipTitle || 'Procesando vídeo a 30 FPS...'}
            </p>
          </div>
        )}

        {/* Error Banner */}
        {sidebarError && !isRendering && (
          <div className="p-2.5 bg-rose-500/15 border border-rose-500/40 rounded-lg flex items-center justify-between gap-2 text-[11px] text-rose-300">
            <span className="truncate">{sidebarError}</span>
            <button
              onClick={() => setSidebarError(null)}
              className="text-[11px] underline hover:text-white shrink-0 cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Completed State (Emerald #10B981) */}
        {renderSuccessBlobUrl && !isRendering && (
          <div className="p-3 bg-[#10B981]/15 border border-[#10B981]/50 rounded-xl flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between text-[#10B981] font-semibold">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Vídeo listo a 30 FPS</span>
              </span>
              <span className="font-mono tabular-time text-[11px]">100%</span>
            </div>
            <a
              href={renderSuccessBlobUrl}
              download={`VoleyClip_${activeFolder.name.replace(/\s+/g, '_')}.mp4`}
              className="w-full py-2 px-3 bg-[#10B981] hover:bg-emerald-400 text-[#0F172A] font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Descargar MP4</span>
            </a>
          </div>
        )}

        {/* Main Fixed Export Button */}
        <button
          onClick={handleStartSidebarMontage}
          disabled={activeFolderClips.length === 0 || isRendering}
          className="w-full py-2.5 px-4 bg-[#3B82F6] hover:bg-blue-500 disabled:bg-[#1E293B] disabled:text-slate-500 disabled:border disabled:border-[#334155] text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:shadow-none transition-all cursor-pointer whitespace-nowrap"
          title={`Unir los ${activeFolderClips.length} clips de ${activeFolder.name} en MP4`}
        >
          {isRendering ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Exportando ({renderProgress}%)...</span>
            </>
          ) : (
            <>
              <Film className="w-4 h-4" />
              <span>Unir y Exportar Vídeo ({activeFolderClips.length})</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
