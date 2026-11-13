import React, { useState } from 'react';
import {
  Star,
  Play,
  Volume2,
  Edit2,
  Trash2,
  Share2,
  Tag,
  Search,
  Filter,
  Plus,
  Tv,
  Check,
  Sparkles
} from 'lucide-react';
import { MatchPeriod, TacticalClip } from '../../types/tactical';

interface ClipManagerProps {
  clips: TacticalClip[];
  periods: MatchPeriod[];
  availableTags: string[];
  activeClipId: string | null;
  onSelectClip: (clip: TacticalClip) => void;
  onToggleFavorite: (clipId: string) => void;
  onDeleteClip: (clipId: string) => void;
  onUpdateClip: (clip: TacticalClip) => void;
  onAddCustomTag: (tag: string) => void;
  onOpenTechnicalTalk: () => void;
  onOpenExportModal: (clip?: TacticalClip) => void;
  onOpenWhatsAppShare: (clip: TacticalClip) => void;
}

export const ClipManager: React.FC<ClipManagerProps> = ({
  clips,
  periods,
  availableTags,
  activeClipId,
  onSelectClip,
  onToggleFavorite,
  onDeleteClip,
  onUpdateClip,
  onAddCustomTag,
  onOpenTechnicalTalk,
  onOpenExportModal,
  onOpenWhatsAppShare
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'favorites'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  const [showTagCreator, setShowTagCreator] = useState(false);
  const [editingClip, setEditingClip] = useState<TacticalClip | null>(null);

  // Filter logic
  const filteredClips = clips.filter((clip) => {
    if (filterMode === 'favorites' && !clip.isFavorite) return false;
    if (selectedTag && !clip.tags.includes(selectedTag)) return false;
    if (selectedPeriod && clip.periodId !== selectedPeriod) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = clip.title.toLowerCase().includes(q);
      const matchNotes = clip.notes.toLowerCase().includes(q);
      const matchTags = clip.tags.some((t) => t.toLowerCase().includes(q));
      const matchPlayers = clip.lowerThird?.players?.toLowerCase().includes(q);
      if (!matchTitle && !matchNotes && !matchTags && !matchPlayers) return false;
    }
    return true;
  });

  const favoriteCount = clips.filter((c) => c.isFavorite).length;

  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTagInput.trim()) {
      onAddCustomTag(newTagInput.trim());
      setSelectedTag(newTagInput.trim());
      setNewTagInput('');
      setShowTagCreator(false);
    }
  };

  const handleSaveClipEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClip) {
      onUpdateClip(editingClip);
      setEditingClip(null);
    }
  };

  const toggleTagOnEditingClip = (tag: string) => {
    if (!editingClip) return;
    const exists = editingClip.tags.includes(tag);
    const updatedTags = exists
      ? editingClip.tags.filter((t) => t !== tag)
      : [...editingClip.tags, tag];
    setEditingClip({ ...editingClip, tags: updatedTags });
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 flex flex-col h-full">
      {/* Header & Primary Filter Switches */}
      <div className="p-3 border-b border-neutral-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Jugadas y Cortes
            </span>
            <span className="text-xs font-mono text-neutral-400 tabular-nums">
              ({filteredClips.length}/{clips.length})
            </span>
          </div>

          {/* Technical Talk Button */}
          <button
            onClick={onOpenTechnicalTalk}
            disabled={favoriteCount === 0}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed text-neutral-950 px-3 py-1 text-xs font-bold transition-colors shadow-sm"
            title="Iniciar presentación consecutiva de las jugadas marcadas con estrella"
          >
            <Tv className="w-3.5 h-3.5" />
            Charla Técnica ({favoriteCount})
          </button>
        </div>

        {/* View Switch: All vs "Mi Selección" */}
        <div className="flex items-center gap-1 bg-neutral-950 p-1 border border-neutral-800">
          <button
            onClick={() => setFilterMode('all')}
            className={`flex-1 py-1 text-xs font-semibold transition-colors ${
              filterMode === 'all'
                ? 'bg-neutral-800 text-white shadow-xs'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Todas las Jugadas ({clips.length})
          </button>
          <button
            onClick={() => setFilterMode('favorites')}
            className={`flex-1 py-1 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              filterMode === 'favorites'
                ? 'bg-amber-500 text-neutral-950 shadow-xs'
                : 'text-neutral-400 hover:text-amber-400'
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-current" />
            Mi Selección ({favoriteCount})
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por jugada, nota, jugador..."
            className="w-full bg-neutral-950 border border-neutral-800 pl-8 pr-3 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Quick Tag Filter Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-neutral-400">
            <span className="flex items-center gap-1">
              <Tag className="w-3 h-3 text-neutral-500" />
              Filtrar por Etiqueta:
            </span>
            <button
              onClick={() => setShowTagCreator(!showTagCreator)}
              className="text-amber-400 hover:text-amber-300 flex items-center gap-0.5"
            >
              <Plus className="w-3 h-3" />
              Nueva
            </button>
          </div>

          {showTagCreator && (
            <form onSubmit={handleCreateTag} className="flex gap-1 pt-1">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                placeholder="Nombre de etiqueta..."
                className="flex-1 bg-neutral-950 border border-neutral-700 text-xs px-2 py-0.5 text-white focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold px-2.5 py-0.5"
              >
                Añadir
              </button>
            </form>
          )}

          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pt-0.5">
            <button
              onClick={() => setSelectedTag(null)}
              className={`text-[10px] px-2 py-0.5 border transition-colors ${
                selectedTag === null
                  ? 'bg-white text-neutral-950 font-bold border-white'
                  : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
              }`}
            >
              Todas
            </button>
            {availableTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`text-[10px] px-2 py-0.5 border transition-colors ${
                  selectedTag === tag
                    ? 'bg-amber-500 text-neutral-950 font-bold border-amber-400'
                    : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Clips List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredClips.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 space-y-2">
            <p className="text-xs">No hay jugadas con los filtros seleccionados.</p>
            <p className="text-[11px] text-neutral-600">
              Marca puntos In y Out en el reproductor para guardar tu primer corte táctico.
            </p>
          </div>
        ) : (
          filteredClips.map((clip) => {
            const isCurrent = clip.id === activeClipId;
            const durationSec = clip.endTime - clip.startTime;
            const period = periods.find((p) => p.id === clip.periodId);

            return (
              <div
                key={clip.id}
                onClick={() => onSelectClip(clip)}
                className={`group cursor-pointer p-2.5 border transition-all ${
                  isCurrent
                    ? 'bg-neutral-950 border-amber-500 ring-1 ring-amber-500/50'
                    : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {/* Top Row: Title, Duration, Star */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white truncate group-hover:text-amber-400 transition-colors">
                        {clip.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-400 font-mono tabular-nums mt-0.5">
                      <span>{durationSec.toFixed(1)}s</span>
                      <span aria-hidden="true">·</span>
                      <span>{clip.startTime.toFixed(1)}s → {clip.endTime.toFixed(1)}s</span>
                      {period && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-neutral-500 font-sans">{period.name}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Favorite Toggle Star */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(clip.id);
                    }}
                    className={`p-1 transition-colors ${
                      clip.isFavorite
                        ? 'text-amber-400 hover:text-amber-300'
                        : 'text-neutral-600 hover:text-neutral-400'
                    }`}
                    title={clip.isFavorite ? 'En Mi Selección' : 'Marcar para la charla técnica'}
                  >
                    <Star className={`w-4 h-4 ${clip.isFavorite ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {/* Notes if any */}
                {clip.notes && (
                  <p className="text-[11px] text-neutral-300 mt-1 line-clamp-2 leading-relaxed">
                    {clip.notes}
                  </p>
                )}

                {/* Tags and Indicators Row */}
                <div className="flex flex-wrap items-center gap-1 mt-2">
                  {clip.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] text-neutral-400 bg-neutral-900 px-1.5 py-0.5 border border-neutral-800"
                    >
                      {t}
                    </span>
                  ))}

                  {/* Telestration frames count badge */}
                  {clip.telestrations.length > 0 && (
                    <span className="text-[10px] text-amber-300 bg-amber-950/60 px-1.5 py-0.5 border border-amber-800/80 font-mono">
                      ✏️ {clip.telestrations.length} pizarra
                    </span>
                  )}

                  {/* Voice note indicator */}
                  {clip.voiceNoteUrl && (
                    <span className="text-[10px] text-blue-300 bg-blue-950/60 px-1.5 py-0.5 border border-blue-800/80 font-mono flex items-center gap-0.5">
                      <Volume2 className="w-2.5 h-2.5" /> Voz
                    </span>
                  )}
                </div>

                {/* Hover / Quick Actions Toolbar */}
                <div className="flex items-center justify-between border-t border-neutral-800/80 mt-2.5 pt-2 text-xs">
                  <div className="flex items-center gap-1 text-neutral-400 group-hover:text-amber-400 font-medium">
                    <Play className="w-3 h-3 fill-current" />
                    <span>Reproducir</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenWhatsAppShare(clip);
                      }}
                      className="p-1 text-neutral-400 hover:text-emerald-400 transition-colors"
                      title="Compartir jugada por WhatsApp"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenExportModal(clip);
                      }}
                      className="p-1 text-neutral-400 hover:text-amber-400 transition-colors"
                      title="Exportar vídeo de esta jugada"
                    >
                      <Tv className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingClip({ ...clip });
                      }}
                      className="p-1 text-neutral-400 hover:text-white transition-colors"
                      title="Editar notas y rótulos"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteClip(clip.id);
                      }}
                      className="p-1 text-neutral-400 hover:text-red-400 transition-colors"
                      title="Eliminar jugada"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Clip Edit Modal */}
      {editingClip && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs">
          <form
            onSubmit={handleSaveClipEdit}
            className="bg-neutral-900 border border-neutral-700 w-full max-w-lg p-5 space-y-4 shadow-2xl"
          >
            <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Editar Datos de la Jugada
              </h3>
              <button
                type="button"
                onClick={() => setEditingClip(null)}
                className="text-neutral-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">Título de la Jugada</label>
                <input
                  type="text"
                  required
                  value={editingClip.title}
                  onChange={(e) => setEditingClip({ ...editingClip, title: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-700 px-3 py-1.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-neutral-400 mb-1">Nota Táctica del Entrenador</label>
                <textarea
                  rows={3}
                  value={editingClip.notes}
                  onChange={(e) => setEditingClip({ ...editingClip, notes: e.target.value })}
                  placeholder="Instrucciones para los jugadores..."
                  className="w-full bg-neutral-950 border border-neutral-700 px-3 py-1.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Rótulo / Lower-third settings */}
              <div className="bg-neutral-950 p-3 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-300">Rótulo en Pantalla (Lower-Third)</span>
                  <label className="flex items-center gap-1.5 text-neutral-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingClip.lowerThird?.show}
                      onChange={(e) =>
                        setEditingClip({
                          ...editingClip,
                          lowerThird: {
                            ...editingClip.lowerThird,
                            show: e.target.checked
                          }
                        })
                      }
                      className="accent-amber-500"
                    />
                    Mostrar rótulo
                  </label>
                </div>

                {editingClip.lowerThird?.show && (
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-neutral-500 text-[11px] mb-0.5">Categoría Táctica</label>
                        <input
                          type="text"
                          value={editingClip.lowerThird.category}
                          onChange={(e) =>
                            setEditingClip({
                              ...editingClip,
                              lowerThird: {
                                ...editingClip.lowerThird,
                                category: e.target.value
                              }
                            })
                          }
                          className="w-full bg-neutral-900 border border-neutral-700 px-2 py-1 text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-neutral-500 text-[11px] mb-0.5">Jugadores Involucrados</label>
                        <input
                          type="text"
                          value={editingClip.lowerThird.players || ''}
                          onChange={(e) =>
                            setEditingClip({
                              ...editingClip,
                              lowerThird: {
                                ...editingClip.lowerThird,
                                players: e.target.value
                              }
                            })
                          }
                          placeholder="#10 Gómez, #4 López"
                          className="w-full bg-neutral-900 border border-neutral-700 px-2 py-1 text-white text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tags Selector */}
              <div>
                <label className="block text-neutral-400 mb-1">Etiquetas</label>
                <div className="flex flex-wrap gap-1">
                  {availableTags.map((tag) => {
                    const isSelected = editingClip.tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTagOnEditingClip(tag)}
                        className={`text-[11px] px-2 py-0.5 border transition-colors ${
                          isSelected
                            ? 'bg-amber-500 text-neutral-950 font-bold border-amber-400'
                            : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                        }`}
                      >
                        {tag} {isSelected ? '✓' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setEditingClip(null)}
                className="px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-colors"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
