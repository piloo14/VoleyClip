import {
  DvwAction,
  DvwClipFilterOptions,
  DvwEvaluationCode,
  DvwMatchData,
  DvwPlayer,
  DvwSkillCode,
  DvwTeamSide
} from '../types/dvw';
import { ManualTacticalClip } from '../types/manualTactical';

export const SKILL_LABELS: Record<DvwSkillCode, string> = {
  S: 'Saque',
  R: 'Recepción',
  E: 'Colocación',
  A: 'Ataque',
  B: 'Bloqueo',
  D: 'Defensa',
  F: 'Freeball'
};

export const EVALUATION_LABELS: Record<DvwEvaluationCode, string> = {
  '#': 'Punto / Excelente (#)',
  '+': 'Positiva (+)',
  '!': 'Neutra (!)',
  '-': 'Negativa (-)',
  '/': 'Devolución / Bloqueado (/)',
  '=': 'Error (=)'
};

const VALID_SKILLS = new Set<string>(['S', 'R', 'E', 'A', 'B', 'D', 'F']);
const VALID_EVALS = new Set<string>(['#', '+', '!', '-', '/', '=']);

/**
 * Decodes raw .dvw ArrayBuffer handling UTF-16 BOM, UTF-8, and Windows-1252 / ISO-8859-1
 * so Spanish accents and ñ remain intact.
 */
export function decodeDvwBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let text = '';

  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    text = new TextDecoder('utf-16le').decode(buffer);
  } else if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    text = new TextDecoder('utf-16be').decode(buffer);
  } else {
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    } catch {
      try {
        text = new TextDecoder('windows-1252').decode(buffer);
      } catch {
        text = new TextDecoder('iso-8859-1').decode(buffer);
      }
    }
  }

  return text.replace(/^\uFEFF/, '').replace(/\u0000/g, '');
}

function normalizeJersey(raw: string, allowUnknown = false): { num: string; padded: string } | null {
  const trimmed = raw.trim();
  if (allowUnknown && trimmed === '$$') {
    return { num: '0', padded: '00' };
  }
  if (!/^\d{1,2}$/.test(trimmed)) return null;
  const parsed = parseInt(trimmed, 10);
  return {
    num: String(parsed),
    padded: String(parsed).padStart(2, '0')
  };
}

function parsePlayerRow(line: string, team: DvwTeamSide): DvwPlayer | null {
  const cols = line.split(';');
  if (cols.length < 3) return null;

  const jersey = normalizeJersey(cols[1] || '');
  if (!jersey) return null;

  // Standard DVW columns: col 9 = lastName, col 10 = firstName, col 11 = nickname
  let lastName = (cols[9] || '').trim();
  let firstName = (cols[10] || '').trim();
  const nickname = (cols[11] || '').trim();

  // Fallback if an export variant shifted names into col 8/9 or only nickname
  if (!firstName && !lastName && cols[8] && isNaN(Number(cols[8].trim()))) {
    lastName = cols[8].trim();
  }
  if (!firstName && !lastName && nickname) {
    firstName = nickname;
  }

  const fullName =
    [firstName, lastName].filter(Boolean).join(' ').trim() || `Jugadora #${jersey.num}`;

  return {
    team,
    number: jersey.num,
    paddedNumber: jersey.padded,
    firstName,
    lastName,
    fullName
  };
}

const CLOCK_HMS_RE = /^(\d{1,2})[.:](\d{2})[.:](\d{2})(?:[.,](\d+))?$/;
const CLOCK_MS_RE = /^(\d{1,3}):(\d{2})(?:[.,](\d+))?$/;

function parseClockHMS(raw: string): number | null {
  const s = raw.trim();
  const m = s.match(CLOCK_HMS_RE);
  if (!m) return null;
  const hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const ss = parseInt(m[3], 10);
  const frac = m[4] ? parseFloat(`0.${m[4]}`) : 0;
  if (hh > 48 || mm >= 60 || ss >= 60) return null;
  return +(hh * 3600 + mm * 60 + ss + frac).toFixed(3);
}

