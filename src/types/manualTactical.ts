import { TelestrationShape } from './tactical';

export interface VolleyballFolder {
  id: string;
  name: string;
  icon: string; // e.g. '🏐', '💥', '🛡️', '📥', '⚡'
  color: string; // Tailwind color theme or hex
  description?: string;
  isCustom?: boolean;
  shortcutKey?: string; // e.g. 'C', '4', '3', '2', 'D', 'R'
}

export interface ManualTacticalClip {
  id: string;
  title: string;
  folderId: string; // References VolleyballFolder.id
  startTime: number;
  endTime: number;
  duration: number;
  thumbnailUrl?: string; // Base64 or URL thumbnail
  notes?: string;
  telestrations?: TelestrationShape[];
  createdAt: number;
}

export interface ClipMarkerSettings {
  defaultMode: 'recent_window' | 'in_out';
  recentPreRollSec: number; // e.g. 4.0s before current time
  recentPostRollSec: number; // e.g. 1.0s after current time
  autoPlayAfterClip: boolean;
  activeFolderId: string;
}

export interface MontageExportJob {
  folderId: string;
  folderName: string;
  clips: ManualTacticalClip[];
  status: 'idle' | 'rendering' | 'completed' | 'error';
  progress: number; // 0..100
  currentClipIndex: number;
  totalClips: number;
  outputBlobUrl?: string;
  outputFilename?: string;
  error?: string;
}
