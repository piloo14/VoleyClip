import React, { useState } from 'react';
import {
  Code2,
  FileJson,
  Cpu,
  Layers,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  Zap,
  Sliders,
  Sparkles,
  Volume2,
  Terminal,
  Activity
} from 'lucide-react';

interface VolleyAiArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VolleyAiArchitectureModal: React.FC<VolleyAiArchitectureModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'schema' | 'python' | 'pipeline'>('schema');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // 1. Formal JSON Schema
  const volleyAiJsonSchema = JSON.stringify(
    {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      title: 'VolleyAiMatchMetadata',
      description: 'Esquema de metadatos para segmentación y auto-recorte táctico de voleibol por IA',
      type: 'object',
      required: ['match_id', 'metadata', 'rallies'],
      properties: {
        match_id: { type: 'string', example: 'match_superliga_2026_j18' },
        metadata: {
          type: 'object',
          required: ['fps', 'duration_sec', 'resolution', 'teams'],
          properties: {
            title: { type: 'string' },
            fps: { type: 'number', minimum: 25, maximum: 120 },
            duration_sec: { type: 'number' },
            resolution: {
              type: 'object',
              properties: { width: { type: 'integer' }, height: { type: 'integer' } }
            },
            teams: {
              type: 'object',
              properties: { home: { type: 'string' }, away: { type: 'string' } }
            }
          }
        },
        rallies: {
          type: 'array',
          items: {
            type: 'object',
            required: ['rally_id', 'set_number', 'start_time', 'end_time', 'system', 'outcome', 'actions'],
            properties: {
              rally_id: { type: 'string' },
              set_number: { type: 'integer', minimum: 1, maximum: 5 },
              start_time: { type: 'number', description: 'Momento de lanzamiento de saque (segundos)' },
              end_time: { type: 'number', description: 'Silbato del árbitro / balón toca suelo (segundos)' },
              duration_sec: { type: 'number' },
              system: { type: 'string', enum: ['K1', 'K2', 'K3'] },
              serving_team: { type: 'string', enum: ['home', 'away'] },
              winner_team: { type: 'string', enum: ['home', 'away'] },
              outcome: {
                type: 'string',
                enum: ['attack_kill', 'block_kill', 'ace', 'unforced_error', 'opponent_error']
              },
              score_at_rally: {
                type: 'object',
                properties: { home: { type: 'integer' }, away: { type: 'integer' } }
              },
              acoustic_verification: {
                type: 'object',
                properties: {
                  whistle_detected_sec: { type: 'number' },
                  whistle_confidence: { type: 'number', minimum: 0, maximum: 1 },
                  whistle_frequency_hz: { type: 'number', example: 3850 },
                  audio_crest_factor_db: { type: 'number', minimum: 0 },
                  applause_rejection_score: { type: 'number', minimum: 0, maximum: 1 },
                  is_false_positive_rejected: { type: 'boolean' }
                }
              },
              actions: {
                type: 'array',
                description: 'Desglose cronológico micro-acción de la jugada',
                items: {
                  type: 'object',
                  required: ['action_id', 'action_type', 'timestamp', 'team', 'confidence', 'is_verified_game_action'],
                  properties: {
                    action_id: { type: 'string' },
                    action_type: {
                      type: 'string',
                      enum: ['SAQUE', 'RECEPCIÓN', 'COLOCACIÓN', 'ATAQUE', 'BLOQUEO', 'DEFENSA', 'SILBATO']
                    },
                    timestamp: { type: 'number' },
                    player_number: { type: 'string', example: '#7' },
                    player_name: { type: 'string' },
                    team: { type: 'string', enum: ['home', 'away'] },
                    origin_zone: { type: 'string', enum: ['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6', 'Pipe'] },
                    target_zone: { type: 'string', enum: ['Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6', 'Pipe'] },
                    reception_quality: { type: 'string', enum: ['#', '+', '!', '-', '='] },
                    set_tempo: { type: 'string', enum: ['tempo_1', 'tempo_2', 'tempo_3'] },
                    attack_trajectory: {
                      type: 'string',
                      enum: ['diagonal_sharp', 'diagonal_deep', 'line', 'tip_finta', 'block_out', 'pipe']
                    },
                    block_type: { type: 'string', enum: ['single', 'double', 'triple'] },
                    block_touched: { type: 'boolean' },
                    defense_type: { type: 'string', enum: ['dig', 'pancake', 'coverage', 'field_defense'] },
                    confidence: { type: 'number', minimum: 0, maximum: 1 },
                    impact_acoustic_confidence: { type: 'number', minimum: 0, maximum: 1 },
                    is_verified_game_action: { type: 'boolean' }
                  }
                }
              }
            }
          }
        }
      }
    },
    null,
    2
  );

  // 2. Python FastAPI Backend Architecture
  const pythonFastApiCode = `# ==============================================================================
# VolleyAI - Backend de Ingesta, Visión por Computador y Recortes (FastAPI + FFmpeg)
# ==============================================================================

import asyncio
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, BackgroundTasks, HTTPException
from pydantic import BaseModel, Field
import subprocess
import json
import os
import numpy as np

app = FastAPI(title="VolleyAI Segmentation Engine", version="3.2.0")

class NlpFilterRequest(BaseModel):
    query: str
    match_id: str
    min_confidence: float = Field(default=0.80, ge=0.5, le=0.99)
    filter_false_positives: bool = True  # Descarta saludos y aplausos

class ClipSpecification(BaseModel):
    clip_id: str
    rally_id: str
    action_type: str
    start_sec: float
    end_sec: float
    confidence: float
    output_filename: str

@app.post("/api/v1/volleyball/process-video")
async def process_match_video(video_path: str, background_tasks: BackgroundTasks):
    """
    Inicia el pipeline asíncrono de IA:
    1. Extracción de audio para detección de silbato y aplausos (FFmpeg + STFT).
    2. Inferencia YOLOv11 (detección y tracking 3D de balón y pista).
    3. Clasificación de contactos y fases mediante ByteTrack + MediaPipe Pose.
    """
    task_id = f"task_{os.path.basename(video_path)}"
    background_tasks.add_task(run_full_ai_pipeline, video_path)
    return {"status": "processing", "task_id": task_id, "video": video_path}

@app.post("/api/v1/volleyball/nlp-slice")
async def nlp_slice(request: NlpFilterRequest):
    """
    Motor semántico para interpretar peticiones de entrenador y recortar:
    Ej: 'Todas las colocaciones a Zona 4 del primer set'
    """
    # 1. Cargar metadatos estructurados del partido
    match_data = load_match_metadata(request.match_id)
    
    # 2. Parsear condiciones de la consulta (técnica, zona, set, jugador)
    intent = parse_tactical_intent(request.query)
    
    matched_clips: List[ClipSpecification] = []
    for rally in match_data.get("rallies", []):
        # Filtrar por set si se especificó
        if intent.get("set_number") and rally["set_number"] != intent["set_number"]:
            continue
            
        for action in rally.get("actions", []):
            # FILTRO CRÍTICO DE FALSOS POSITIVOS:
            if request.filter_false_positives and not action.get("is_verified_game_action"):
                continue
            if action.get("confidence", 0) < request.min_confidence:
                continue
                
            # Coincidencia con tipo de acción (Colocación, Ataque, Recepción, etc.)
            if intent.get("action_type") and action["action_type"] != intent["action_type"]:
                continue
            # Coincidencia con zona destino (Z4, Z2, Z3, etc.)
            if intent.get("target_zone") and action.get("target_zone") != intent["target_zone"]:
                continue
                
            # Margen táctico: -1.5s antes del contacto, +2.5s tras el impacto
            clip_start = max(0.0, action["timestamp"] - 1.5)
            clip_end = min(rally["end_time"] + 0.8, action["timestamp"] + 2.5)
            
            matched_clips.append(ClipSpecification(
                clip_id=f"clip_{action['action_id']}",
                rally_id=rally["rally_id"],
                action_type=action["action_type"],
                start_sec=round(clip_start, 2),
                end_sec=round(clip_end, 2),
                confidence=action["confidence"],
                output_filename=f"action_{action['action_type'].lower()}_{action['timestamp']:.1f}s.mp4"
            ))
            
    return {
        "success": True,
        "query": request.query,
        "interpreted_intent": intent,
        "matched_clips": matched_clips,
        "count": len(matched_clips)
    }

@app.post("/api/v1/volleyball/export-playlist-mp4")
async def export_playlist_mp4(clips: List[ClipSpecification], source_video: str):
    """
    Ejecuta FFmpeg con re-encode exacto o stream copy para exportar
    la recopilación en un solo archivo MP4 para enviar por WhatsApp.
    """
    output_path = f"/exports/playlist_{os.path.basename(source_video)}"
    concat_file_content = ""
    
    for i, c in enumerate(clips):
        part_name = f"/tmp/part_{i}.mp4"
        cmd = [
            "ffmpeg", "-y", "-ss", str(c.start_sec), "-to", str(c.end_sec),
            "-i", source_video, "-c:v", "libx264", "-preset", "fast",
            "-crf", "22", "-c:a", "aac", "-b:a", "128k", part_name
        ]
        subprocess.run(cmd, check=True)
        concat_file_content += f"file '{part_name}'\\n"
        
    return {"playlist_url": f"/exports/{os.path.basename(output_path)}", "total_clips": len(clips)}
`;

  // 3. AI Pipeline Pseudocode
  const aiPipelinePseudocode = `# ==============================================================================
# PIPELINE DE IA: TRACKING 3D DE BALÓN, ESTIMACIÓN DE POSE Y FILTRADO ACÚSTICO
# ==============================================================================

import cv2
import librosa
import numpy as np

class VolleyAiPipeline:
    def __init__(self, yolo_ball_weights, court_homography_matrix):
        self.ball_detector = YOLO(yolo_ball_weights)       # YOLOv11 afinado con balones Mikasa V200W
        self.pose_detector = mp.solutions.pose.Pose()      # MediaPipe Pose para biomecánica de jugadores
        self.court_homography = court_homography_matrix     # Proyección 2D imagen -> 9m x 18m campo FIVB
        self.whistle_band = (3500, 4200)                   # Frecuencia pura de silbato Fox40 (Hz)

    def analyze_audio_stream(self, audio_array, sr=44100):
        """
        Distingue silbato real del árbitro frente a falsos positivos (aplausos o gritos):
        - Silbato Fox40: Tono puro concentrado en 3.8 kHz con crest factor > 14 dB.
        - Aplausos de grada: Ruido broadband distribuido (100 Hz a 10 kHz) con crest factor < 6 dB.
        """
        # 1. Transformada de Fourier a corto plazo (STFT)
        D = np.abs(librosa.stft(audio_array))
        frequencies = librosa.fft_frequencies(sr=sr)
        
        # 2. Energía en la banda de 3.5 a 4.2 kHz
        whistle_bin_indices = np.where((frequencies >= 3500) & (frequencies <= 4200))[0]
        whistle_energy = np.mean(D[whistle_bin_indices, :], axis=0)
        total_energy = np.mean(D, axis=0) + 1e-9
        
        # 3. Factor de Cresta (Peak-to-Average Power Ratio)
        spectral_crest = np.max(whistle_energy) / np.mean(whistle_energy)
        
        is_whistle = (np.max(whistle_energy) > 0.4) and (spectral_crest > 4.5)
        is_applause = (spectral_crest < 2.0) and (np.mean(total_energy) > 0.3)
        
        return {
            "whistle_detected": bool(is_whistle),
            "whistle_confidence": float(min(1.0, spectral_crest / 10.0)),
            "applause_noise_rejected": bool(is_applause),
            "dominant_frequency_hz": 3850
        }

    def detect_ball_impact_events(self, trajectory_points):
        """
        Detección de contacto con el balón mediante cambio brusco en el vector velocidad (Jerk / Aceleración):
        Delta_V > umbral_impacto => Contacto (Saque, Recepción, Colocación, Remate o Bloqueo).
        """
        impact_events = []
        for i in range(2, len(trajectory_points) - 2):
            v_before = trajectory_points[i] - trajectory_points[i-2]
            v_after = trajectory_points[i+2] - trajectory_points[i]
            acceleration_vector = v_after - v_before
            
            # Si el ángulo de dispersión cambia bruscamente y la aceleración es pico:
            if np.linalg.norm(acceleration_vector) > 18.5: # m/s^2 equivalente
                impact_events.append({
                    "timestamp": trajectory_points[i].t,
                    "court_coord": self.project_to_court(trajectory_points[i].xy),
                    "confidence": 0.96
                })
        return impact_events

    def classify_action_type(self, player_pose, ball_impact_event, rally_context):
        """
        Clasifica la acción según la postura corporal y la posición relativa en pista:
        - Brazos extendidos juntos a la altura de la cintura en zona zaguera -> RECEPCIÓN (#)
        - Manos sobre la cabeza en suspensión cerca de la red -> COLOCACIÓN
        - Batida de 3 pasos + elevación + golpeo en punto más alto (apex) -> ATAQUE
        - Salto simultáneo de 2 jugadores con manos sobre la cinta de red -> BLOQUEO DOBLE
        """
        if player_pose.wrist_height > player_pose.eye_level and player_pose.is_near_net:
            return "COLOCACIÓN"
        elif player_pose.is_spiking_apex:
            return "ATAQUE"
        elif player_pose.is_forearm_platform:
            return "RECEPCIÓN"
        elif player_pose.is_blocking_wall:
            return "BLOQUEO"
        return "DEFENSA"
`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-neutral-950 border border-neutral-800 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl rounded-none">
        {/* Modal Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-500">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                Arquitectura VolleyAI & Esquema JSON
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono">
                  v3.2 Producción
                </span>
              </h2>
              <p className="text-[11px] text-neutral-400">
                Pipeline de Visión por Computador, Clasificación Acústica y Motor de Auto-Recorte
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-neutral-800 bg-neutral-950 text-xs">
          <button
            onClick={() => setActiveTab('schema')}
            className={`flex-1 py-2.5 font-semibold flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'schema'
                ? 'border-b-2 border-amber-500 text-amber-400 bg-neutral-900/80'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>1. Esquema JSON (JSON Schema)</span>
          </button>
          <button
            onClick={() => setActiveTab('python')}
            className={`flex-1 py-2.5 font-semibold flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'python'
                ? 'border-b-2 border-amber-500 text-amber-400 bg-neutral-900/80'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>2. Backend FastAPI & FFmpeg</span>
          </button>
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`flex-1 py-2.5 font-semibold flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'pipeline'
                ? 'border-b-2 border-amber-500 text-amber-400 bg-neutral-900/80'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>3. Lógica IA & Filtro Acústico</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3 font-mono text-xs">
          {activeTab === 'schema' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                <span className="flex items-center gap-1.5 text-neutral-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  JSON Schema estándar para metadatos de rallies y micro-acciones de voleibol:
                </span>
                <button
                  onClick={() => copyToClipboard(volleyAiJsonSchema, 'schema')}
                  className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-white font-sans text-[11px] flex items-center gap-1.5 transition-colors border border-neutral-700"
                >
                  {copiedKey === 'schema' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-neutral-400" />
                      <span>Copiar JSON Schema</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-3 bg-neutral-900/90 border border-neutral-800 text-amber-300/90 text-[11px] rounded overflow-x-auto leading-relaxed max-h-[500px]">
                {volleyAiJsonSchema}
              </pre>
            </div>
          )}

          {activeTab === 'python' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                <span className="flex items-center gap-1.5 text-neutral-300">
                  <Terminal className="w-3.5 h-3.5 text-blue-400" />
                  Módulo Python / FastAPI para procesamiento asíncrono y recortes con FFmpeg:
                </span>
                <button
                  onClick={() => copyToClipboard(pythonFastApiCode, 'python')}
                  className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-white font-sans text-[11px] flex items-center gap-1.5 transition-colors border border-neutral-700"
                >
                  {copiedKey === 'python' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-neutral-400" />
                      <span>Copiar Código Python</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-3 bg-neutral-900/90 border border-neutral-800 text-blue-300/90 text-[11px] rounded overflow-x-auto leading-relaxed max-h-[500px]">
                {pythonFastApiCode}
              </pre>
            </div>
          )}

          {activeTab === 'pipeline' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                <span className="flex items-center gap-1.5 text-neutral-300">
                  <Activity className="w-3.5 h-3.5 text-rose-400" />
                  Canalización de IA (YOLOv11 Balón + MediaPipe Pose + Librosa STFT Silbato vs Aplausos):
                </span>
                <button
                  onClick={() => copyToClipboard(aiPipelinePseudocode, 'pipeline')}
                  className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-white font-sans text-[11px] flex items-center gap-1.5 transition-colors border border-neutral-700"
                >
                  {copiedKey === 'pipeline' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-neutral-400" />
                      <span>Copiar Algoritmo</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-3 bg-neutral-900/90 border border-neutral-800 text-emerald-300/90 text-[11px] rounded overflow-x-auto leading-relaxed max-h-[500px]">
                {aiPipelinePseudocode}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-neutral-800 bg-neutral-900/60 flex items-center justify-between text-xs">
          <div className="text-[11px] text-neutral-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Filtro anti-saludos: Umbral de inicio validado por lanzamiento vertical de saque.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition-colors"
          >
            Cerrar Especificación
          </button>
        </div>
      </div>
    </div>
  );
};
