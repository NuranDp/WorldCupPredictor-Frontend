import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BracketService } from '../../../core/services/bracket.service';
import { R32_PAIRINGS, BRACKET_TREE, Team } from '../../../core/models/tournament.models';

interface TeamSlot { team: Team | null; label: string }
interface MatchDisplay {
  matchId: number;
  slotNumber: number;
  pickedTeamId: number | null;
  homeScore: number | null;
  awayScore: number | null;
  lineupPlayerIds: number[];
  home: TeamSlot;
  away: TeamSlot;
}

interface RoundConfig {
  label: string;
  tabLabel: string;
  superLabel: string;
  slots: number[];
  gradient: string;
}

const ROUNDS: RoundConfig[] = [
  { label: 'Round of 32',    tabLabel: 'R32',   superLabel: 'KNOCKOUT',   slots: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16], gradient: 'linear-gradient(135deg,#1a237e,#283593)' },
  { label: 'Round of 16',    tabLabel: 'R16',   superLabel: 'KNOCKOUT',   slots: [17,18,19,20,21,22,23,24],                 gradient: 'linear-gradient(135deg,#0d47a1,#1565c0)' },
  { label: 'Quarter-Finals', tabLabel: 'QF',    superLabel: 'KNOCKOUT',   slots: [25,26,27,28],                             gradient: 'linear-gradient(135deg,#311b92,#4527a0)' },
  { label: 'Semi-Finals',    tabLabel: 'SF',    superLabel: 'KNOCKOUT',   slots: [29,30],                                   gradient: 'linear-gradient(135deg,#4a148c,#6a1b9a)' },
  { label: '3rd Place',      tabLabel: '3rd',   superLabel: 'MATCH',      slots: [31],                                      gradient: 'linear-gradient(135deg,#4e342e,#6d4c41)' },
  { label: 'Final',          tabLabel: 'Final', superLabel: 'WORLD CUP',  slots: [32],                                      gradient: 'linear-gradient(135deg,#e65100,#f9a825)' },
];

