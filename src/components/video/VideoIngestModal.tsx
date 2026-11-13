import React, { useState, useRef } from 'react';
import {
  Upload,
  Link as LinkIcon,
  Video,
  FileVideo,
  CheckCircle2,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { MatchPeriod, MatchSession, SportType, VideoSource } from '../../types/tactical';
import { INITIAL_MATCH_SESSIONS, SPORT_TAGS } from '../../data/presetMatches';

interface VideoIngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadSession: (session: MatchSession) => void;
}

export const VideoIngestModal: React.FC<VideoIngestModalProps> = ({
  isOpen,
  onClose,
  onLoadSession
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'samples'>('samples');
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [matchTitle, setMatchTitle] = useState('Nuevo Partido Táctico');
  const [sport, setSport] = useState<SportType>('basketball');
  const [homeTeam, setHomeTeam] = useState('Mi Equipo (Local)');
  const [awayTeam, setAwayTeam] = useState('Rival (Visitante)');
  const [homeColor, setHomeColor] = useState('#F59E0B');
  const [awayColor, setAwayColor] = useState('#3B82F6');
  const [periodPreset, setPeriodPreset] = useState<'4q' | '2p' | '3sets'>('4q');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setMatchTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const getPeriodsForPreset = (preset: '4q' | '2p' | '3sets'): MatchPeriod[] => {
    if (preset === '4q') {
      return [
        { id: 'q1', name: '1º Cuarto (Q1)', startSec: 0, endSec: 600 },
        { id: 'q2', name: '2º Cuarto (Q2)', startSec: 600, endSec: 1200 },
        { id: 'q3', name: '3º Cuarto (Q3)', startSec: 1200, endSec: 1800 },
        { id: 'q4', name: '4º Cuarto (Q4)', startSec: 1800, endSec: 2400 }
      ];
    } else if (preset === '2p') {
      return [
        { id: '1p', name: '1ª Parte (0-45m)', startSec: 0, endSec: 2700 },
        { id: '2p', name: '2ª Parte (45-90m)', startSec: 2700, endSec: 5400 }
      ];
    } else {
      return [
        { id: 's1', name: '1º Set', startSec: 0, endSec: 1200 },
        { id: 's2', name: '2º Set', startSec: 1200, endSec: 2400 },
        { id: 's3', name: '3º Set', startSec: 2400, endSec: 3600 }
      ];
    }
  };

  const handleConfirmCustom = () => {
    let videoSource: VideoSource;

    if (activeTab === 'upload' && uploadedFile) {
      const blobUrl = URL.createObjectURL(uploadedFile);
      videoSource = {
        type: 'file',
        url: blobUrl,
        title: uploadedFile.name,
        duration: 0
      };
    } else if (activeTab === 'url' && videoUrlInput.trim()) {
      videoSource = {
        type: 'url',
        url: videoUrlInput.trim(),
        title: matchTitle,
        duration: 0
      };
    } else {
      return;
    }

    const newSession: MatchSession = {
      id: 'session_' + Date.now(),
      title: matchTitle.trim() || 'Partido Táctico',
      sport,
      videoSource,
      homeTeam,
      awayTeam,
      homeColor,
      awayColor,
      periods: getPeriodsForPreset(periodPreset),
      possessions: [],
      clips: [],
      crest: INITIAL_MATCH_SESSIONS[0].crest,
      availableTags: SPORT_TAGS[sport] || SPORT_TAGS.custom
    };

    onLoadSession(newSession);
    onClose();
  };

  const handleSelectSample = (sample: MatchSession) => {
    onLoadSession(sample);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div className="bg-neutral-900 border border-neutral-700 w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Ingesta y Gestión de Vídeo
            </h3>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white text-xs">
            ✕
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-neutral-800 bg-neutral-950 text-xs">
          <button
            onClick={() => setActiveTab('samples')}
            className={`flex-1 py-2.5 font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'samples'
                ? 'border-b-2 border-amber-500 text-white bg-neutral-900'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Partidos de Demostración
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2.5 font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'upload'
                ? 'border-b-2 border-amber-500 text-white bg-neutral-900'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Subir Archivo Local
          </button>
          <button
            onClick={() => setActiveTab('url')}
            className={`flex-1 py-2.5 font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'url'
                ? 'border-b-2 border-amber-500 text-white bg-neutral-900'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            Enlace de Vídeo
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {activeTab === 'samples' && (
            <div className="space-y-3">
              <div className="text-xs text-neutral-300">
                Selecciona uno de los partidos preconfigurados con cortes, pizarras y control de
                posesión listos para probar:
              </div>
              <div className="space-y-2">
                {INITIAL_MATCH_SESSIONS.map((sample) => (
                  <div
                    key={sample.id}
                    onClick={() => handleSelectSample(sample)}
                    className="p-3 bg-neutral-950 border border-neutral-800 hover:border-amber-500/80 cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                        {sample.title}
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">
                        {sample.homeTeam} vs {sample.awayTeam} · {sample.clips.length} jugadas ya
                        cortadas
                      </div>
                    </div>
                    <span className="text-xs bg-amber-500 text-neutral-950 font-bold px-2.5 py-1 opacity-90 group-hover:opacity-100 transition-opacity">
                      Cargar
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                accept="video/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-neutral-700 hover:border-amber-500 p-8 text-center cursor-pointer bg-neutral-950 transition-colors space-y-2"
              >
                <FileVideo className="w-8 h-8 text-amber-500 mx-auto" />
                <div className="text-xs font-bold text-white">
                  {uploadedFile ? uploadedFile.name : 'Haz clic o arrastra un vídeo de partido aquí'}
                </div>
                <div className="text-[11px] text-neutral-400">
                  Formatos compatibles: MP4, WebM, MOV, MKV (Reproducción y recorte local seguro)
                </div>
              </div>
            </div>
          )}

          {activeTab === 'url' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">
                  Enlace directo de vídeo o plataforma (MyPlay, YouTube, Vimeo, MP4 directo)
                </label>
                <input
                  type="url"
                  value={videoUrlInput}
                  onChange={(e) => setVideoUrlInput(e.target.value)}
                  placeholder="https://servidor.club/video.mp4"
                  className="w-full bg-neutral-950 border border-neutral-700 px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
              <div className="text-[11px] text-neutral-500 bg-neutral-950 p-2.5 border border-neutral-800">
                💡 Consejo: Para habilitar el renderizado completo de cortes con pizarra incrustada,
                se recomienda utilizar enlaces directos a archivos MP4 o subir el archivo local.
              </div>
            </div>
          )}

          {/* Match Configuration Options if uploading or url */}
          {(activeTab === 'upload' || activeTab === 'url') && (
            <div className="space-y-3 pt-3 border-t border-neutral-800 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">Título del Partido / Análisis</label>
                <input
                  type="text"
                  value={matchTitle}
                  onChange={(e) => setMatchTitle(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 px-3 py-1.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1">Deporte</label>
                  <select
                    value={sport}
                    onChange={(e) => setSport(e.target.value as SportType)}
                    className="w-full bg-neutral-950 border border-neutral-700 px-2 py-1.5 text-white"
                  >
                    <option value="basketball">Baloncesto</option>
                    <option value="football">Fútbol</option>
                    <option value="futsal">Fútbol Sala</option>
                    <option value="handball">Balonmano</option>
                    <option value="volleyball">Voleibol</option>
                    <option value="custom">Otro Deporte</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1">Estructura de Períodos</label>
                  <select
                    value={periodPreset}
                    onChange={(e) => setPeriodPreset(e.target.value as any)}
                    className="w-full bg-neutral-950 border border-neutral-700 px-2 py-1.5 text-white"
                  >
                    <option value="4q">4 Cuartos (Baloncesto)</option>
                    <option value="2p">2 Partes (Fútbol)</option>
                    <option value="3sets">Sets (Voleibol / Tenis)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 mb-1">Equipo Local</label>
                  <div className="flex gap-1.5">
                    <input
                      type="color"
                      value={homeColor}
                      onChange={(e) => setHomeColor(e.target.value)}
                      className="w-8 h-8 p-0 bg-transparent border-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={homeTeam}
                      onChange={(e) => setHomeTeam(e.target.value)}
                      className="flex-1 bg-neutral-950 border border-neutral-700 px-2 py-1 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1">Equipo Visitante / Rival</label>
                  <div className="flex gap-1.5">
                    <input
                      type="color"
                      value={awayColor}
                      onChange={(e) => setAwayColor(e.target.value)}
                      className="w-8 h-8 p-0 bg-transparent border-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={awayTeam}
                      onChange={(e) => setAwayTeam(e.target.value)}
                      className="flex-1 bg-neutral-950 border border-neutral-700 px-2 py-1 text-white"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleConfirmCustom}
                disabled={activeTab === 'upload' ? !uploadedFile : !videoUrlInput.trim()}
                className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-800 disabled:text-neutral-500 text-neutral-950 font-bold text-xs transition-colors"
              >
                Abrir Partido en Cortazo Pro
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
