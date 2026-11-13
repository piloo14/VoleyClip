import React, { useRef } from 'react';
import { Shield, Upload, Eye, Sliders, Check } from 'lucide-react';
import { ClubCrest, CrestPosition } from '../../types/tactical';
import { PRESET_CRESTS } from '../../data/presetMatches';

interface ClubCrestManagerProps {
  currentCrest: ClubCrest;
  onUpdateCrest: (crest: ClubCrest) => void;
}

export const ClubCrestManager: React.FC<ClubCrestManagerProps> = ({
  currentCrest,
  onUpdateCrest
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      onUpdateCrest({
        ...currentCrest,
        id: 'custom_' + Date.now(),
        name: file.name.replace(/\.[^/.]+$/, ''),
        url: dataUrl,
        isCustom: true
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = (preset: ClubCrest) => {
    onUpdateCrest({
      ...preset,
      position: currentCrest.position,
      size: currentCrest.size,
      opacity: currentCrest.opacity
    });
  };

  const positions: { id: CrestPosition; label: string }[] = [
    { id: 'top-left', label: 'Arriba Izq.' },
    { id: 'top-right', label: 'Arriba Der.' },
    { id: 'bottom-left', label: 'Abajo Izq.' },
    { id: 'bottom-right', label: 'Abajo Der.' }
  ];

  return (
    <div className="bg-neutral-900 border border-neutral-800 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Tu Escudo y Marca de Agua
          </h3>
        </div>
        <span className="text-[11px] text-neutral-400">Personalización del Club</span>
      </div>

      {/* Current Preview */}
      <div className="bg-neutral-950 border border-neutral-800 p-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 bg-neutral-900 border border-neutral-800 p-1 flex items-center justify-center">
            <img
              src={currentCrest.url}
              alt={currentCrest.name}
              className="max-w-full max-h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="text-xs font-bold text-white">{currentCrest.name}</div>
            <div className="text-[11px] text-neutral-400 mt-0.5">
              Posición: {positions.find((p) => p.id === currentCrest.position)?.label} · Tamaño:{' '}
              {currentCrest.size}px
            </div>
          </div>
        </div>

        {/* Upload Custom Button */}
        <div>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs px-3 py-1.5 border border-neutral-700 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            Subir Escudo
          </button>
        </div>
      </div>

      {/* Preset Crests */}
      <div className="space-y-1.5">
        <label className="text-xs text-neutral-400">Escudos Predeterminados:</label>
        <div className="grid grid-cols-4 gap-2">
          {PRESET_CRESTS.map((preset) => {
            const isSelected = currentCrest.name === preset.name && !currentCrest.isCustom;
            return (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className={`p-2 border text-center flex flex-col items-center gap-1 transition-all ${
                  isSelected
                    ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500'
                    : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <img
                  src={preset.url}
                  alt={preset.name}
                  className="w-8 h-8 object-contain"
                  referrerPolicy="no-referrer"
                />
                <span className="text-[10px] text-neutral-300 truncate w-full">{preset.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Position and Sizing Controls */}
      <div className="space-y-3 pt-1">
        {/* Positions Grid */}
        <div>
          <label className="block text-xs text-neutral-400 mb-1.5">Esquina en Pantalla:</label>
          <div className="grid grid-cols-4 gap-1.5">
            {positions.map((pos) => (
              <button
                key={pos.id}
                onClick={() => onUpdateCrest({ ...currentCrest, position: pos.id })}
                className={`py-1 text-xs border transition-colors ${
                  currentCrest.position === pos.id
                    ? 'bg-amber-500 text-neutral-950 font-bold border-amber-400'
                    : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:bg-neutral-800'
                }`}
              >
                {pos.label}
              </button>
            ))}
          </div>
        </div>

        {/* Size Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-neutral-400">
            <span>Tamaño del Escudo:</span>
            <span className="font-mono text-white tabular-nums">{currentCrest.size}px</span>
          </div>
          <input
            type="range"
            min={36}
            max={120}
            step={2}
            value={currentCrest.size}
            onChange={(e) => onUpdateCrest({ ...currentCrest, size: parseInt(e.target.value) })}
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>

        {/* Opacity Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-neutral-400">
            <span>Opacidad / Transparencia:</span>
            <span className="font-mono text-white tabular-nums">
              {Math.round(currentCrest.opacity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0.2}
            max={1.0}
            step={0.05}
            value={currentCrest.opacity}
            onChange={(e) =>
              onUpdateCrest({ ...currentCrest, opacity: parseFloat(e.target.value) })
            }
            className="w-full accent-amber-500 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
