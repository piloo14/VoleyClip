import { VolleyballRally } from '../types/volleyball';
import { ClubCrest } from '../types/tactical';

export const VOLLEYBALL_CREST: ClubCrest = {
  id: 'crest_volei_pro',
  name: 'Club Voleibol Olímpico',
  url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="vg1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23F59E0B"/><stop offset="100%" stop-color="%232563EB"/></linearGradient></defs><polygon points="50,5 92,20 80,85 50,98 20,85 8,20" fill="url(%23vg1)" stroke="%23FFF" stroke-width="3"/><circle cx="50" cy="50" r="24" fill="%23FFF" stroke="%231E293B" stroke-width="2"/><path d="M50 26 C60 36 60 64 50 74 M26 50 C36 60 64 60 74 50" stroke="%232563EB" stroke-width="2.5" fill="none"/><text x="50" y="88" fill="%23FFF" font-size="7" font-weight="bold" font-family="sans-serif" text-anchor="middle">VOLEI PRO</text></svg>',
  position: 'top-right',
  size: 64,
  opacity: 0.9,
  isCustom: false
};

export const PRESET_VOLEI_QUERIES = [
  'Recórtame todos los pases/colocaciones a zona 4 en K1.',
  'Muestra todos los ataques de la jugadora #7 que terminaron en punto directo o error.',
  'Extrae todas las secuencias de bloqueo doble contra la zona 2 rival.',
  'Genera un clip continuo de todos los saques en salto del Set 2.',
  'Busca las acciones de cobertura de remate y defensa de campo del equipo propio.'
];

