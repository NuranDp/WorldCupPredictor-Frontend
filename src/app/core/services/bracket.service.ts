import { Injectable, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  BracketDto, GroupPick, KnockoutPick, Team,
  TournamentGroup, MatchSlot, BRACKET_TREE, R32_PAIRINGS,
} from '../models/tournament.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BracketService {
  private readonly api = `${environment.apiUrl}/bracket`;

  groupPicks = signal<GroupPick[]>([]);
  knockoutPicks = signal<KnockoutPick[]>([]);
  /** 8 slots (index 0-7 = rank 1-8). Pairing: 0v1→slot13, 2v3→slot14, 4v5→slot15, 6v7→slot16 */
  best3rdPicks = signal<(number | null)[]>(Array(8).fill(null));
  isLocked = signal(false);
  totalPoints = signal(0);
  bracketId = signal<number | null>(null);
  tier = signal<'Bronze' | 'Silver' | 'Gold'>('Bronze');

  // All teams from the tournament, keyed by id for quick lookup
  private teamMap = signal<Record<number, Team>>({});

  private static readonly CACHE_KEY = 'wcp_bracket_draft';

  constructor(private http: HttpClient) {
    this.restoreFromCache();
    effect(() => {
      const draft = {
        tier: this.tier(),
        groupPicks: this.groupPicks(),
        knockoutPicks: this.knockoutPicks(),
        best3rdPicks: this.best3rdPicks(),
      };
      localStorage.setItem(BracketService.CACHE_KEY, JSON.stringify(draft));
    });
  }

  private restoreFromCache(): void {
    try {
      const raw = localStorage.getItem(BracketService.CACHE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.tier) this.tier.set(draft.tier);
      if (Array.isArray(draft.groupPicks)) this.groupPicks.set(draft.groupPicks);
      if (Array.isArray(draft.knockoutPicks)) this.knockoutPicks.set(draft.knockoutPicks);
      if (Array.isArray(draft.best3rdPicks)) this.best3rdPicks.set(draft.best3rdPicks);
    } catch {
      localStorage.removeItem(BracketService.CACHE_KEY);
    }
  }

  /** Clear all bracket state and cache — call on logout. */
  reset(): void {
    this.groupPicks.set([]);
    this.knockoutPicks.set([]);
    this.best3rdPicks.set(Array(8).fill(null));
    this.isLocked.set(false);
    this.totalPoints.set(0);
    this.bracketId.set(null);
    this.tier.set('Bronze');
    this.teamMap.set({});
    localStorage.removeItem(BracketService.CACHE_KEY);
  }

  loadTeams(groups: TournamentGroup[]): void {
    const map: Record<number, Team> = {};
    groups.forEach(g => g.teams.forEach(t => (map[t.id] = t)));
    this.teamMap.set(map);
  }

  getTeam(id: number | null): Team | null {
    return id ? (this.teamMap()[id] ?? null) : null;
  }

  loadBracket(): Observable<BracketDto> {
    return this.http.get<BracketDto>(`${this.api}/me`).pipe(
      tap(b => this.applyBracket(b))
    );
  }

  loadSharedBracket(bracketId: number): Observable<BracketDto> {
    return this.http.get<BracketDto>(`${this.api}/share/${bracketId}`).pipe(
      tap(b => this.applyBracket(b))
    );
  }

  save(): Observable<BracketDto> {
    const payload = {
      tier: this.tier(),
      groupPicks: this.groupPicks().map(gp => ({
        groupId: gp.groupId,
        firstTeamId: gp.firstTeamId,
        secondTeamId: gp.secondTeamId,
      })),
      knockoutPicks: this.knockoutPicks().map(kp => ({
        matchId: kp.matchId,
        pickedTeamId: kp.pickedTeamId,
        homeScore: kp.homeScore,
        awayScore: kp.awayScore,
        lineupPlayerIds: kp.lineupPlayerIds,
      })),
      best3rdPicks: this.best3rdPicks().map((teamId, i) => ({
        rank: i + 1,
        teamId,
      })),
    };
    return this.http.post<BracketDto>(this.api, payload).pipe(
      tap(b => this.applyBracket(b))
    );
  }

  initSlots(slots: MatchSlot[]): void {
    const existing = this.knockoutPicks();
    const merged: KnockoutPick[] = slots.map(s => {
      const ex = existing.find(k => k.matchId === s.id);
      return ex ?? { matchId: s.id, slotNumber: s.slotNumber, round: s.round, pickedTeamId: null, homeScore: null, awayScore: null, lineupPlayerIds: [] };
    });
    this.knockoutPicks.set(merged);
  }

  setGroupPick(groupId: number, groupName: string, firstTeamId: number | null, secondTeamId: number | null): void {
    const picks = [...this.groupPicks()];
    const idx = picks.findIndex(p => p.groupId === groupId);
    const pick: GroupPick = { groupId, groupName, firstTeamId, secondTeamId };
    if (idx >= 0) picks[idx] = pick; else picks.push(pick);
    this.groupPicks.set(picks);
    // Cascade: clear knockout picks that depended on this group's picks
    this.clearDependentKnockoutPicks(groupId);
  }

  /** Toggle a team in/out of the best-3rd list (max 8). index = 0-based rank position. */
  setBest3rdPick(index: number, teamId: number | null): void {
    const picks = [...this.best3rdPicks()];
    picks[index] = teamId;
    this.best3rdPicks.set(picks);
    // Clear R32 knockout picks for slots 13-16 since participants changed
    this.clearSlots13to16KnockoutPicks();
  }

  /** Add a team to the first empty slot, or remove it if already present. */
  toggleBest3rdTeam(teamId: number): void {
    const picks = [...this.best3rdPicks()];
    const existingIdx = picks.indexOf(teamId);
    if (existingIdx >= 0) {
      picks[existingIdx] = null;
    } else {
      const emptyIdx = picks.indexOf(null);
      if (emptyIdx >= 0) picks[emptyIdx] = teamId;
    }
    this.best3rdPicks.set(picks);
    this.clearSlots13to16KnockoutPicks();
  }

  isBest3rdSelected(teamId: number): boolean {
    return this.best3rdPicks().includes(teamId);
  }

  get best3rdCount(): number {
    return this.best3rdPicks().filter(t => t !== null).length;
  }

  setKnockoutPick(matchId: number, teamId: number | null): void {
    const picks = this.knockoutPicks().map(p =>
      p.matchId === matchId ? { ...p, pickedTeamId: teamId, lineupPlayerIds: [] } : p
    );
    this.knockoutPicks.set(picks);
    // Clear downstream picks when a pick changes
    this.clearDownstreamPicks(matchId);
  }

  setKnockoutScore(matchId: number, homeScore: number | null, awayScore: number | null): void {
    const picks = this.knockoutPicks().map(p =>
      p.matchId === matchId ? { ...p, homeScore, awayScore } : p
    );
    this.knockoutPicks.set(picks);
  }

  setKnockoutLineup(matchId: number, playerIds: number[]): void {
    const picks = this.knockoutPicks().map(p =>
      p.matchId === matchId ? { ...p, lineupPlayerIds: playerIds } : p
    );
    this.knockoutPicks.set(picks);
  }

  setTier(tier: 'Bronze' | 'Silver' | 'Gold'): void {
    this.tier.set(tier);
  }

  // Resolve which team should appear in a given R32/knockout slot based on picks
  resolveTeamForSlot(slotNumber: number, side: 'home' | 'away'): Team | null {
    if (slotNumber <= 16) {
      return this.resolveR32Team(slotNumber, side);
    }
    // For R16+, the team comes from the winner of a previous slot
    const children = BRACKET_TREE[slotNumber];
    if (!children) return null;
    const childSlot = side === 'home' ? children[0] : children[1];
    const childPick = this.knockoutPicks().find(p => p.slotNumber === childSlot);
    return childPick?.pickedTeamId ? this.getTeam(childPick.pickedTeamId) : null;
  }

  get champion(): Team | null {
    const finalPick = this.knockoutPicks().find(p => p.slotNumber === 32);
    return finalPick?.pickedTeamId ? this.getTeam(finalPick.pickedTeamId) : null;
  }

  get groupPicksComplete(): boolean {
    return this.groupPicks().length === 12 &&
      this.groupPicks().every(g => g.firstTeamId !== null && g.secondTeamId !== null);
  }

  private resolveR32Team(slot: number, side: 'home' | 'away'): Team | null {
    // Slots 13-16 are populated by best-3rd-place picks
    if (slot >= 13 && slot <= 16) {
      // Pairing: slot13=ranks1&2, slot14=ranks3&4, slot15=ranks5&6, slot16=ranks7&8
      const baseIdx = (slot - 13) * 2;           // 0, 2, 4, 6
      const idx = baseIdx + (side === 'home' ? 0 : 1);
      const teamId = this.best3rdPicks()[idx] ?? null;
      return this.getTeam(teamId);
    }

    const pairingKey = R32_PAIRINGS[slot];
    if (!pairingKey) return null;

    // Decode e.g. "A 1st" → group A, first pick
    const label = side === 'home' ? pairingKey[0] : pairingKey[1];
    const match = label.match(/^([A-L]) (1st|2nd)$/);
    if (!match) return null;

    const groupName = match[1];
    const position = match[2]; // '1st' or '2nd'
    const groupPick = this.groupPicks().find(g => g.groupName === groupName);
    if (!groupPick) return null;

    const teamId = position === '1st' ? groupPick.firstTeamId : groupPick.secondTeamId;
    return this.getTeam(teamId);
  }

  private clearDependentKnockoutPicks(_groupId: number): void {
    // When group picks change, clear all knockout picks
    this.knockoutPicks.set(
      this.knockoutPicks().map(p => ({ ...p, pickedTeamId: null, homeScore: null, awayScore: null, lineupPlayerIds: [] }))
    );
    // Smart clear: only remove best3rd entries for teams that are now
    // qualified (picked as 1st or 2nd in any group). Leave other picks intact.
    const qualifiedIds = new Set<number>();
    this.groupPicks().forEach(p => {
      if (p.firstTeamId)  qualifiedIds.add(p.firstTeamId);
      if (p.secondTeamId) qualifiedIds.add(p.secondTeamId);
    });
    const updated = this.best3rdPicks().map(teamId =>
      teamId !== null && qualifiedIds.has(teamId) ? null : teamId
    );
    this.best3rdPicks.set(updated);
  }

  private clearSlots13to16KnockoutPicks(): void {
    // Clear knockout winner picks for slots 13-16 and their downstream
    const slotsToReset = new Set<number>([13, 14, 15, 16]);
    [13, 14, 15, 16].forEach(s =>
      this.getDownstreamSlots(s).forEach(d => slotsToReset.add(d))
    );
    this.knockoutPicks.set(
      this.knockoutPicks().map(p =>
        slotsToReset.has(p.slotNumber) ? { ...p, pickedTeamId: null, homeScore: null, awayScore: null, lineupPlayerIds: [] } : p
      )
    );
  }

  private clearDownstreamPicks(changedMatchId: number): void {
    const changed = this.knockoutPicks().find(p => p.matchId === changedMatchId);
    if (!changed) return;

    const downstreamSlots = this.getDownstreamSlots(changed.slotNumber);
    const picks = this.knockoutPicks().map(p =>
      downstreamSlots.has(p.slotNumber) ? { ...p, pickedTeamId: null, homeScore: null, awayScore: null, lineupPlayerIds: [] } : p
    );
    this.knockoutPicks.set(picks);
  }

  private getDownstreamSlots(slot: number): Set<number> {
    const downstream = new Set<number>();
    for (const [parent, children] of Object.entries(BRACKET_TREE)) {
      if (children[0] === slot || children[1] === slot) {
        const parentSlot = parseInt(parent);
        downstream.add(parentSlot);
        this.getDownstreamSlots(parentSlot).forEach(s => downstream.add(s));
      }
    }
    return downstream;
  }

  /** Public wrapper so external callers (e.g. DraftController submit) can apply a BracketDto. */
  applyFromDto(b: BracketDto): void {
    this.applyBracket(b);
  }

  private applyBracket(b: BracketDto): void {
    if (!b) return; // 204 No Content when user has no bracket yet
    this.bracketId.set(b.id);
    this.isLocked.set(b.isLocked);
    this.totalPoints.set(b.totalPoints);
    this.tier.set((b.tier as 'Bronze' | 'Silver' | 'Gold') ?? 'Bronze');
    this.groupPicks.set(b.groupPicks);

    // Merge knockout picks with any already-initialised slots
    const existing = this.knockoutPicks();
    const merged = existing.map(slot => {
      const saved = b.knockoutPicks.find(k => k.matchId === slot.matchId);
      return saved
        ? { ...slot, pickedTeamId: saved.pickedTeamId, homeScore: saved.homeScore ?? null, awayScore: saved.awayScore ?? null, lineupPlayerIds: saved.lineupPlayerIds ?? [] }
        : slot;
    });
    this.knockoutPicks.set(merged);

    // Load best-3rd picks (ranks 1-8 → indices 0-7)
    if (b.best3rdPicks?.length) {
      const arr: (number | null)[] = Array(8).fill(null);
      b.best3rdPicks.forEach(p => { if (p.rank >= 1 && p.rank <= 8) arr[p.rank - 1] = p.teamId; });
      this.best3rdPicks.set(arr);
    }
  }
}