function parseFlexibleTimeToken(raw: string): number | null {
  const s = raw.trim().replace(',', '.');
  if (!s) return null;

  if (/^\d+(\.\d+)?$/.test(s)) {
    const val = parseFloat(s);
    if (Number.isFinite(val) && val >= 0 && val <= 86400) {
      return val;
    }
    return null;
  }

  const hms = parseClockHMS(s);
  if (hms !== null) return hms;

  const ms = s.match(CLOCK_MS_RE);
  if (ms) {
    const mm = parseInt(ms[1], 10);
    const ss = parseInt(ms[2], 10);
    const frac = ms[3] ? parseFloat(`0.${ms[3]}`) : 0;
    if (ss < 60) {
      return +(mm * 60 + ss + frac).toFixed(3);
    }
  }

  return null;
}

/**
 * Finds the clock-time column index (HH.MM.SS or HH:MM:SS) in a [3SCOUT] row.
 * Standard DV4 puts this at index 7, though some exports shift +/- 1 column.
 */
function findClockColumnIndex(parts: string[]): number {
  if (parts.length > 7 && CLOCK_HMS_RE.test((parts[7] || '').trim())) {
    return 7;
  }
  const maxCheck = Math.min(parts.length - 1, 11);
  for (let i = 3; i <= maxCheck; i++) {
    if (CLOCK_HMS_RE.test((parts[i] || '').trim())) {
      return i;
    }
  }
  return -1;
}

interface ExtractedRowTiming {
  clockColIdx: number;
  videoTs: number | null;
  clockTs: number | null;
}

function extractRowTiming(parts: string[]): ExtractedRowTiming {
  const clockColIdx = findClockColumnIndex(parts);
  const clockTs = clockColIdx !== -1 ? parseClockHMS(parts[clockColIdx] || '') : null;

  let videoTs: number | null = null;
  if (clockColIdx !== -1) {
    const videoColIdx = clockColIdx + 5; // standard: 7 + 5 = 12
    if (parts.length > videoColIdx) {
      videoTs = parseFlexibleTimeToken(parts[videoColIdx] || '');
    }
  } else {
    // Check standard index 12 first if present and non-empty
    if (parts.length > 12) {
      videoTs = parseFlexibleTimeToken(parts[12] || '');
    }
    // Otherwise check the last non-empty field in compact custom rows (<= 14 cols)
    if (videoTs === null && parts.length <= 14) {
      for (let i = parts.length - 1; i >= 1; i--) {
        const token = (parts[i] || '').trim();
        if (!token) continue;
        if (i >= 8 && i <= 10 && /^\d$/.test(token)) continue;
        videoTs = parseFlexibleTimeToken(token);
        if (videoTs !== null) break;
      }
    }
  }

  return { clockColIdx, videoTs, clockTs };
}

interface RawParsedAction {
  id: string;
  set: number;
  team: DvwTeamSide;
  playerNumber: string;
  paddedPlayerNumber: string;
  playerName: string;
  skill: DvwSkillCode;
  evaluation: DvwEvaluationCode | '';
  videoTs: number | null;
  clockTs: number | null;
  dvwTimestamp: number;
  rawCode: string;
}

/**
 * Parses a complete Data Volley (.dvw) file string into teams, rosters, scouted actions,
 * set boundaries, first-serve timestamps, and rally intervals.
 */