@Component({
  selector: 'app-knockout',
  standalone: true,
  imports: [FormsModule],
  template: `
    <!-- ── Round tabs ──────────────────────────────────────────── -->
    <div class="tabs-wrap">
      <div class="round-tabs">
        @for (round of rounds; track round.tabLabel; let i = $index) {
          <button class="r-tab"
                  [class.active]="i === activeIdx()"
                  [class.done]="isRoundDone(round)"
                  (click)="selectRound(i)">
            <span class="r-tab-label">{{ round.tabLabel }}</span>
            @if (isRoundDone(round)) {
              <span class="r-tab-check">✓</span>
            } @else if (pickedCount(round) > 0) {
              <span class="r-tab-badge">{{ pickedCount(round) }}/{{ availableCount(round) }}</span>
            }
          </button>
        }
      </div>
    </div>

    <!-- ── Overall progress bar ──────────────────────────────────── -->
    <div class="progress-row">
      <div class="progress-track">
        <div class="progress-fill" [style.width.%]="totalProgressPct()"></div>
      </div>
      <span class="progress-label">{{ totalPicked() }} / 31 knockout picks</span>
    </div>

    <!-- ── Animated round panel ──────────────────────────────────── -->
    @let round = activeRound();
    @if (animating() && round) {
      <div class="round-panel" [class]="'round-panel dir-' + panelDir()">

        <!-- Panel header -->
        <div class="panel-header"
             [style.background]="isRoundDone(round) ? doneGradient : round.gradient">
          <div class="ph-left">
            <span class="ph-super">{{ round.superLabel }}</span>
            <span class="ph-name">{{ round.label }}</span>
          </div>
          <div class="ph-count" [class.ph-count-done]="isRoundDone(round)">
            <span class="ph-num">{{ pickedCount(round) }}</span>
            <span class="ph-sep">/</span>
            <span class="ph-tot">{{ availableCount(round) }}</span>
            @if (isRoundDone(round)) { <span class="ph-check">✓</span> }
          </div>
        </div>

        <!-- Match grid -->
        <div class="matches-grid">
          @for (slot of round.slots; track slot; let i = $index) {
            @let m = getMatch(slot);
            @if (m) {
              <div class="match-card"
                   [class.match-final]="slot === 32"
                   [class.match-third]="slot === 31"
                   [style.animation-delay.ms]="i * 45">

                <div class="match-slot">
                  @if (slot === 32) { 🏆 Final }
                  @else if (slot === 31) { 🥉 3rd Place }
                  @else { Match {{ slot }} }
                </div>

                <!-- Home team -->
                <button class="team-row"
                        [class.tr-picked]="m.pickedTeamId !== null && m.pickedTeamId === m.home.team?.id"
                        [class.tr-loser]="m.pickedTeamId !== null && m.pickedTeamId !== m.home.team?.id"
                        [class.tr-tbd]="!m.home.team"
                        [disabled]="!m.home.team || bracketService.isLocked()"
                        (click)="pick(m.matchId, m.home.team!.id, m.pickedTeamId)">
                  @if (m.home.team) {
                    <img [src]="m.home.team.flagUrl" [alt]="m.home.team.name" class="tr-flag">
                    <span class="tr-name">{{ m.home.team.name }}</span>
                    @if (m.pickedTeamId === m.home.team.id) {
                      <span class="tr-check">✓</span>
                    }
                  } @else {
                    <span class="tr-tbd-text">{{ m.home.label }}</span>
                  }
                </button>

                <!-- Silver: goal difference input (Win by N goals) -->
                @if (bracketService.tier() === 'Silver' && m.home.team && m.away.team) {
                  <div class="goaldiff-row">
                    <span class="gd-label">Win by</span>
                    <input class="score-input gd-input"
                           type="number" min="0" max="20"
                           placeholder="?"
                           [disabled]="bracketService.isLocked()"
                           [ngModel]="m.homeScore"
                           (ngModelChange)="updateScore(m.matchId, $event, null)"
                           (input)="clampScore($event)"
                           (click)="$event.stopPropagation()">
                    <span class="gd-label">goals</span>
                  </div>
                }

                <!-- Gold: exact scoreline (H : A) -->
                @if (bracketService.tier() === 'Gold' && m.home.team && m.away.team) {
                  <div class="score-row">
                    <input class="score-input"
                           type="number" min="0" max="20"
                           placeholder="–"
                           [disabled]="bracketService.isLocked()"
                           [ngModel]="m.homeScore"
                           (ngModelChange)="updateScore(m.matchId, $event, m.awayScore, m.home.team!.id, m.away.team!.id)"
                           (input)="clampScore($event)"
                           (click)="$event.stopPropagation()">
                    <span class="score-sep">:</span>
                    <input class="score-input"
                           type="number" min="0" max="20"
                           placeholder="–"
                           [disabled]="bracketService.isLocked()"
                           [ngModel]="m.awayScore"
                           (ngModelChange)="updateScore(m.matchId, m.homeScore, $event, m.home.team!.id, m.away.team!.id)"
                           (input)="clampScore($event)"
                           (click)="$event.stopPropagation()">
                  </div>
                }

                <!-- Away team -->
                <button class="team-row"
                        [class.tr-picked]="m.pickedTeamId !== null && m.pickedTeamId === m.away.team?.id"
                        [class.tr-loser]="m.pickedTeamId !== null && m.pickedTeamId !== m.away.team?.id"
                        [class.tr-tbd]="!m.away.team"
                        [disabled]="!m.away.team || bracketService.isLocked()"
                        (click)="pick(m.matchId, m.away.team!.id, m.pickedTeamId)">
                  @if (m.away.team) {
                    <img [src]="m.away.team.flagUrl" [alt]="m.away.team.name" class="tr-flag">
                    <span class="tr-name">{{ m.away.team.name }}</span>
                    @if (m.pickedTeamId === m.away.team.id) {
                      <span class="tr-check">✓</span>
                    }
                  } @else {
                    <span class="tr-tbd-text">{{ m.away.label }}</span>
                  }
                </button>

                @if (m.home.team && m.away.team && !bracketService.isLocked()) {
                  <button class="rank-pick-btn"
                          tabindex="-1"
                          (click)="pickByRanking(m.matchId, m.home.team, m.away.team, m.pickedTeamId)">
                    ★ Pick by ranking
                  </button>
                }

              </div>
            }
          }
        </div>

        <!-- Panel navigation -->
        <div class="panel-nav">
          <button class="panel-nav-btn"
                  [disabled]="activeIdx() === 0"
                  (click)="prev()">
            ← {{ rounds[activeIdx() - 1]?.tabLabel ?? '' }}
          </button>
          <div class="panel-dots">
            @for (r of rounds; track r.tabLabel; let i = $index) {
              <span class="p-dot"
                    [class.p-dot-active]="i === activeIdx()"
                    [class.p-dot-done]="isRoundDone(r)"
                    (click)="selectRound(i)">
              </span>
            }
          </div>
          <button class="panel-nav-btn next-btn"
                  [disabled]="activeIdx() === rounds.length - 1"
                  (click)="next()">
            {{ rounds[activeIdx() + 1]?.tabLabel ?? '' }} →
          </button>
        </div>

      </div>
    }
  `,
  styles: [`
    /* ── Tabs ─────────────────────────────────────────────────── */
    .tabs-wrap {
      position: relative;
      margin-bottom: 16px;
    }
    .round-tabs {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding: 4px 2px 6px;
      scrollbar-width: none;
    }
    .round-tabs::-webkit-scrollbar { display: none; }

    .r-tab {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      min-width: 52px;
      height: 52px;
      padding: 0 14px;
      border-radius: 26px;
      border: 2px solid #e0e0e0;
      background: white;
      color: #666;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.18s ease;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .r-tab:hover:not(.active) {
      border-color: #90caf9;
      background: #e3f2fd;
      color: #1565c0;
      transform: translateY(-1px);
    }
    .r-tab.active {
      background: #1a237e;
      border-color: #1a237e;
      color: white;
      box-shadow: 0 4px 12px rgba(26,35,126,0.35);
      transform: translateY(-2px);
    }
    .r-tab.done {
      background: #2e7d32;
      border-color: #2e7d32;
      color: white;
    }
    .r-tab.done.active {
      background: #1b5e20;
      border-color: #1b5e20;
      box-shadow: 0 4px 12px rgba(27,94,32,0.35);
    }
    .r-tab-label { font-size: 0.84rem; font-weight: 800; line-height: 1; }
    .r-tab-check { font-size: 0.6rem; }
    .r-tab-badge {
      font-size: 0.58rem;
      font-weight: 600;
      background: rgba(0,0,0,0.10);
      border-radius: 6px;
      padding: 1px 5px;
      line-height: 1.3;
    }
    .r-tab.active .r-tab-badge { background: rgba(255,255,255,0.25); }

    /* ── Progress ──────────────────────────────────────────────── */
    .progress-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .progress-track {
      flex: 1;
      height: 6px;
      background: #e0e0e0;
      border-radius: 3px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #1a237e, #43a047);
      border-radius: 3px;
      transition: width 0.4s ease;
    }
    .progress-label { font-size: 0.78rem; color: #888; white-space: nowrap; }

    /* ── Round panel ────────────────────────────────────────────── */
    .round-panel {
      background: white;
      border-radius: 16px;
      box-shadow: 0 2px 16px rgba(0,0,0,0.10);
      overflow: hidden;
    }

    @keyframes slideInRight {
      from { opacity: 0; transform: translateX(32px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes slideInLeft {
      from { opacity: 0; transform: translateX(-32px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    .dir-right { animation: slideInRight 0.22s cubic-bezier(0.22, 1, 0.36, 1); }
    .dir-left  { animation: slideInLeft  0.22s cubic-bezier(0.22, 1, 0.36, 1); }

    /* Panel header */
    .panel-header {
      padding: 14px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: white;
      transition: background 0.4s ease;
    }
    .ph-left { display: flex; flex-direction: column; gap: 1px; }
    .ph-super {
      font-size: 0.62rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.14em; opacity: 0.7;
    }
    .ph-name { font-size: 1.15rem; font-weight: 800; letter-spacing: 0.02em; }
    .ph-count { display: flex; align-items: baseline; gap: 2px; opacity: 0.85; }
    .ph-count.ph-count-done { opacity: 1; }
    .ph-num  { font-size: 1.6rem; font-weight: 800; line-height: 1; }
    .ph-sep  { font-size: 1rem; opacity: 0.6; }
    .ph-tot  { font-size: 1rem; opacity: 0.6; }
    .ph-check { font-size: 1rem; margin-left: 6px; }

    /* ── Matches grid ────────────────────────────────────────────── */
    .matches-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1px;
      background: #e8e8e8;
    }
    @media (max-width: 480px) {
      .matches-grid { grid-template-columns: 1fr 1fr; }
    }

    /* ── Match card ──────────────────────────────────────────────── */
    .match-card {
      background: white;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      animation: cardIn 0.3s ease-out both;
    }
    @keyframes cardIn {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .match-final  { background: #fffde7; }
    .match-third  { background: #fbe9e7; }

    .match-slot {
      font-size: 0.62rem; font-weight: 600;
      color: #bbb; text-align: right;
      margin-bottom: 2px;
      white-space: nowrap;
    }
    .match-final  .match-slot { color: #f9a825; }
    .match-third  .match-slot { color: #a1887f; }

    .match-vs {
      display: none; /* hidden — replaced by score row */
    }

    /* ── Score row ───────────────────────────────────────────────── */
    .score-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      margin: 2px 0;
    }
    .score-input {
      width: 36px;
      height: 32px;
      text-align: center;
      font-size: 1rem;
      font-weight: 700;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      outline: none;
      background: #f5f5f5;
      color: #1a237e;
      transition: border-color 0.15s, background 0.15s;
      -moz-appearance: textfield;
    }
    .score-input::-webkit-inner-spin-button,
    .score-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
    .score-input:focus:not(:disabled) {
      border-color: #1a237e;
      background: #e8eaf6;
    }
    .score-input:disabled { opacity: 0.5; cursor: default; }
    .score-sep {
      font-size: 1rem; font-weight: 800; color: #bbb;
    }

    /* ── Team rows ───────────────────────────────────────────────── */
    .team-row {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 7px 8px;
      border: none;
      border-radius: 8px;
      background: transparent;
      cursor: pointer;
      text-align: left;
      transition: background 0.15s ease, opacity 0.15s ease;
    }
    .team-row:hover:not(:disabled):not(.tr-picked) { background: #e3f2fd; }
    .team-row:disabled { cursor: default; }
    .team-row.tr-picked {
      background: #e8f5e9;
      animation: rowPickIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    @keyframes rowPickIn {
      from { background: #a5d6a7; transform: scaleX(0.97); }
      to   { background: #e8f5e9; transform: scaleX(1); }
    }
    .team-row.tr-loser { opacity: 0.3; }
    .team-row.tr-tbd   { cursor: default; }

    .tr-flag {
      width: 28px; height: 19px;
      object-fit: cover; border-radius: 3px;
      flex-shrink: 0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.15);
    }
    .tr-name {
      flex: 1; font-size: 0.8rem; font-weight: 500;
      min-width: 0; overflow: hidden;
      text-overflow: ellipsis; white-space: nowrap;
    }
    .tr-tbd-text {
      flex: 1; font-size: 0.75rem; color: #bbb;
      font-style: italic;
    }
    .tr-check {
      font-size: 0.75rem; font-weight: 700; color: #2e7d32;
      flex-shrink: 0;
      animation: checkPop 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    @keyframes checkPop {
      from { opacity: 0; transform: scale(0.3); }
      to   { opacity: 1; transform: scale(1); }
    }

    /* ── Goal diff row (Silver) ──────────────────────────────────── */
    .goaldiff-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin: 2px 0;
    }
    .gd-label {
      font-size: 0.68rem; font-weight: 600; color: #888;
      white-space: nowrap;
    }
    .gd-input { width: 40px; }
    .rank-pick-btn {
      display: block; width: 100%;
      padding: 4px; border: none; border-top: 1px solid #f0f0f0;
      background: transparent; color: #bbb;
      font-size: 0.6rem; font-weight: 600; cursor: pointer;
      transition: color 0.15s, background 0.15s;
    }
    .rank-pick-btn:hover { color: #1a237e; background: #f5f5f5; }

    /* ── Panel navigation ────────────────────────────────────────── */
    .panel-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 20px;
      border-top: 1px solid #f0f0f0;
      background: #fafafa;
    }
    .panel-nav-btn {
      background: none;
      border: 2px solid #e0e0e0;
      border-radius: 20px;
      padding: 6px 14px;
      font-size: 0.8rem;
      font-weight: 600;
      color: #555;
      cursor: pointer;
      transition: all 0.15s;
    }
    .panel-nav-btn:hover:not(:disabled) {
      border-color: #1a237e; color: #1a237e; background: #e8eaf6;
    }
    .panel-nav-btn:disabled { opacity: 0.25; cursor: default; }

    .panel-dots { display: flex; gap: 5px; align-items: center; }
    .p-dot {
      width: 7px; height: 7px;
      border-radius: 50%;
      background: #e0e0e0;
      cursor: pointer;
      transition: all 0.18s;
    }
    .p-dot:hover { background: #90caf9; transform: scale(1.3); }
    .p-dot.p-dot-active { background: #1a237e; width: 20px; border-radius: 4px; }
    .p-dot.p-dot-done:not(.p-dot-active) { background: #4caf50; }

    /* ── Mobile fixes ───────────────────────────────────────────── */
    @media (max-width: 480px) {
      .r-tab { min-width: 40px; height: 42px; padding: 0 10px; }
      .r-tab-label { font-size: 0.75rem; }
      .matches-grid { grid-template-columns: 1fr 1fr; }
      .panel-header { padding: 12px 14px; }
      .ph-name { font-size: 1rem; }
      .ph-num { font-size: 1.3rem; }
    }
    @media (max-width: 360px) {
      .matches-grid { grid-template-columns: 1fr; }
      .r-tab { min-width: 36px; padding: 0 8px; }
    }
  `],
})
export class KnockoutComponent {
  readonly bracketService = inject(BracketService);
  readonly rounds = ROUNDS;
  readonly doneGradient = 'linear-gradient(135deg,#1b5e20,#2e7d32)';