export const INITIAL_VOLLEYBALL_RALLIES: VolleyballRally[] = [
  {
    id: 'rally_1_k1_z4',
    rallyNumber: 1,
    setNumber: 1,
    scoreHome: 9,
    scoreAway: 8,
    startTime: 0.8,
    endTime: 13.5,
    duration: 12.7,
    system: 'K1',
    servingTeam: 'away',
    winnerTeam: 'home',
    outcome: 'attack_kill',
    outcomeDescription: 'Ataque ganador por Zona 4 tras colocación rápida en K1 (Pase # del Líbero)',
    isStarred: true,
    preRollSec: 1.5,
    postRollSec: 1.5,
    contactPauseTimestamps: [6.8, 8.4],
    phases: [
      {
        id: 'p1_serve',
        phase: 'serve',
        timestamp: 2.1,
        team: 'away',
        playerNumber: '#1',
        playerName: 'Kowalski',
        zone: 'Z1',
        targetZone: 'Z6',
        serveType: 'jump_power',
        serveSpeedKmh: 104,
        confidence: 0.96,
        impactAcousticConfidence: 0.92,
        isVerifiedGameAction: true,
        note: 'Saque potente en salto hacia la zona de recepción central (Z6)'
      },
      {
        id: 'p1_rec',
        phase: 'reception',
        timestamp: 3.2,
        team: 'home',
        playerNumber: '#13',
        playerName: 'Líbero (#13 Navarro)',
        zone: 'Z6',
        targetZone: 'Z3',
        receptionQuality: '#',
        courtCoord: { x: 0.5, y: 0.78 },
        confidence: 0.95,
        impactAcousticConfidence: 0.91,
        isVerifiedGameAction: true,
        note: 'Recepción perfecta (#) en plancha baja: colocador con red viva en Z3'
      },
      {
        id: 'p1_set',
        phase: 'set',
        timestamp: 6.8,
        team: 'home',
        playerNumber: '#2',
        playerName: 'Álvarez (Colocador)',
        zone: 'Z3',
        setDestinationZone: 'Z4',
        targetZone: 'Z4',
        setTempo: 'tempo_1_fast',
        system: 'K1',
        courtCoord: { x: 0.52, y: 0.58 },
        confidence: 0.98,
        impactAcousticConfidence: 0.89,
        isVerifiedGameAction: true,
        note: 'Colocación tensa en suspensión a Zona 4 (Tempo 1) desbordando al central'
      },
      {
        id: 'p1_att',
        phase: 'attack',
        timestamp: 8.4,
        team: 'home',
        playerNumber: '#7',
        playerName: 'Marta Ruiz (#7)',
        zone: 'Z4',
        originZone: 'Z4',
        targetZone: 'Z4',
        attackType: 'diagonal_sharp',
        attackOutcome: 'kill',
        courtCoord: { x: 0.34, y: 0.50 },
        confidence: 0.97,
        impactAcousticConfidence: 0.96,
        isVerifiedGameAction: true,
        note: 'Remate potente diagonal en Zona 4 a 96 km/h sobrepasando el doble bloqueo'
      },
      {
        id: 'p1_block',
        phase: 'block',
        timestamp: 8.6,
        team: 'away',
        playerNumber: '#4 & #8',
        playerName: 'Doble Bloqueo',
        zone: 'Z2',
        targetZone: 'Z4',
        blockType: 'double',
        blockTouched: true,
        confidence: 0.94,
        impactAcousticConfidence: 0.88,
        isVerifiedGameAction: true,
        note: 'Toque de bloqueo rival en la red desviando el balón al campo zaguero'
      },
      {
        id: 'p1_def',
        phase: 'defense',
        timestamp: 9.8,
        team: 'away',
        playerNumber: '#11',
        playerName: 'Defensa Zaguera',
        zone: 'Z5',
        defenseType: 'field_defense',
        confidence: 0.91,
        impactAcousticConfidence: 0.85,
        isVerifiedGameAction: true,
        note: 'Defensa de campo forzada tras el remate diagonal en Zona 4'
      },
      {
        id: 'p1_whistle',
        phase: 'whistle',
        timestamp: 12.5,
        team: 'home',
        confidence: 0.99,
        impactAcousticConfidence: 0.99,
        isVerifiedGameAction: true,
        note: 'Silbato árbitro: Punto validado para CV Olímpico (10 - 8)'
      }
    ],
    cvTrackingData: {
      whistleDetectedSec: 12.5,
      whistleConfidence: 0.98,
      whistlePeakHz: 3850,
      audioCrestFactor: 16.4,
      applauseRejectionScore: 0.97,
      ballImpactConfidence: 0.95,
      ballPeakVelocityKmh: 96.5,
      falsePositiveFiltered: {
        isPreMatchGreeting: false,
        isApplauseFalsePositive: false,
        rejectedEventsCount: 2
      },
      ballTrajectory: [
        { x: 0.82, y: 0.18, t: 2.1 },
        { x: 0.55, y: 0.52, t: 2.7 },
        { x: 0.5, y: 0.78, t: 3.2 },
        { x: 0.52, y: 0.58, t: 6.8 },
        { x: 0.34, y: 0.50, t: 8.4 },
        { x: 0.65, y: 0.30, t: 9.5 }
      ],
      playerDetections: [
        { t: 3.2, team: 'home', bbox: [0.44, 0.68, 0.12, 0.22], playerNumber: '#13', pose: 'reception_slide' },
        { t: 6.8, team: 'home', bbox: [0.47, 0.48, 0.10, 0.22], playerNumber: '#2', pose: 'setter_jump' },
        { t: 8.4, team: 'home', bbox: [0.30, 0.42, 0.10, 0.24], playerNumber: '#7', pose: 'spike_apex' }
      ]
    },
    telestrations: [
      {
        id: 'tel_v1_set',
        timestamp: 6.8,
        note: 'Pase del Colocador: Fijar la mirada al central rival y abrir pase rápido a Zona 4',
        autoPauseDuration: 2.5,
        shapes: [
          {
            id: 'sh_spot_setter',
            type: 'spotlight',
            center: { x: 0.52, y: 0.58 },
            radius: 0.14,
            color: '#FACC15',
            width: 3
          },
          {
            id: 'sh_pass_arrow',
            type: 'arrow_dashed',
            start: { x: 0.52, y: 0.58 },
            end: { x: 0.34, y: 0.50 },
            color: '#3B82F6',
            width: 4
          },
          {
            id: 'sh_text_tempo',
            type: 'text',
            point: { x: 0.38, y: 0.54 },
            text: 'COLOCACIÓN RÁPIDA A ZONA 4',
            color: '#FFFFFF',
            fontSize: 14,
            width: 2
          }
        ]
      },
      {
        id: 'tel_v2_att',
        timestamp: 8.4,
        note: 'Batida de Ataque en Zona 4: #7 explota la diagonal sobre el doble bloqueo',
        autoPauseDuration: 2.5,
        shapes: [
          {
            id: 'sh_circle_spiker',
            type: 'circle',
            center: { x: 0.34, y: 0.50 },
            radius: 0.09,
            color: '#22C55E',
            width: 3
          },
          {
            id: 'sh_arrow_hit',
            type: 'arrow_solid',
            start: { x: 0.34, y: 0.50 },
            end: { x: 0.65, y: 0.30 },
            color: '#EF4444',
            width: 4
          },
          {
            id: 'sh_text_speed',
            type: 'text',
            point: { x: 0.45, y: 0.38 },
            text: 'REMATE DIAGONAL 96 km/h (PUNTO DIRECTO)',
            color: '#22C55E',
            fontSize: 13,
            width: 2
          }
        ]
      }
    ]
  },
  {
    id: 'rally_2_block_net',
    rallyNumber: 2,
    setNumber: 1,
    scoreHome: 10,
    scoreAway: 8,
    startTime: 6.0,
    endTime: 12.5,
    duration: 6.5,
    system: 'K2',
    servingTeam: 'home',
    winnerTeam: 'home',
    outcome: 'block_kill',
    outcomeDescription: 'Fase de bloqueo en la red y defensa de campo tras ataque por Zona 4',
    isStarred: true,
    preRollSec: 1.5,
    postRollSec: 1.0,
    contactPauseTimestamps: [8.6],
    phases: [
      {
        id: 'p2_set',
        phase: 'set',
        timestamp: 6.8,
        team: 'home',
        playerNumber: '#2',
        playerName: 'Álvarez (Colocador)',
        zone: 'Z3',
        setDestinationZone: 'Z4',
        targetZone: 'Z4',
        system: 'K1',
        confidence: 0.98,
        impactAcousticConfidence: 0.91,
        isVerifiedGameAction: true,
        note: 'Colocación rápida al extremo de Zona 4'
      },
      {
        id: 'p2_att',
        phase: 'attack',
        timestamp: 8.4,
        team: 'home',
        playerNumber: '#7',
        playerName: 'Marta Ruiz',
        zone: 'Z4',
        originZone: 'Z4',
        targetZone: 'Z4',
        attackOutcome: 'kill',
        confidence: 0.97,
        impactAcousticConfidence: 0.95,
        isVerifiedGameAction: true,
        note: 'Ataque fuerte en Z4 obligando al toque de bloqueo rival'
      },
      {
        id: 'p2_block',
        phase: 'block',
        timestamp: 8.6,
        team: 'away',
        playerNumber: '#4 & #8',
        playerName: 'Doble Bloqueo Rival',
        zone: 'Z2',
        targetZone: 'Z4',
        blockType: 'double',
        blockTouched: true,
        confidence: 0.95,
        impactAcousticConfidence: 0.89,
        isVerifiedGameAction: true,
        note: 'Bloqueo doble rival invadiendo red en zona 4'
      },
      {
        id: 'p2_def',
        phase: 'defense',
        timestamp: 9.8,
        team: 'away',
        playerNumber: '#11',
        playerName: 'Defensa Zaguera',
        zone: 'Z5',
        defenseType: 'field_defense',
        confidence: 0.92,
        impactAcousticConfidence: 0.87,
        isVerifiedGameAction: true,
        note: 'Defensa forzada que no logra recuperar el balón'
      },
      {
        id: 'p2_whistle',
        phase: 'whistle',
        timestamp: 12.0,
        team: 'home',
        confidence: 0.99,
        impactAcousticConfidence: 0.99,
        isVerifiedGameAction: true,
        note: 'Punto anotado por el ataque'
      }
    ],
    cvTrackingData: {
      whistleDetectedSec: 12.0,
      whistleConfidence: 0.98,
      whistlePeakHz: 3840,
      audioCrestFactor: 15.9,
      applauseRejectionScore: 0.96,
      ballImpactConfidence: 0.93,
      ballPeakVelocityKmh: 92.0,
      falsePositiveFiltered: {
        isPreMatchGreeting: false,
        isApplauseFalsePositive: false,
        rejectedEventsCount: 1
      },
      ballTrajectory: [
        { x: 0.52, y: 0.58, t: 6.8 },
        { x: 0.34, y: 0.50, t: 8.4 },
        { x: 0.65, y: 0.30, t: 9.5 }
      ],
      playerDetections: [
        { t: 8.6, team: 'away', bbox: [0.32, 0.36, 0.16, 0.24], playerNumber: '#4 & #8', pose: 'block_apex' }
      ]
    },
    telestrations: [
      {
        id: 'tel_v_block',
        timestamp: 8.6,
        note: 'Posición del Doble Bloqueo: Penetración de manos sobre la red',
        autoPauseDuration: 2.5,
        shapes: [
          {
            id: 'sh_rect_shadow',
            type: 'rect',
            start: { x: 0.30, y: 0.38 },
            end: { x: 0.42, y: 0.55 },
            color: '#3B82F6',
            width: 3
          },
          {
            id: 'sh_text_shadow',
            type: 'text',
            point: { x: 0.28, y: 0.34 },
            text: 'DOBLE BLOQUEO EN RED',
            color: '#3B82F6',
            fontSize: 14,
            width: 2
          }
        ]
      }
    ]
  },
  {
    id: 'rally_3_rec_k1',
    rallyNumber: 3,
    setNumber: 1,
    scoreHome: 9,
    scoreAway: 8,
    startTime: 1.0,
    endTime: 7.5,
    duration: 6.5,
    system: 'K1',
    servingTeam: 'away',
    winnerTeam: 'home',
    outcome: 'attack_kill',
    outcomeDescription: 'Secuencia de Saque y Recepción perfecta (#) del Líbero #13 Navarro',
    isStarred: true,
    preRollSec: 1.0,
    postRollSec: 1.0,
    contactPauseTimestamps: [3.2],
    phases: [
      {
        id: 'p3_serve',
        phase: 'serve',
        timestamp: 2.1,
        team: 'away',
        playerNumber: '#1',
        playerName: 'Kowalski',
        zone: 'Z1',
        targetZone: 'Z6',
        serveType: 'jump_power',
        serveSpeedKmh: 104,
        confidence: 0.95,
        impactAcousticConfidence: 0.92,
        isVerifiedGameAction: true,
        note: 'Saque en salto con bote tenso'
      },
      {
        id: 'p3_rec',
        phase: 'reception',
        timestamp: 3.2,
        team: 'home',
        playerNumber: '#13',
        playerName: 'Líbero (#13 Navarro)',
        zone: 'Z6',
        targetZone: 'Z3',
        receptionQuality: '#',
        confidence: 0.96,
        impactAcousticConfidence: 0.93,
        isVerifiedGameAction: true,
        note: 'Recepción en plancha (#) enviando el balón perfecto al colocador'
      },
      {
        id: 'p3_set',
        phase: 'set',
        timestamp: 6.8,
        team: 'home',
        playerNumber: '#2',
        zone: 'Z3',
        setDestinationZone: 'Z4',
        targetZone: 'Z4',
        confidence: 0.98,
        impactAcousticConfidence: 0.90,
        isVerifiedGameAction: true,
        note: 'Colocación abierta a Zona 4'
      }
    ],
    cvTrackingData: {
      whistleDetectedSec: 7.0,
      whistleConfidence: 0.95,
      whistlePeakHz: 3820,
      audioCrestFactor: 15.2,
      applauseRejectionScore: 0.95,
      ballImpactConfidence: 0.94,
      ballPeakVelocityKmh: 104.0,
      falsePositiveFiltered: {
        isPreMatchGreeting: false,
        isApplauseFalsePositive: false,
        rejectedEventsCount: 0
      },
      ballTrajectory: [
        { x: 0.82, y: 0.18, t: 2.1 },
        { x: 0.5, y: 0.78, t: 3.2 }
      ],
      playerDetections: [
        { t: 3.2, team: 'home', bbox: [0.44, 0.68, 0.12, 0.22], playerNumber: '#13', pose: 'reception_slide' }
      ]
    },
    telestrations: [
      {
        id: 'tel_v_rec',
        timestamp: 3.2,
        note: 'Plataforma de recepción: Ángulo de antebrazos dirigido hacia Z3',
        autoPauseDuration: 2.5,
        shapes: [
          {
            id: 'sh_spot_libero',
            type: 'spotlight',
            center: { x: 0.5, y: 0.78 },
            radius: 0.14,
            color: '#10B981',
            width: 3
          },
          {
            id: 'sh_arrow_rec_pass',
            type: 'arrow_solid',
            start: { x: 0.5, y: 0.78 },
            end: { x: 0.52, y: 0.58 },
            color: '#10B981',
            width: 4
          },
          {
            id: 'sh_text_rec',
            type: 'text',
            point: { x: 0.42, y: 0.72 },
            text: 'RECEPCIÓN PERFECTA (#)',
            color: '#10B981',
            fontSize: 14,
            width: 2
          }
        ]
      }
    ]
  },
  {
    id: 'rally_4_set2_power',
    rallyNumber: 4,
    setNumber: 2,
    scoreHome: 4,
    scoreAway: 3,
    startTime: 1.5,
    endTime: 11.5,
    duration: 10.0,
    system: 'K1',
    servingTeam: 'away',
    winnerTeam: 'home',
    outcome: 'attack_kill',
    outcomeDescription: 'Salida de K1 en el 2º Set: Colocación y remate por Zona 4',
    isStarred: false,
    preRollSec: 1.0,
    postRollSec: 1.0,
    contactPauseTimestamps: [6.8, 8.4],
    phases: [
      {
        id: 'p4_serve',
        phase: 'serve',
        timestamp: 2.1,
        team: 'away',
        zone: 'Z1',
        targetZone: 'Z6',
        serveType: 'jump_power',
        confidence: 0.94,
        impactAcousticConfidence: 0.90,
        isVerifiedGameAction: true
      },
      {
        id: 'p4_rec',
        phase: 'reception',
        timestamp: 3.2,
        team: 'home',
        playerNumber: '#13',
        zone: 'Z6',
        receptionQuality: '+',
        confidence: 0.93,
        impactAcousticConfidence: 0.88,
        isVerifiedGameAction: true
      },
      {
        id: 'p4_set',
        phase: 'set',
        timestamp: 6.8,
        team: 'home',
        playerNumber: '#2',
        playerName: 'Álvarez',
        zone: 'Z3',
        setDestinationZone: 'Z4',
        targetZone: 'Z4',
        system: 'K1',
        confidence: 0.97,
        impactAcousticConfidence: 0.91,
        isVerifiedGameAction: true,
        note: 'Colocación precisa a la antena de Zona 4'
      },
      {
        id: 'p4_att',
        phase: 'attack',
        timestamp: 8.4,
        team: 'home',
        playerNumber: '#7',
        playerName: 'Marta Ruiz (#7)',
        zone: 'Z4',
        originZone: 'Z4',
        targetZone: 'Z4',
        attackOutcome: 'kill',
        confidence: 0.96,
        impactAcousticConfidence: 0.94,
        isVerifiedGameAction: true,
        note: 'Ataque diagonal por Zona 4 directo a la línea'
      },
      {
        id: 'p4_def',
        phase: 'defense',
        timestamp: 9.8,
        team: 'away',
        zone: 'Z5',
        defenseType: 'coverage',
        confidence: 0.89,
        impactAcousticConfidence: 0.84,
        isVerifiedGameAction: true,
        note: 'Cobertura defensiva rival desbordada'
      },
      {
        id: 'p4_whistle',
        phase: 'whistle',
        timestamp: 11.0,
        team: 'home',
        confidence: 0.98,
        impactAcousticConfidence: 0.98,
        isVerifiedGameAction: true
      }
    ],
    cvTrackingData: {
      whistleDetectedSec: 11.0,
      whistleConfidence: 0.96,
      whistlePeakHz: 3860,
      audioCrestFactor: 16.1,
      applauseRejectionScore: 0.95,
      ballImpactConfidence: 0.92,
      ballPeakVelocityKmh: 95.0,
      falsePositiveFiltered: {
        isPreMatchGreeting: false,
        isApplauseFalsePositive: false,
        rejectedEventsCount: 1
      },
      ballTrajectory: [
        { x: 0.52, y: 0.58, t: 6.8 },
        { x: 0.34, y: 0.50, t: 8.4 }
      ],
      playerDetections: []
    },
    telestrations: []
  }
];