export function parseDvwContent(content: string, filename = 'partido.dvw'): DvwMatchData {
  const lines = content.split(/\r?\n/);

  let section = '';
  const teamNames: string[] = [];
  const players: DvwPlayer[] = [];
  const playerLookup = new Map<string, DvwPlayer>();

  let currentSet = 1;
  const setsFound = new Set<number>();
  const firstServeBySet: Record<number, number> = {};

  const scoutEvents: Array<
    | { kind: 'action'; action: RawParsedAction }
    | { kind: 'point'; set: number; videoTs: number | null; clockTs: number | null }
    | { kind: 'set'; set: number }
  > = [];

  let videoTsActionCount = 0;
  let maxVideoTs = 0;
  let clockTsActionCount = 0;

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('[') && line.endsWith(']')) {
      section = line.toUpperCase();
      continue;
    }

    if (section === '[3TEAMS]') {
      const cols = line.split(';');
      const name = (cols[1] || cols[0] || '').trim();
      if (name) teamNames.push(name);
      continue;
    }

    if (section === '[3PLAYERS-H]') {
      const player = parsePlayerRow(line, 'home');
      if (player) {
        players.push(player);
        playerLookup.set(`home:${player.number}`, player);
      }
      continue;
    }

    if (section === '[3PLAYERS-V]') {
      const player = parsePlayerRow(line, 'away');
      if (player) {
        players.push(player);
        playerLookup.set(`away:${player.number}`, player);
      }
      continue;
    }

    if (section === '[3SCOUT]') {
      // Detect set markers like **1set, **2set, etc.
      const setMatch = line.match(/^\*\*(\d+)set/i);
      if (setMatch) {
        currentSet = Math.max(1, Math.min(5, parseInt(setMatch[1], 10)));
        setsFound.add(currentSet);
        scoutEvents.push({ kind: 'set', set: currentSet });
        continue;
      }

      if (!line.startsWith('*') && !line.startsWith('a') && !line.startsWith('A')) {
        continue;
      }

      const parts = line.split(';');
      const code = parts[0] || '';
      if (code.length < 2) continue;

      const timing = extractRowTiming(parts);
      const setColIdx = timing.clockColIdx !== -1 ? timing.clockColIdx + 1 : 8;

      if (parts.length > setColIdx && /^\d$/.test((parts[setColIdx] || '').trim())) {
        const colSet = parseInt(parts[setColIdx].trim(), 10);
        if (colSet >= 1 && colSet <= 5) {
          currentSet = colSet;
        }
      }

      // Check point marker (*p01:00 or ap01:00)
      if (code[1] === 'p' || code[1] === 'P') {
        scoutEvents.push({
          kind: 'point',
          set: currentSet,
          videoTs: timing.videoTs,
          clockTs: timing.clockTs
        });
        continue;
      }

      // Standard player scout line: *08AH#... or a12SM+... or *$$...
      if (code.length < 4) continue;
      const team: DvwTeamSide = code[0] === '*' ? 'home' : 'away';
      const jerseyRaw = code.slice(1, 3);
      const jersey = normalizeJersey(jerseyRaw, true);
      if (!jersey) continue;

      const skillChar = (code[3] || '').toUpperCase();
      if (!VALID_SKILLS.has(skillChar)) continue;

      // Evaluation is standard at char index 5, fallback to index 4 if omitted hit-type
      let evalChar = code[5] || '';
      if (!VALID_EVALS.has(evalChar)) {
        evalChar = VALID_EVALS.has(code[4] || '') ? code[4] : '';
      }

      if (timing.videoTs === null && timing.clockTs === null) {
        // Ignore lines without any valid timestamp safely
        continue;
      }

      if (timing.videoTs !== null) {
        videoTsActionCount += 1;
        if (timing.videoTs > maxVideoTs) maxVideoTs = timing.videoTs;
      }
      if (timing.clockTs !== null) clockTsActionCount += 1;

      const playerObj = playerLookup.get(`${team}:${jersey.num}`);
      const playerName = playerObj
        ? playerObj.fullName
        : jersey.num === '0'
          ? 'Jugadora Desconocida'
          : `Jugadora #${jersey.num}`;

      scoutEvents.push({
        kind: 'action',
        action: {
          id: `dvw_${idx}_${team}_${jersey.num}`,
          set: currentSet,
          team,
          playerNumber: jersey.num,
          paddedPlayerNumber: jersey.padded,
          playerName,
          skill: skillChar as DvwSkillCode,
          evaluation: evalChar as DvwEvaluationCode | '',
          videoTs: timing.videoTs,
          clockTs: timing.clockTs,
          dvwTimestamp: 0,
          rawCode: code
        }
      });
    }
  }

  // Prefer explicit DVW video timestamps when available (and not all-zero placeholders);
  // otherwise fall back cleanly to HH.MM.SS match clock.
  const useVideoTs = videoTsActionCount > 0 && (maxVideoTs > 0 || clockTsActionCount === 0);
  const resolvedEvents: typeof scoutEvents = [];

  for (const ev of scoutEvents) {
    if (ev.kind === 'set') {
      resolvedEvents.push(ev);
    } else if (ev.kind === 'point') {
      resolvedEvents.push(ev);
    } else if (ev.kind === 'action') {
      const ts = useVideoTs ? ev.action.videoTs : ev.action.clockTs;
      if (ts === null) continue;
      ev.action.dvwTimestamp = ts;
      setsFound.add(ev.action.set);
      if (ev.action.skill === 'S' && firstServeBySet[ev.action.set] === undefined) {
        firstServeBySet[ev.action.set] = ts;
      }
      resolvedEvents.push(ev);
    }
  }

  // Fallback for firstServeBySet if a set had actions but no 'S' coded first
  for (const ev of resolvedEvents) {
    if (ev.kind === 'action') {
      if (firstServeBySet[ev.action.set] === undefined) {
        firstServeBySet[ev.action.set] = ev.action.dvwTimestamp;
      }
    }
  }

  // Second pass: group actions into Rallies (from Serve 'S' until point 'p' or next Serve / Set)
  const actions: DvwAction[] = [];
  let rallyCounter = 0;
  let currentRallyActions: RawParsedAction[] = [];

  const flushRally = (pointEndTimestamp?: number | null) => {
    if (currentRallyActions.length === 0) return;
    rallyCounter += 1;
    const startTs = currentRallyActions[0].dvwTimestamp;
    const lastActionTs = currentRallyActions[currentRallyActions.length - 1].dvwTimestamp;
    const endTs =
      pointEndTimestamp !== null &&
      pointEndTimestamp !== undefined &&
      pointEndTimestamp >= lastActionTs
        ? pointEndTimestamp
        : lastActionTs;

    for (const act of currentRallyActions) {
      actions.push({
        id: act.id,
        set: act.set,
        team: act.team,
        playerNumber: act.playerNumber,
        paddedPlayerNumber: act.paddedPlayerNumber,
        playerName: act.playerName,
        skill: act.skill,
        evaluation: act.evaluation,
        dvwTimestamp: act.dvwTimestamp,
        rallyId: rallyCounter,
        rallyStartDvwTimestamp: startTs,
        rallyEndDvwTimestamp: endTs,
        rawCode: act.rawCode
      });
    }
    currentRallyActions = [];
  };

  for (const ev of resolvedEvents) {
    if (ev.kind === 'set') {
      flushRally();
    } else if (ev.kind === 'point') {
      const pTs = useVideoTs ? ev.videoTs : ev.clockTs;
      flushRally(pTs);
    } else if (ev.kind === 'action') {
      if (ev.action.skill === 'S' && currentRallyActions.length > 0) {
        flushRally();
      }
      currentRallyActions.push(ev.action);
    }
  }
  flushRally();

  const setsPresent = Array.from(setsFound).sort((a, b) => a - b);

  return {
    filename,
    homeTeam: teamNames[0] || 'Equipo Local',
    awayTeam: teamNames[1] || 'Equipo Visitante',
    players,
    actions,
    setsPresent: setsPresent.length > 0 ? setsPresent : [1],
    firstServeBySet,
    totalRallies: rallyCounter
  };
}