  activeIdx = signal(0);
  animating = signal(true);
  panelDir = signal<'right' | 'left'>('right');

  activeRound = computed(() => this.rounds[this.activeIdx()] ?? null);

  totalPicked = computed(() =>
    this.bracketService.knockoutPicks().filter(p => p.pickedTeamId !== null).length
  );
  totalProgressPct = computed(() => (this.totalPicked() / 31) * 100);

  selectRound(i: number): void {
    if (i === this.activeIdx() || i < 0 || i >= this.rounds.length) return;
    this.panelDir.set(i > this.activeIdx() ? 'right' : 'left');
    this.animating.set(false);
    setTimeout(() => {
      this.activeIdx.set(i);
      this.animating.set(true);
    }, 20);
  }

  prev(): void { this.selectRound(this.activeIdx() - 1); }
  next(): void { this.selectRound(this.activeIdx() + 1); }

  getMatch(slotNumber: number): MatchDisplay | null {
    const pick = this.bracketService.knockoutPicks().find(p => p.slotNumber === slotNumber);
    if (!pick) return null;
    const home = this.bracketService.resolveTeamForSlot(slotNumber, 'home');
    const away = this.bracketService.resolveTeamForSlot(slotNumber, 'away');
    return {
      matchId: pick.matchId,
      slotNumber,
      pickedTeamId: pick.pickedTeamId,
      homeScore: pick.homeScore,
      awayScore: pick.awayScore,
      lineupPlayerIds: pick.lineupPlayerIds,
      home: { team: home, label: this.slotLabel(slotNumber, 'home') },
      away: { team: away, label: this.slotLabel(slotNumber, 'away') },
    };
  }

