export type SportType = 'basketball' | 'football' | 'futsal' | 'handball' | 'volleyball' | 'custom';

export interface Point {
  x: number; // Normalized 0..1 relative to video canvas
  y: number; // Normalized 0..1 relative to video canvas
}

export type TelestrationTool =
  | 'arrow_solid'
  | 'arrow_dashed'
  | 'ball_trajectory'
  | 'player_pin'
  | 'circle'
  | 'spotlight'
  | 'rect'
  | 'freehand'
  | 'text';

export interface TelestrationShape {
  id: string;
  type: TelestrationTool;
  color: string;
  width: number;
  start?: Point;
  end?: Point;
  points?: Point[];
  center?: Point;
  radius?: number;
  point?: Point;
  text?: string;
  label?: string;
  fontSize?: number;
}

export interface TelestrationFrame {
  id: string;
  timestamp: number; // Seconds within the video
  shapes: TelestrationShape[];
  note?: string;
  autoPauseDuration?: number; // Seconds to pause, default 3
}

export interface LowerThirdConfig {
  show: boolean;
  category: string;
  title: string;
  coachNote: string;
  players?: string;
  displayMode: 'intro' | 'always'; // 'intro' = first 3.5s, 'always' = entire clip
}

export interface TacticalClip {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  periodId: string;
  tags: string[];
  isFavorite: boolean; // "Mi Selección"
  notes: string;
  telestrations: TelestrationFrame[];
  voiceNoteUrl?: string; // Data URL or Object URL
  voiceNoteDuration?: number;
  lowerThird: LowerThirdConfig;
  createdAt: number;
  thumbnailUrl?: string;
}

export interface MatchPeriod {
  id: string;
  name: string;
  startSec: number;
  endSec: number;
}

export interface PossessionInterval {
  id: string;
  team: 'home' | 'away' | 'dead';
  startSec: number;
  endSec: number;
  note?: string;
  periodId?: string;
}

export type CrestPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface ClubCrest {
  id: string;
  name: string;
  url: string;
  position: CrestPosition;
  size: number; // pixels, e.g. 64
  opacity: number; // 0..1, e.g. 0.9
  isCustom?: boolean;
}

export interface VideoSource {
  type: 'file' | 'url' | 'sample';
  url: string;
  title: string;
  duration: number;
  thumbnail?: string;
}

export interface MatchSession {
  id: string;
  title: string;
  sport: SportType;
  videoSource: VideoSource;
  homeTeam: string;
  awayTeam: string;
  homeColor: string;
  awayColor: string;
  periods: MatchPeriod[];
  possessions: PossessionInterval[];
  clips: TacticalClip[];
  crest: ClubCrest;
  availableTags: string[];
}
