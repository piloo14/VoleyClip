import { ClubCrest, MatchSession, SportType } from '../types/tactical';

export const SPORT_TAGS: Record<SportType, string[]> = {
  basketball: [
    'Pick & Roll',
    'Contraataque',
    'Defensa Zonal',
    'Salida de Presión',
    'Tiro Liberado',
    'Rebote Ofensivo',
    'Aislamiento 1vs1',
    'Bloqueo Ciego',
    'Transición Rápida',
    'Falta Táctica'
  ],
  football: [
    'Presión Alta',
    'Salida de Balón',
    'Transición Ofensiva',
    'Repliegue Defensivo',
    'Balón Parado',
    'Centro Lateral',
    'Basculación',
    'Línea de Pase',
    '2vs1 Banda',
    'Duelo Aéreo'
  ],
  futsal: [
    'Juego de 4',
    'Juego con Pívot',
    'Portero-Jugador',
    'Defensa de Rombo',
    'Saque de Banda',
    'Transición 3x2',
    'Presión Asfixiante'
  ],
  handball: [
    'Cruce de Primera Línea',
    'Pase a Pivote',
    'Contraataque 1ª Oleada',
    'Defensa 6-0',
    'Defensa 5-1 Avanzada',
    'Lanzamiento 9 Metros',
    'Superioridad Numérica'
  ],
  volleyball: [
    'Recepción y Pase',
    'Ataque por Zona 4',
    'Bloqueo Doble',
    'Finta / Dejada',
    'Defensa en Campo',
    'Saque Táctico',
    'Transición Colocador'
  ],
  custom: [
    'Ataque Posicional',
    'Defensa Organizada',
    'Error No Forzado',
    'Éxito Táctico',
    'Pérdida de Posesión',
    'Recuperación Rápida'
  ]
};

// Preset SVG Club Crests encoded as clean SVG data URIs
export const PRESET_CRESTS: ClubCrest[] = [
  {
    id: 'crest_hawks',
    name: 'CB Halcones Tácticos',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23F59E0B"/><stop offset="100%" stop-color="%23DC2626"/></linearGradient></defs><polygon points="50,5 92,20 80,85 50,98 20,85 8,20" fill="url(%23g1)" stroke="%23FFF" stroke-width="3"/><path d="M50 22 L65 42 L50 38 L35 42 Z" fill="%23FFF"/><circle cx="50" cy="62" r="14" fill="%231E293B" stroke="%23FFF" stroke-width="2"/><path d="M43 62 L57 62 M50 55 L50 69" stroke="%23F59E0B" stroke-width="2"/><text x="50" y="88" fill="%23FFF" font-size="7" font-weight="bold" font-family="sans-serif" text-anchor="middle">CORTAZO PRO</text></svg>',
    position: 'top-right',
    size: 64,
    opacity: 0.9,
    isCustom: false
  },
  {
    id: 'crest_atletico',
    name: 'Atlético Club Deportivo',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%232563EB"/><stop offset="100%" stop-color="%231E1B4B"/></linearGradient></defs><path d="M50 8 C80 8 90 25 90 55 C90 80 50 96 50 96 C50 96 10 80 10 55 C10 25 20 8 50 8 Z" fill="url(%23g2)" stroke="%2338BDF8" stroke-width="3"/><path d="M30 25 L70 25 M30 35 L70 35" stroke="%23FFF" stroke-width="4"/><circle cx="50" cy="60" r="12" fill="%23FFF"/><polygon points="50,52 53,58 60,58 55,62 57,68 50,64 43,68 45,62 40,58 47,58" fill="%232563EB"/></svg>',
    position: 'top-left',
    size: 64,
    opacity: 0.9,
    isCustom: false
  },
  {
    id: 'crest_titanes',
    name: 'Titanes Baloncesto',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%2310B981"/><stop offset="100%" stop-color="%23064E3B"/></linearGradient></defs><polygon points="50,6 94,30 78,92 22,92 6,30" fill="url(%23g3)" stroke="%23A7F3D0" stroke-width="3"/><circle cx="50" cy="50" r="18" fill="none" stroke="%23FFF" stroke-width="3"/><line x1="32" y1="50" x2="68" y2="50" stroke="%23FFF" stroke-width="2"/><line x1="50" y1="32" x2="50" y2="68" stroke="%23FFF" stroke-width="2"/><text x="50" y="82" fill="%23FFF" font-size="8" font-weight="bold" font-family="sans-serif" text-anchor="middle">TITANES</text></svg>',
    position: 'top-right',
    size: 64,
    opacity: 0.9,
    isCustom: false
  },
  {
    id: 'crest_real',
    name: 'Real Sport Club',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g4" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23E11D48"/><stop offset="100%" stop-color="%234C0519"/></linearGradient></defs><circle cx="50" cy="52" r="42" fill="url(%23g4)" stroke="%23FB7185" stroke-width="3"/><path d="M35 25 L50 15 L65 25 L60 35 L40 35 Z" fill="%23FBBF24" stroke="%23FFF" stroke-width="1.5"/><circle cx="35" cy="24" r="2.5" fill="%23FFF"/><circle cx="50" cy="14" r="2.5" fill="%23FFF"/><circle cx="65" cy="24" r="2.5" fill="%23FFF"/><text x="50" y="65" fill="%23FFF" font-size="16" font-weight="900" font-family="sans-serif" text-anchor="middle">RSC</text></svg>',
    position: 'bottom-right',
    size: 64,
    opacity: 0.85,
    isCustom: false
  }
];