  pickByRanking(matchId: number, home: Team, away: Team, current: number | null): void {
    const better = home.fifaRanking <= away.fifaRanking ? home : away;
    const newId  = better.id === current ? null : better.id;
    this.bracketService.setKnockoutPick(matchId, newId);
  }

  clampScore(event: Event): void {
    const el = event.target as HTMLInputElement;
    const val = parseInt(el.value, 10);
    if (isNaN(val)) return;
    const clamped = Math.min(20, Math.max(0, val));
    if (clamped !== val) el.value = String(clamped);
  }

  updateScore(matchId: number, homeVal: number | null, awayVal: number | null, homeTeamId?: number, awayTeamId?: number): void {
    const clamp = (v: number | null) => (v !== null && v !== undefined && v >= 0 ? Math.min(20, Number(v)) : null);
    const h = clamp(homeVal);
    const a = clamp(awayVal);
    this.bracketService.setKnockoutScore(matchId, h, a);

    // Auto-pick winner when both scores are set and not equal
    if (h !== null && a !== null && h !== a && homeTeamId !== undefined && awayTeamId !== undefined) {
      const winnerId = h > a ? homeTeamId : awayTeamId;
      const current = this.bracketService.knockoutPicks().find(p => p.matchId === matchId)?.pickedTeamId ?? null;
      this.pick(matchId, winnerId, current);
    }
  }

