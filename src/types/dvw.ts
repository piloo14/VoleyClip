export type DvwTeamSide = 'home' | 'away';

export type DvwSkillCode = 'S' | 'R' | 'E' | 'A' | 'B' | 'D' | 'F';

export type DvwEvaluationCode = '#' | '+' | '!' | '-' | '/' | '=';

export interface DvwPlayer {
  team: DvwTeamSide;
  number: string; // e.g. "08" or "8" normalized integer string
  paddedNumber: string; // 2-digit e.g. "08"
  firstName: string;
  lastName: string;
  fullName: string;
}

export interface DvwAction {
  id: string;
  set: number;
  team: DvwTeamSide;
  playerNumber: string; // integer string e.g. "8"
  paddedPlayerNumber: string; // e.g. "08"
  playerName: string;
  skill: DvwSkillCode;
  evaluation: DvwEvaluationCode | '';
  dvwTimestamp: number; // raw seconds from .dvw file
  rallyId: number;
  rallyStartDvwTimestamp: number;
  rallyEndDvwTimestamp: number;
  rawCode: string;
}

export interface DvwMatchData {
  filename: string;
  homeTeam: string;
  awayTeam: string;
  players: DvwPlayer[];
  actions: DvwAction[];
  setsPresent: number[];
  firstServeBySet: Record<number, number>; // set number -> dvwTimestamp of first serve 'S'
  totalRallies: number;
}

export interface DvwClipFilterOptions {
  mode: 'action' | 'rally';
  team: 'all' | 'home' | 'away';
  set: 'all' | number;
  playerKey: 'all' | string; // `${team}:${number}`
  skill: 'all' | DvwSkillCode;
  evaluation: 'all' | DvwEvaluationCode;
  preRollSec: number;
  postRollSec: number;
}
