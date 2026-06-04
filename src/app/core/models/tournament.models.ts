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

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  name: string;
  avatarUrl?: string;
  totalPoints: number;
  submittedAt?: string;
  shareToken?: string;
}

export interface BracketDto {
  id: number;
  shareToken: string;
  isLocked: boolean;
  totalPoints: number;
  submittedAt: string;
  tier: string;
  groupPicks: GroupPick[];
  knockoutPicks: KnockoutPick[];
  best3rdPicks: Best3rdPick[];
}

// R32 slot → [homeDesc, awayDesc] labels
// Slots map to FIFA matches 73-88 in order (slot 1 = match 73, slot 16 = match 88)
// Away label '3rd' means the away team is a best-3rd-place qualifier;
// eligible source groups are defined in R32_THIRD_ELIGIBLE below.
export const R32_PAIRINGS: Record<number, [string, string]> = {
  1:  ['A 2nd', 'B 2nd'],   // Match 73: Runner-up A vs Runner-up B
  2:  ['E 1st', '3rd'],     // Match 74: Winner E  vs Best 3rd (A/B/C/D/F)
  3:  ['F 1st', 'C 2nd'],   // Match 75: Winner F  vs Runner-up C
  4:  ['C 1st', 'F 2nd'],   // Match 76: Winner C  vs Runner-up F
  5:  ['I 1st', '3rd'],     // Match 77: Winner I  vs Best 3rd (C/D/F/G/H)
  6:  ['E 2nd', 'I 2nd'],   // Match 78: Runner-up E vs Runner-up I
  7:  ['A 1st', '3rd'],     // Match 79: Winner A  vs Best 3rd (C/E/F/H/I)
  8:  ['L 1st', '3rd'],     // Match 80: Winner L  vs Best 3rd (E/H/I/J/K)
  9:  ['D 1st', '3rd'],     // Match 81: Winner D  vs Best 3rd (B/E/F/I/J)
  10: ['G 1st', '3rd'],     // Match 82: Winner G  vs Best 3rd (A/E/H/I/J)
  11: ['K 2nd', 'L 2nd'],   // Match 83: Runner-up K vs Runner-up L
  12: ['H 1st', 'J 2nd'],   // Match 84: Winner H  vs Runner-up J
  13: ['B 1st', '3rd'],     // Match 85: Winner B  vs Best 3rd (E/F/G/I/J)
  14: ['J 1st', 'H 2nd'],   // Match 86: Winner J  vs Runner-up H
  15: ['K 1st', '3rd'],     // Match 87: Winner K  vs Best 3rd (D/E/I/J/L)
  16: ['D 2nd', 'G 2nd'],   // Match 88: Runner-up D vs Runner-up G
};

// For each R32 slot that hosts a best-3rd-place team (away side),
// the eligible source groups from which that 3rd-place team must come.
// Used to assign the 8 best-3rd picks to their correct slots via bipartite matching.
export const R32_THIRD_ELIGIBLE: Record<number, string[]> = {
  2:  ['A', 'B', 'C', 'D', 'F'],   // Match 74
  5:  ['C', 'D', 'F', 'G', 'H'],   // Match 77
  7:  ['C', 'E', 'F', 'H', 'I'],   // Match 79
  8:  ['E', 'H', 'I', 'J', 'K'],   // Match 80
  9:  ['B', 'E', 'F', 'I', 'J'],   // Match 81
  10: ['A', 'E', 'H', 'I', 'J'],   // Match 82
  13: ['E', 'F', 'G', 'I', 'J'],   // Match 85
  15: ['D', 'E', 'I', 'J', 'L'],   // Match 87
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