  pick(matchId: number, teamId: number, current: number | null): void {
    const newId = teamId === current ? null : teamId;
    this.bracketService.setKnockoutPick(matchId, newId);
    // Auto-advance when the last pick in this round is made
    if (newId !== null) {
      const round = this.activeRound();
      const idx = this.activeIdx();
      if (round && idx < this.rounds.length - 1) {
        setTimeout(() => {
          if (this.activeIdx() === idx &&
              this.pickedCount(round) === this.availableCount(round) &&
              this.availableCount(round) > 0) {
            this.next();
          }
        }, 480);
      }
    }
  }

  isRoundDone(round: RoundConfig): boolean {
    const ac = this.availableCount(round);
    return ac > 0 && this.pickedCount(round) === ac;
  }

  pickedCount(round: RoundConfig): number {
    const tier = this.bracketService.tier();
    return round.slots.filter(s => {
      const m = this.getMatch(s);
      if (!m || m.pickedTeamId === null) return false;
      if (tier === 'Silver' || tier === 'Gold') return m.homeScore !== null && m.awayScore !== null;
      return true;
    }).length;
  }

  availableCount(round: RoundConfig): number {
    return round.slots.filter(s => {
      const m = this.getMatch(s);
      return m?.home.team && m?.away.team;
    }).length;
  }

  private slotLabel(slot: number, side: 'home' | 'away'): string {
    if (slot <= 16) {
      const p = R32_PAIRINGS[slot];
      return p ? (side === 'home' ? p[0] : p[1]) : 'TBD';
    }
    const c = BRACKET_TREE[slot];
    if (c) return `Winner M${side === 'home' ? c[0] : c[1]}`;
    return 'TBD';
  }
}