export const INITIAL_MATCH_SESSIONS: MatchSession[] = [
  {
    id: 'session_demo_volleyball',
    title: 'Superliga Voleibol: TAURON PlusLiga - CV Olímpico vs CV Dragones',
    sport: 'volleyball',
    videoSource: {
      type: 'sample',
      url: '',
      title: 'Partido Oficial Voleibol',
      duration: 0
    },
    homeTeam: 'CV Olímpico (Local)',
    awayTeam: 'CV Dragones (Visitante)',
    homeColor: '#F59E0B',
    awayColor: '#2563EB',
    periods: [
      { id: 'set_1', name: '1º Set (9-8)', startSec: 0, endSec: 13.5 },
      { id: 'set_2', name: '2º Set (4-3)', startSec: 13.5, endSec: 15.88 }
    ],
    possessions: [
      { id: 'v_p1', team: 'away', startSec: 0.8, endSec: 2.5, note: 'Saque en salto rival', periodId: 'set_1' },
      { id: 'v_p2', team: 'home', startSec: 2.5, endSec: 5.5, note: 'Recepción Líbero #13 (#)', periodId: 'set_1' },
      { id: 'v_p3', team: 'home', startSec: 5.5, endSec: 8.5, note: 'Colocación y Ataque Z4 (#7 Marta Ruiz)', periodId: 'set_1' },
      { id: 'v_p4', team: 'home', startSec: 8.5, endSec: 13.5, note: 'Punto anotado tras toque de bloqueo', periodId: 'set_1' }
    ],
    clips: [
      {
        id: 'clip_pnr_1',
        title: 'Pick & Roll Central con Ventaja en Esquina',
        startTime: 1.0,
        endTime: 5.5,
        periodId: 'q1',
        tags: ['Pick & Roll', 'Tiro Liberado', 'Transición Rápida'],
        isFavorite: true,
        notes: 'Fijarse en cómo el base lee la caída del pívot. El defensor de esquina duda y deja libre al tirador en 45º. Mantener esta rotación.',
        createdAt: Date.now() - 3600000,
        telestrations: [
          {
            id: 'tel_1',
            timestamp: 2.8,
            note: 'Punto de decisión: Bloqueador rueda al aro y arrastra 2 defensores',
            autoPauseDuration: 3,
            shapes: [
              {
                id: 'sh_spotlight',
                type: 'spotlight',
                center: { x: 0.48, y: 0.52 },
                radius: 0.16,
                color: '#FACC15',
                width: 3
              },
              {
                id: 'sh_circle_1',
                type: 'circle',
                center: { x: 0.48, y: 0.52 },
                radius: 0.08,
                color: '#FACC15',
                width: 3
              },
              {
                id: 'sh_arrow_move',
                type: 'arrow_solid',
                start: { x: 0.48, y: 0.52 },
                end: { x: 0.65, y: 0.68 },
                color: '#22C55E',
                width: 4
              },
              {
                id: 'sh_arrow_pass',
                type: 'arrow_dashed',
                start: { x: 0.48, y: 0.52 },
                end: { x: 0.22, y: 0.72 },
                color: '#3B82F6',
                width: 3
              },
              {
                id: 'sh_text',
                type: 'text',
                point: { x: 0.18, y: 0.8 },
                text: 'TIRADOR SOLO EN 45º',
                color: '#FFFFFF',
                fontSize: 14,
                width: 2
              }
            ]
          }
        ],
        lowerThird: {
          show: true,
          category: 'ATAQUE POSICIONAL',
          title: 'Lectura de Pick & Roll Central',
          coachNote: 'Atacar el cambio defensivo con pase al lado débil',
          players: '#7 García, #14 Ruiz',
          displayMode: 'intro'
        }
      },
      {
        id: 'clip_contra_2',
        title: 'Transición Rápida 3x2 tras Rebote Defensivo',
        startTime: 6.5,
        endTime: 11.2,
        periodId: 'q2',
        tags: ['Contraataque', 'Transición Rápida'],
        isFavorite: true,
        notes: 'Velocidad de ejecución perfecta. Máximo 3 botes hasta pasar campo contrario. Buena apertura de calles laterales.',
        createdAt: Date.now() - 1800000,
        telestrations: [
          {
            id: 'tel_2',
            timestamp: 8.5,
            note: 'Fijar al defensor central antes de abrir a banda',
            autoPauseDuration: 3,
            shapes: [
              {
                id: 'sh_circle_ball',
                type: 'circle',
                center: { x: 0.51, y: 0.46 },
                radius: 0.06,
                color: '#EF4444',
                width: 3
              },
              {
                id: 'sh_arrow_run',
                type: 'arrow_solid',
                start: { x: 0.32, y: 0.6 },
                end: { x: 0.15, y: 0.4 },
                color: '#FACC15',
                width: 3
              },
              {
                id: 'sh_rect_zone',
                type: 'rect',
                start: { x: 0.7, y: 0.3 },
                end: { x: 0.92, y: 0.65 },
                color: '#22C55E',
                width: 2
              },
              {
                id: 'sh_text_zone',
                type: 'text',
                point: { x: 0.72, y: 0.26 },
                text: 'ZONA LIBRE DE AYUDA',
                color: '#22C55E',
                fontSize: 13,
                width: 2
              }
            ]
          }
        ],
        lowerThird: {
          show: true,
          category: 'TRANSICIÓN',
          title: 'Salida Rápida 3x2',
          coachNote: 'Llegada de trailers por carril central',
          players: '#10 López, #23 Davis',
          displayMode: 'always'
        }
      },
      {
        id: 'clip_defensa_3',
        title: 'Ajuste Defensivo en Ayuda y Recuperación',
        startTime: 11.5,
        endTime: 14.8,
        periodId: 'q4',
        tags: ['Defensa Zonal', 'Falta Táctica'],
        isFavorite: false,
        notes: 'El alero llega tarde a la rotación defensiva. Debemos anticipar el pase antes de que salga de las manos.',
        createdAt: Date.now() - 900000,
        telestrations: [],
        lowerThird: {
          show: true,
          category: 'DEFENSA',
          title: 'Rotación del Lado Débil',
          coachNote: 'Comunicación en el segundo pase',
          players: '#5 Torres',
          displayMode: 'intro'
        }
      }
    ],
    crest: PRESET_CRESTS[0],
    availableTags: SPORT_TAGS.basketball
  },
  {
    id: 'session_demo_football',
    title: 'Análisis Fútbol: Salida de Balón y Presión Alta',
    sport: 'football',
    videoSource: {
      type: 'sample',
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      title: 'Fútbol Táctico - Bloque Medio y Transiciones (HD)',
      duration: 20.0
    },
    homeTeam: 'CF Atlético Táctico',
    awayTeam: 'Unión Deportiva Rivals',
    homeColor: '#EF4444',
    awayColor: '#3B82F6',
    periods: [
      { id: '1p', name: '1ª Parte (0-45m)', startSec: 0, endSec: 10 },
      { id: '2p', name: '2ª Parte (45-90m)', startSec: 10, endSec: 20 }
    ],
    possessions: [
      { id: 'f_p1', team: 'home', startSec: 0, endSec: 6.0, note: 'Construcción desde portero', periodId: '1p' },
      { id: 'f_p2', team: 'away', startSec: 6.0, endSec: 12.0, note: 'Recuperación en tres cuartos', periodId: '1p' },
      { id: 'f_p3', team: 'home', startSec: 12.0, endSec: 20.0, note: 'Ataque posicional por banda izquierda', periodId: '2p' }
    ],
    clips: [
      {
        id: 'f_clip_1',
        title: 'Presión Alta Coordinada en Saque de Puerta',
        startTime: 2.0,
        endTime: 7.5,
        periodId: '1p',
        tags: ['Presión Alta', 'Basculación'],
        isFavorite: true,
        notes: 'Obligar al central derecho a jugar hacia su pierna débil. Tapar la línea con el mediocentro defensivo.',
        createdAt: Date.now() - 4000000,
        telestrations: [],
        lowerThird: {
          show: true,
          category: 'PRESIÓN DEFENSIVA',
          title: 'Bloque Alto en Salida',
          coachNote: 'Cerrar pasillo interior',
          players: '#9 Delantero, #10 Mediapunta',
          displayMode: 'intro'
        }
      }
    ],
    crest: PRESET_CRESTS[1],
    availableTags: SPORT_TAGS.football
  }
];
