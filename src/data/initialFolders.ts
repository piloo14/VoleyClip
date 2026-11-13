import { VolleyballFolder, ManualTacticalClip } from '../types/manualTactical';

export const DEFAULT_VOLLEYBALL_FOLDERS: VolleyballFolder[] = [
  {
    id: 'folder_colocacion',
    name: 'Colocación',
    icon: '🏐',
    color: '#F59E0B', // Amber
    shortcutKey: 'C',
    description: 'Pases del colocador, tiempos y distribución de juego'
  },
  {
    id: 'folder_ataque_z4',
    name: 'Ataque Z4',
    icon: '💥',
    color: '#EF4444', // Red
    shortcutKey: '4',
    description: 'Remates y diagonales por la punta / ala izquierda (Zona 4)'
  },
  {
    id: 'folder_ataque_z3',
    name: 'Ataque Z3',
    icon: '💥',
    color: '#F97316', // Orange
    shortcutKey: '3',
    description: 'Primer tiempo, ataques rápidos del central (Zona 3)'
  },
  {
    id: 'folder_ataque_z2',
    name: 'Ataque Z2',
    icon: '💥',
    color: '#A855F7', // Purple
    shortcutKey: '2',
    description: 'Ataques del opuesto por la banda derecha (Zona 2)'
  },
  {
    id: 'folder_defensa',
    name: 'Defensa',
    icon: '🛡️',
    color: '#06B6D4', // Cyan
    shortcutKey: 'D',
    description: 'Defensas de campo, bloqueos tocados y coberturas'
  },
  {
    id: 'folder_recepcion',
    name: 'Recepción',
    icon: '📥',
    color: '#10B981', // Emerald
    shortcutKey: 'R',
    description: 'Pases de saque del líbero y receptores (#, +, !)'
  }
];

export const INITIAL_MANUAL_CLIPS: ManualTacticalClip[] = [];