/**
 * Resolves the effective video offset (seconds) for a given Set.
 * If Set N hasn't been explicitly synced, falls back to Set 1's offset (if synced).
 */
export function resolveSetOffset(
  setNumber: number,
  setOffsets: Record<number, number>
): number {
  if (setOffsets[setNumber] !== undefined) {
    return setOffsets[setNumber];
  }
  if (setOffsets[1] !== undefined) {
    return setOffsets[1];
  }
  return 0;
}

export interface GeneratedDvwClipPreview {
  key: string;
  title: string;
  set: number;
  skill: DvwSkillCode;
  startTime: number;
  endTime: number;
  duration: number;
  action: DvwAction;
}

/**
 * Filters DVW actions and produces synchronized clip definitions (Action or Full Rally mode)
 * clamped cleanly to [0, videoDuration].
 */
export function buildDvwClipsPreview(
  dvw: DvwMatchData,
  filters: DvwClipFilterOptions,
  setOffsets: Record<number, number>,
  videoDuration: number
): GeneratedDvwClipPreview[] {
  const matchingActions = dvw.actions.filter((act) => {
    if (filters.team !== 'all' && act.team !== filters.team) return false;
    if (filters.set !== 'all' && act.set !== filters.set) return false;
    if (filters.playerKey !== 'all' && `${act.team}:${act.playerNumber}` !== filters.playerKey) {
      return false;
    }
    if (filters.skill !== 'all' && act.skill !== filters.skill) return false;
    if (filters.evaluation !== 'all' && act.evaluation !== filters.evaluation) return false;
    return true;
  });

  const maxDur = videoDuration > 0 ? videoDuration : Number.POSITIVE_INFINITY;
  const pre = Math.max(0, filters.preRollSec);
  const post = Math.max(0, filters.postRollSec);

  const clampWindow = (rawStart: number, rawEnd: number) => {
    const start = Math.max(0, Math.min(maxDur - 0.3, rawStart));
    const end = Math.min(maxDur, Math.max(start + 0.3, rawEnd));
    return {
      startTime: +start.toFixed(2),
      endTime: +end.toFixed(2),
      duration: +(end - start).toFixed(2)
    };
  };

  if (filters.mode === 'action') {
    return matchingActions
      .map((act) => {
        const offset = resolveSetOffset(act.set, setOffsets);
        const videoTime = act.dvwTimestamp + offset;
        const win = clampWindow(videoTime - pre, videoTime + post);
        const evalSuffix = act.evaluation ? ` (${act.evaluation})` : '';
        const title = `S${act.set} | #${act.playerNumber} ${act.playerName} | ${SKILL_LABELS[act.skill]}${evalSuffix}`;

        return {
          key: act.id,
          title,
          set: act.set,
          skill: act.skill,
          ...win,
          action: act
        };
      })
      .filter((c) => c.duration >= 0.25 && c.endTime > 0);
  }

  // Rally mode: deduplicate by rallyId while keeping the matched action's descriptive label
  const seenRallies = new Set<number>();
  const results: GeneratedDvwClipPreview[] = [];

  for (const act of matchingActions) {
    if (seenRallies.has(act.rallyId)) continue;
    seenRallies.add(act.rallyId);

    const offset = resolveSetOffset(act.set, setOffsets);
    const rallyStartVideo = act.rallyStartDvwTimestamp + offset;
    const rallyEndVideo = act.rallyEndDvwTimestamp + offset;
    const win = clampWindow(rallyStartVideo - pre, rallyEndVideo + post);
    const evalSuffix = act.evaluation ? ` (${act.evaluation})` : '';
    const title = `S${act.set} | Punto · #${act.playerNumber} ${act.playerName} | ${SKILL_LABELS[act.skill]}${evalSuffix}`;

    results.push({
      key: `rally_${act.rallyId}`,
      title,
      set: act.set,
      skill: act.skill,
      ...win,
      action: act
    });
  }

  return results.filter((c) => c.duration >= 0.25 && c.endTime > 0);
}

