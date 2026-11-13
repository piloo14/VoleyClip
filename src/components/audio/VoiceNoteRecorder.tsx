import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Volume2, RotateCcw } from 'lucide-react';

interface VoiceNoteRecorderProps {
  existingAudioUrl?: string;
  existingDuration?: number;
  onSaveVoiceNote: (audioUrl: string, durationSec: number) => void;
  onDeleteVoiceNote: () => void;
}

export const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({
  existingAudioUrl,
  existingDuration = 0,
  onSaveVoiceNote,
  onDeleteVoiceNote
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(existingDuration);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setAudioDuration(existingDuration);
  }, [existingDuration]);

  // Clean up
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    };
  }, []);

  const startRecording = async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          onSaveVoiceNote(base64Audio, recordingTime);
          setAudioDuration(recordingTime);
        };

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(200);
      setIsRecording(true);
      setRecordingTime(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Error accessing microphone:', err);
      setErrorMsg('No se pudo acceder al micrófono. Verifica los permisos de audio del navegador.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  };

  const togglePlayback = () => {
    if (!existingAudioUrl) return;

    if (!audioPlayerRef.current) {
      const audio = new Audio(existingAudioUrl);
      audioPlayerRef.current = audio;

      audio.ontimeupdate = () => {
        setPlaybackTime(audio.currentTime);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setPlaybackTime(0);
      };

      audio.onloadedmetadata = () => {
        if (audio.duration && isFinite(audio.duration)) {
          setAudioDuration(Math.round(audio.duration));
        }
      };
    }

    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatSec = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 p-3 text-xs space-y-2">
      <div className="flex items-center justify-between text-neutral-300 font-medium">
        <span className="flex items-center gap-1.5 text-neutral-200">
          <Volume2 className="w-3.5 h-3.5 text-amber-500" />
          Nota de Voz del Entrenador
        </span>
        {existingAudioUrl && (
          <span className="font-mono text-neutral-400 tabular-nums">
            {formatSec(audioDuration)}
          </span>
        )}
      </div>

      {errorMsg && (
        <div className="text-red-400 text-[11px] bg-red-950/40 border border-red-800/60 p-1.5">
          {errorMsg}
        </div>
      )}

      {/* Recording State */}
      {isRecording ? (
        <div className="flex items-center justify-between bg-neutral-950 p-2 border border-red-900/50">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
            <span className="text-red-400 font-semibold">Grabando audio táctico...</span>
            <span className="font-mono text-white tabular-nums">{formatSec(recordingTime)}</span>
          </div>
          <button
            onClick={stopRecording}
            className="flex items-center gap-1 bg-red-600 hover:bg-red-500 text-white px-2.5 py-1 font-medium transition-colors"
          >
            <Square className="w-3 h-3 fill-current" />
            Finalizar
          </button>
        </div>
      ) : existingAudioUrl ? (
        /* Has Saved Audio */
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 bg-neutral-950 p-2 border border-neutral-800">
            <button
              onClick={togglePlayback}
              className="w-7 h-7 flex items-center justify-center bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-colors"
              title={isPlaying ? 'Pausar' : 'Escuchar'}
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
            </button>
            <div className="flex-1 space-y-1">
              <div className="h-1.5 bg-neutral-800 overflow-hidden rounded-sm">
                <div
                  className="h-full bg-amber-500 transition-all duration-100"
                  style={{
                    width: `${audioDuration > 0 ? (playbackTime / audioDuration) * 100 : 0}%`
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-neutral-400 font-mono tabular-nums">
                <span>{formatSec(playbackTime)}</span>
                <span>{formatSec(audioDuration)}</span>
              </div>
            </div>

            <button
              onClick={startRecording}
              className="p-1.5 text-neutral-400 hover:text-amber-400 transition-colors"
              title="Regrabar nota"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDeleteVoiceNote}
              className="p-1.5 text-neutral-400 hover:text-red-400 transition-colors"
              title="Eliminar audio"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-[11px] text-neutral-400">
            ✓ Esta nota se reproducirá automáticamente en la Charla Técnica y se incrustará al exportar el clip.
          </div>
        </div>
      ) : (
        /* Initial Ready State */
        <div className="flex items-center justify-between bg-neutral-950 p-2 border border-neutral-800">
          <span className="text-neutral-400 text-[11px]">
            Graba una explicación táctica para que los jugadores la escuchen junto al clip.
          </span>
          <button
            onClick={startRecording}
            className="flex items-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-white px-2.5 py-1 text-xs font-medium border border-neutral-700 transition-colors whitespace-nowrap shrink-0"
          >
            <Mic className="w-3.5 h-3.5 text-amber-400" />
            Grabar Voz
          </button>
        </div>
      )}
    </div>
  );
};
