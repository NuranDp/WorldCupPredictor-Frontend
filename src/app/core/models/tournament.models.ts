export interface TournamentConfig {
  startDate: string;
  bracketLockDate: string;
  isActive: boolean;
  season: string;
  isBracketLocked: boolean;
}

export interface Team {
  id: number;
  name: string;
  flagUrl: string;
  fifaCode: string;
  seeding: number;
  fifaRanking: number;
}

export interface TournamentGroup {
  id: number;
  name: string;
  teams: Team[];
}

export interface MatchSlot {
  id: number;
  slotNumber: number;
  round: string;
}

// Bracket state models
export interface GroupPick {
  groupId: number;
  groupName: string;
  firstTeamId: number | null;
  secondTeamId: number | null;
}

export interface KnockoutPick {
  matchId: number;
  slotNumber: number;
  round: string;
  pickedTeamId: number | null;
  homeScore: number | null;
  awayScore: number | null;
  lineupPlayerIds: number[];
  kickOffTime: string | null; // ISO date string from API
}

export interface PlayerDto {
  id: number;
  name: string;
  position: string;
  shirtNumber: number;
}

export interface Best3rdPick {
  rank: number;       // 1-8
  teamId: number | null;
}

export interface BracketDto {
  id: number;
  isLocked: boolean;
  totalPoints: number;
  submittedAt: string;
  tier: string;
  groupPicks: GroupPick[];
  knockoutPicks: KnockoutPick[];
  best3rdPicks: Best3rdPick[];
}

// R32 slot → [homeDesc, awayDesc] labels
export const R32_PAIRINGS: Record<number, [string, string]> = {
  1:  ['A 1st', 'B 2nd'],
  2:  ['B 1st', 'A 2nd'],
  3:  ['C 1st', 'D 2nd'],
  4:  ['D 1st', 'C 2nd'],
  5:  ['E 1st', 'F 2nd'],
  6:  ['F 1st', 'E 2nd'],
  7:  ['G 1st', 'H 2nd'],
  8:  ['H 1st', 'G 2nd'],
  9:  ['I 1st', 'J 2nd'],
  10: ['J 1st', 'I 2nd'],
  11: ['K 1st', 'L 2nd'],
  12: ['L 1st', 'K 2nd'],
  13: ['Best 3rd #1', 'Best 3rd #2'],
  14: ['Best 3rd #3', 'Best 3rd #4'],
  15: ['Best 3rd #5', 'Best 3rd #6'],
  16: ['Best 3rd #7', 'Best 3rd #8'],
};

// ── Draft models ──────────────────────────────────────────────────────────────

export interface GroupPickSubmitPayload { groupId: number; firstTeamId: number | null; secondTeamId: number | null; }
export interface KnockoutPickSubmitPayload { matchId: number; pickedTeamId: number | null; homeScore: number | null; awayScore: number | null; lineupPlayerIds: number[]; }
export interface Best3rdPickSubmitPayload { rank: number; teamId: number | null; }

export interface BracketDraftMeta {
  id: number;
  name: string;
  tier: string;
  createdAt: string;
  updatedAt: string;
  isSubmittedFinal: boolean;
}

export interface BracketDraftFull extends BracketDraftMeta {
  groupPicks: GroupPickSubmitPayload[];
  knockoutPicks: KnockoutPickSubmitPayload[];
  best3rdPicks: Best3rdPickSubmitPayload[];
}

// Bracket tree: slot → [child slot A, child slot B]
export const BRACKET_TREE: Record<number, [number, number]> = {
  17: [1, 2],
  18: [3, 4],
  19: [5, 6],
  20: [7, 8],
  21: [9, 10],
  22: [11, 12],
  23: [13, 14],
  24: [15, 16],
  25: [17, 18],
  26: [19, 20],
  27: [21, 22],
  28: [23, 24],
  29: [25, 26],
  30: [27, 28],
  31: [29, 30], // 3rd place (losers)
  32: [29, 30], // Final (winners)
};