/**
 * Maps a DVW skill code to the matching default VoleyClip tactical folder ID.
 */
export function mapSkillToDefaultFolderId(skill: DvwSkillCode, fallbackFolderId: string): string {
  switch (skill) {
    case 'E':
      return 'folder_colocacion';
    case 'A':
      return 'folder_ataque_z4';
    case 'B':
    case 'D':
      return 'folder_defensa';
    case 'R':
      return 'folder_recepcion';
    default:
      return fallbackFolderId;
  }
}

export function convertDvwPreviewToClips(
  previews: GeneratedDvwClipPreview[],
  targetFolderMode: 'active' | 'by_skill' | string,
  activeFolderId: string
): ManualTacticalClip[] {
  const now = Date.now();
  return previews.map((p, idx) => {
    const folderId =
      targetFolderMode === 'active'
        ? activeFolderId
        : targetFolderMode === 'by_skill'
          ? mapSkillToDefaultFolderId(p.skill, activeFolderId)
          : targetFolderMode;

    return {
      id: `clip_dvw_${now}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      title: p.title,
      folderId,
      startTime: p.startTime,
      endTime: p.endTime,
      duration: p.duration,
      notes: `DVW Set ${p.set} · ${p.action.team === 'home' ? 'Local' : 'Visitante'}`,
      createdAt: now + idx
    };
  });
}
