export type VolleyballZone = 'Z1' | 'Z2' | 'Z3' | 'Z4' | 'Z5' | 'Z6' | 'Pipe';

export type ReceptionQuality = '#' | '+' | '!' | '-' | '=';
// # = Perfect (3 opciones de ataque con centrales)
// + = Positiva (central disponible con bola separada)
// ! = Aceptable / Separada (sólo extremos)
// - = Negativa / Forzada (balón fuera de 3m)
// = = Error directo / Ace recibido

export type ServeType =
  | 'jump_power' // Saque en salto potente
  | 'jump_float' // Saque flotante en salto
  | 'standing_float' // Saque flotante en apoyo
  | 'tactical_short'; // Saque corto táctico a Z2/Z4

export type AttackType =
  | 'diagonal_sharp' // Diagonal corta
  | 'diagonal_deep' // Diagonal larga al fondo
  | 'line' // Paralela a la línea
  | 'tip_finta' // Finta / Dejada sobre el bloqueo
  | 'block_out' // Bloqueo tocado afuera
  | 'pipe'; // Ataque zaguero por el centro (Z6)

export type AttackTempo = 'tempo_1_fast' | 'tempo_2_medium' | 'tempo_3_high';

export type GameSystem = 'K1' | 'K2';
// K1: Complejo 1 (Recepción -> Colocación -> Ataque inicial)
// K2: Complejo 2 (Saque -> Bloqueo / Defensa -> Contraataque)

export type BlockType = 'single' | 'double' | 'triple' | 'none';

export type RallyOutcome =
  | 'point_home'
  | 'point_away'
  | 'ace'
  | 'attack_kill'
  | 'block_kill'
  | 'unforced_error';

export interface VolleyballPhaseEvent {
  id: string;
  phase: 'serve' | 'reception' | 'set' | 'attack' | 'block' | 'defense' | 'whistle';
  timestamp: number;
  playerNumber?: string;
  playerName?: string;
  team: 'home' | 'away';
  zone?: VolleyballZone;
  courtCoord?: { x: number; y: number }; // 0..1 in court coordinates (0..9m x 0..18m)
  
  // Tactical action metrics
  serveType?: ServeType;
  serveSpeedKmh?: number;
  targetZone?: VolleyballZone;
  originZone?: VolleyballZone;
  receptionQuality?: ReceptionQuality;
  setDestinationZone?: VolleyballZone;
  setTempo?: AttackTempo;
  system?: GameSystem;
  attackType?: AttackType;
  attackOutcome?: 'kill' | 'in_play' | 'blocked' | 'error';
  blockType?: BlockType;
  blockTouched?: boolean;
  defenseType?: 'dig' | 'pancake' | 'coverage' | 'field_defense';
  note?: string;

  // AI CV & Acoustic Validation Pipeline
  confidence: number; // 0..1 overall action detection confidence
  impactAcousticConfidence?: number; // 0..1 acoustic ball-hit transient verification
  isVerifiedGameAction: boolean; // True only for in-play technical actions, False for greetings/warmup
  falsePositiveType?: 'applause_noise' | 'pre_match_greeting' | 'warmup' | 'none';
}

export interface VolleyballRally {
  id: string;
  rallyNumber: number;
  setNumber: number;
  scoreHome: number;
  scoreAway: number;
  startTime: number; // Video timestamp of serve toss
  endTime: number; // Video timestamp of referee whistle / ball hit floor
  duration: number;
  system: GameSystem;
  servingTeam: 'home' | 'away';
  winnerTeam: 'home' | 'away';
  outcome: RallyOutcome;
  outcomeDescription: string;
  phases: VolleyballPhaseEvent[];
  cvTrackingData: {
    whistleDetectedSec: number;
    whistleConfidence: number; // 0..1
    whistlePeakHz?: number; // Target: 3500-4200 Hz (Fox40 classic referee whistle tone)
    audioCrestFactor?: number; // >14dB for pure whistle tone; <6dB for spectator applause
    applauseRejectionScore?: number; // 0..1 confidence that sound is NOT applause/cheering
    ballPeakVelocityKmh?: number;
    ballImpactConfidence?: number; // 0..1 acoustic impact peak match
    ballTrajectory: { x: number; y: number; t: number }[];
    playerDetections: {
      t: number;
      team: 'home' | 'away';
      bbox: [number, number, number, number]; // [x, y, w, h] normalized
      playerNumber?: string;
      pose?: 'serve_windup' | 'setter_jump' | 'spike_approach' | 'spike_apex' | 'block_apex' | 'ready_defense' | 'reception_slide';
    }[];
    falsePositiveFiltered?: {
      isPreMatchGreeting: boolean;
      isApplauseFalsePositive: boolean;
      rejectedEventsCount: number;
    };
  };
  contactPauseTimestamps: number[]; // Exact contact frames for automatic tactical pause
  telestrations: any[];
  voiceNoteUrl?: string;
  voiceNoteDuration?: number;
  isStarred: boolean;
  preRollSec: number; // Seconds to include before serve (default: 2s)
  postRollSec: number; // Seconds to include after whistle (default: 1.2s)
}

export interface NlpVolleyballQuery {
  rawQuery: string;
  interpretedIntent: string;
  matchedCount: number;
  matchedRallies: VolleyballRally[];
  extractedFilter: {
    setNumber?: number;
    phase?: 'serve' | 'reception' | 'set' | 'attack' | 'block' | 'defense';
    system?: GameSystem;
    zone?: VolleyballZone;
    targetZone?: VolleyballZone;
    playerNumber?: string;
    attackType?: AttackType;
    receptionQuality?: ReceptionQuality[];
    blockType?: BlockType;
    serveType?: ServeType;
    outcomes?: string[];
    team?: 'home' | 'away';
    minConfidence?: number; // Confidence threshold (default 0.75..0.85)
    onlyVerifiedGameActions?: boolean;
  };
  confidenceMetrics?: {
    avgConfidence: number;
    minConfidenceThresholdApplied: number;
    rejectedFalsePositives: number;
    verifiedTechnicalActionsCount: number;
  };
  generatedClippingList: {
    rallyId: string;
    title: string;
    startTime: number;
    endTime: number;
    duration: number;
    highlightPhase: string;
    keyPlayer: string;
    confidence: number;
  }[];
}
