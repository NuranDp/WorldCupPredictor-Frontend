import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { GiveawayService, GiveawayDto, MyEntry } from '../../core/services/giveaway.service';
import { TournamentService } from '../../core/services/tournament.service';
import { AuthService } from '../../core/services/auth.service';
import { R32_PAIRINGS } from '../../core/models/tournament.models';
import { FIFA_THIRD_PLACE_MATRIX } from '../../core/models/third-place-matrix';

@Component({
  selector: 'app-giveaway',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="gw-page">

      @if (loading()) {
        <div class="gw-loading">
          <div class="gw-spinner"></div>
          <p>Loading…</p>
        </div>

      } @else if (giveaways().length === 0) {
        <div class="gw-empty">
          <div class="gw-empty-icon">🎁</div>
          <h2>No active giveaways</h2>
          <p>Check back soon — the next giveaway will be announced here.</p>
          <a routerLink="/home" class="gw-back-btn">← Back to home</a>
        </div>

      } @else {

        <!-- ── Hero header ── -->
        <div class="gw-hero">
          <div class="gw-hero-ball">⚽</div>
          <div class="gw-hero-label">🎁 Lucky Winner Draw</div>
          <h1 class="gw-hero-title">Win a Prize!</h1>
          <p class="gw-hero-sub">Predict the score. Enter the draw. Take home the prize.</p>
        </div>

        <!-- ── Cards ── -->
        <div class="gw-cards-list">
          @for (giveaway of giveaways(); track giveaway.id) {
            <div class="gw-card" [class.gw-card-drawn]="giveaway.status === 'Drawn'">

              <!-- Winner banner -->
              @if (giveaway.status === 'Drawn' && giveaway.winner) {
                <div class="gw-winner-banner">
                  <span class="gw-winner-trophy">🏆</span>
                  <span class="gw-winner-label">Winner</span>
                  <span class="gw-winner-name">{{ giveaway.winner.name }}</span>
                  @if (giveaway.isLuckyDraw) {
                    <span class="gw-lucky-chip">🍀 Lucky</span>
                  }
                </div>
              }

              <!-- Match hero area -->
              <div class="gw-match-area">
                <div class="gw-match-top-row">
                  <span class="gw-status-chip" [class]="'gw-chip-' + giveaway.status.toLowerCase()">
                    {{ giveaway.status }}
                  </span>
                  @if (giveaway.status === 'Drawn' && giveaway.match.homeScore !== null) {
                    <span class="gw-final-score">FT {{ giveaway.match.homeScore }} – {{ giveaway.match.awayScore }}</span>
                  } @else if (giveaway.match.matchDate) {
                    <span class="gw-match-time">🕐 {{ formatMatchTime(giveaway.match.matchDate) }}</span>
                  }
                </div>

                <div class="gw-teams-row">
                  <div class="gw-team gw-team-home">
                    @if (getHomeFlag(giveaway)) {
                      <img [src]="getHomeFlag(giveaway)!" class="gw-flag" alt="" />
                    } @else {
                      <div class="gw-flag-placeholder">🏳</div>
                    }
                    <span class="gw-team-name">{{ getHomeTeam(giveaway) }}</span>
                  </div>
                  <div class="gw-vs-badge">VS</div>
                  <div class="gw-team gw-team-away">
                    @if (getAwayFlag(giveaway)) {
                      <img [src]="getAwayFlag(giveaway)!" class="gw-flag" alt="" />
                    } @else {
                      <div class="gw-flag-placeholder">🏳</div>
                    }
                    <span class="gw-team-name">{{ getAwayTeam(giveaway) }}</span>
                  </div>
                </div>
              </div>

              <!-- Prize + entries bar -->
              <div class="gw-meta-row">
                <div class="gw-prize-badge">
                  <span class="gw-prize-icon">🏅</span>
                  <div>
                    <div class="gw-meta-label">Prize</div>
                    <div class="gw-meta-val">{{ giveaway.prize }}</div>
                  </div>
                </div>
                <div class="gw-entries-block">
                  <div class="gw-entries-header">
                    <span class="gw-meta-label">Min Entries</span>
                    <span class="gw-entries-count">{{ giveaway.entryCount }}/50</span>
                  </div>
                  <div class="gw-progress-track">
                    <div class="gw-progress-fill" [style.width.%]="(giveaway.entryCount / 50) * 100"></div>
                  </div>
                </div>
              </div>

              <!-- Entry area -->
              <div class="gw-entry-area">

                @if (giveaway.status === 'Open') {
                  @if (!auth.isLoggedIn()) {
                    <div class="gw-login-prompt">
                      <p>Log in to enter this giveaway</p>
                      <a routerLink="/login" [queryParams]="{returnUrl: '/giveaway'}" class="gw-login-btn">Log in to Enter</a>
                    </div>
                  } @else if (myEntries()[giveaway.id]) {
                    <div class="gw-confirmed">
                      <div class="gw-confirmed-check">✓</div>
                      <div class="gw-confirmed-text">
                        <div class="gw-confirmed-title">You're entered!</div>
                        <div class="gw-confirmed-score">
                          Your prediction: <strong>{{ myEntries()[giveaway.id]!.homeScore }} – {{ myEntries()[giveaway.id]!.awayScore }}</strong>
                        </div>
                      </div>
                    </div>
                  } @else {
                    <div class="gw-predict-form">
                      <div class="gw-predict-label">Your Score Prediction</div>
                      <div class="gw-scoreboard">
                        <div class="gw-score-col">
                          <div class="gw-score-team">{{ getHomeTeam(giveaway) }}</div>
                          <div class="gw-stepper">
                            <button class="gw-step-btn" (click)="setHomeScore(giveaway.id, getHomeScore(giveaway.id) > 0 ? getHomeScore(giveaway.id) - 1 : 0)">−</button>
                            <div class="gw-score-num">{{ getHomeScore(giveaway.id) }}</div>
                            <button class="gw-step-btn" (click)="setHomeScore(giveaway.id, getHomeScore(giveaway.id) + 1)">+</button>
                          </div>
                        </div>
                        <div class="gw-score-dash">:</div>
                        <div class="gw-score-col">
                          <div class="gw-score-team">{{ getAwayTeam(giveaway) }}</div>
                          <div class="gw-stepper">
                            <button class="gw-step-btn" (click)="setAwayScore(giveaway.id, getAwayScore(giveaway.id) > 0 ? getAwayScore(giveaway.id) - 1 : 0)">−</button>
                            <div class="gw-score-num">{{ getAwayScore(giveaway.id) }}</div>
                            <button class="gw-step-btn" (click)="setAwayScore(giveaway.id, getAwayScore(giveaway.id) + 1)">+</button>
                          </div>
                        </div>
                      </div>

                      @if (errorMsg()[giveaway.id]) {
                        <div class="gw-error">{{ errorMsg()[giveaway.id] }}</div>
                      }

                      <button class="gw-submit-btn" [disabled]="submitting()[giveaway.id]" (click)="submitEntry(giveaway.id)">
                        @if (submitting()[giveaway.id]) {
                          <div class="gw-btn-spinner"></div> Submitting…
                        } @else {
                          🎯 Submit Prediction
                        }
                      </button>
                    </div>
                  }
                }

                @if (giveaway.status === 'Closed' || giveaway.status === 'Drawn') {
                  <div class="gw-closed-msg">
                    {{ giveaway.status === 'Closed' ? '🔒 Entries are now closed' : '🎉 Draw has been completed' }}
                  </div>
                }

              </div>
            </div>
          }
        </div>

        <!-- ── Footer rules ── -->
        <div class="gw-rules-footer">
          <div class="gw-rules-item">
            <span class="gw-rules-icon">👤</span> One entry per account, per giveaway
          </div>
          <div class="gw-rules-divider"></div>
          <div class="gw-rules-item gw-rules-highlight">
            <span class="gw-rules-icon">⚠️</span> Minimum <strong>50 entries</strong> required to draw
          </div>
          <div class="gw-rules-divider"></div>
          <div class="gw-rules-item">
            <span class="gw-rules-icon">🏆</span> 1 winner drawn from correct predictions
          </div>
        </div>

      }
    </div>
  `,
  styles: [`
    .gw-page {
      max-width: 560px;
      margin: 0 auto;
      padding: 0 16px 72px;
    }

    /* ── Spinner ── */
    @keyframes gw-spin { to { transform: rotate(360deg); } }

    .gw-loading { text-align: center; padding: 80px 0; color: #888; }
    .gw-spinner {
      width: 36px; height: 36px; margin: 0 auto 16px;
      border: 3px solid #e8e8e8; border-top-color: #1a237e;
      border-radius: 50%; animation: gw-spin 0.75s linear infinite;
    }

    /* ── Empty ── */
    .gw-empty { text-align: center; padding: 80px 0; }
    .gw-empty-icon { font-size: 3.5rem; margin-bottom: 12px; }
    .gw-empty h2 { margin: 0 0 8px; font-size: 1.3rem; font-weight: 700; color: #1a237e; }
    .gw-empty p { color: #888; margin: 0 0 24px; }
    .gw-back-btn {
      display: inline-block; padding: 10px 24px;
      background: #1a237e; color: white;
      border-radius: 10px; text-decoration: none; font-weight: 700;
    }

    /* ── Hero ── */
    .gw-hero {
      text-align: center;
      padding: 36px 0 28px;
    }
    .gw-hero-ball {
      font-size: 2.8rem;
      margin-bottom: 10px;
      animation: gw-bounce 1.8s ease-in-out infinite;
      display: block;
    }
    @keyframes gw-bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    .gw-hero-label {
      display: inline-block;
      background: linear-gradient(135deg, #f5c518, #e6a800);
      color: #1a1a1a;
      font-size: 11px; font-weight: 800;
      letter-spacing: 0.12em; text-transform: uppercase;
      padding: 5px 14px; border-radius: 20px;
      margin-bottom: 14px;
    }
    .gw-hero-title {
      font-size: 2.4rem; font-weight: 900;
      color: #1a237e; margin: 0 0 8px;
      letter-spacing: -0.03em;
    }
    .gw-hero-sub {
      color: #666; font-size: 0.95rem; margin: 0;
    }

    /* ── Cards list ── */
    .gw-cards-list {
      display: flex; flex-direction: column; gap: 20px; margin-bottom: 28px;
    }

    /* ── Card ── */
    .gw-card {
      background: white;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(26,35,126,0.10), 0 1px 4px rgba(0,0,0,0.06);
      border: 1.5px solid #e8ecff;
    }
    .gw-card-drawn { opacity: 0.85; }

    /* Winner banner */
    .gw-winner-banner {
      background: linear-gradient(90deg, #1a237e 0%, #283593 60%, #4527a0 100%);
      color: white;
      padding: 10px 18px;
      display: flex; align-items: center; gap: 8px;
      font-size: 0.85rem;
    }
    .gw-winner-trophy { font-size: 1.2rem; }
    .gw-winner-label { font-weight: 600; opacity: 0.75; }
    .gw-winner-name { font-weight: 800; flex: 1; }
    .gw-lucky-chip {
      background: rgba(255,255,255,0.15); color: #a5d6a7;
      padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; font-weight: 700;
    }

    /* Match area */
    .gw-match-area {
      background: linear-gradient(160deg, #1a237e 0%, #283593 50%, #1565c0 100%);
      padding: 16px 20px 20px;
    }
    .gw-match-top-row {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 18px;
    }
    .gw-status-chip {
      font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
      padding: 4px 12px; border-radius: 20px;
    }
    .gw-chip-open { background: #00e676; color: #003d19; }
    .gw-chip-closed { background: #ff5252; color: #fff; }
    .gw-chip-drawn { background: #f5c518; color: #1a1a1a; }
    .gw-final-score { color: #f5c518; font-weight: 800; font-size: 0.9rem; }
    .gw-match-time { color: rgba(255,255,255,0.65); font-size: 0.8rem; }

    .gw-teams-row {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
    }
    .gw-team {
      flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px;
    }
    .gw-flag {
      width: 52px; height: 36px;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      object-fit: cover;
    }
    .gw-flag-placeholder { font-size: 2rem; }
    .gw-team-name {
      color: white; font-weight: 800; font-size: 0.95rem;
      text-align: center; text-transform: uppercase; letter-spacing: 0.05em;
    }
    .gw-vs-badge {
      background: rgba(255,255,255,0.12);
      border: 1.5px solid rgba(255,255,255,0.25);
      color: rgba(255,255,255,0.8);
      font-size: 0.8rem; font-weight: 900; letter-spacing: 0.1em;
      width: 42px; height: 42px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }

    /* Meta row (prize + entries) */
    .gw-meta-row {
      display: flex; align-items: center; gap: 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .gw-prize-badge {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 18px;
      border-right: 1px solid #f0f0f0;
      flex-shrink: 0;
    }
    .gw-prize-icon { font-size: 1.5rem; }
    .gw-meta-label { font-size: 0.7rem; color: #aaa; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
    .gw-meta-val { font-size: 0.95rem; font-weight: 800; color: #1a237e; }
    .gw-entries-block { flex: 1; padding: 14px 18px; }
    .gw-entries-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 7px; }
    .gw-entries-count { font-size: 0.85rem; font-weight: 800; color: #333; }
    .gw-progress-track {
      height: 7px; background: #eee; border-radius: 10px; overflow: hidden;
    }
    .gw-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #f5c518, #e6a800);
      border-radius: 10px;
      transition: width 0.4s ease;
      min-width: 4px;
    }

    /* Entry area */
    .gw-entry-area { padding: 16px 18px; }

    .gw-login-prompt { text-align: center; padding: 8px 0; }
    .gw-login-prompt p { margin: 0 0 12px; color: #666; font-size: 0.9rem; }
    .gw-login-btn {
      display: inline-block; padding: 10px 24px;
      background: linear-gradient(135deg, #1a237e, #283593);
      color: white; border-radius: 10px; text-decoration: none;
      font-weight: 700; font-size: 0.9rem;
    }

    .gw-confirmed {
      display: flex; gap: 14px; align-items: center;
      background: linear-gradient(135deg, #e8f5e9, #f1f8e9);
      border: 1.5px solid #a5d6a7;
      border-radius: 12px;
      padding: 14px 16px;
    }
    .gw-confirmed-check {
      width: 36px; height: 36px; flex-shrink: 0;
      background: #2e7d32; color: white;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.1rem; font-weight: 700;
    }
    .gw-confirmed-title { font-weight: 800; color: #2e7d32; font-size: 0.95rem; }
    .gw-confirmed-score { font-size: 0.85rem; color: #555; margin-top: 3px; }
    .gw-confirmed-score strong { color: #1a237e; }

    /* Prediction form */
    .gw-predict-form { }
    .gw-predict-label {
      text-align: center; font-weight: 700; font-size: 0.8rem;
      color: #888; text-transform: uppercase; letter-spacing: 0.08em;
      margin-bottom: 14px;
    }
    .gw-scoreboard {
      display: flex; align-items: center; justify-content: center;
      gap: 16px; margin-bottom: 16px;
    }
    .gw-score-col { display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .gw-score-team { font-size: 0.75rem; font-weight: 700; color: #999; text-transform: uppercase; }
    .gw-stepper { display: flex; align-items: center; gap: 0; border-radius: 12px; overflow: hidden; border: 1.5px solid #e0e4f7; }
    .gw-step-btn {
      width: 40px; height: 44px;
      background: #f4f6ff; border: none;
      color: #1a237e; font-size: 1.1rem; font-weight: 900;
      cursor: pointer; transition: all 0.15s;
      display: flex; align-items: center; justify-content: center;
    }
    .gw-step-btn:hover { background: #1a237e; color: white; }
    .gw-score-num {
      width: 52px; height: 44px; background: white;
      text-align: center; line-height: 44px;
      font-size: 1.6rem; font-weight: 900; color: #1a237e;
      border-left: 1px solid #e0e4f7; border-right: 1px solid #e0e4f7;
    }
    .gw-score-dash {
      font-size: 1.8rem; font-weight: 900; color: #ccc;
      margin-top: 20px;
    }

    .gw-error {
      background: #fce4ec; color: #c62828;
      border-radius: 10px; padding: 9px 14px;
      font-size: 0.82rem; margin-bottom: 12px; text-align: center;
    }

    .gw-submit-btn {
      width: 100%; padding: 14px;
      background: linear-gradient(135deg, #f5c518 0%, #e6a800 100%);
      color: #1a1a1a;
      border: none; border-radius: 12px;
      font-weight: 800; cursor: pointer;
      font-size: 0.95rem; letter-spacing: 0.02em;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: all 0.15s;
      box-shadow: 0 3px 10px rgba(245,197,24,0.35);
    }
    .gw-submit-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 5px 16px rgba(245,197,24,0.45);
    }
    .gw-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .gw-btn-spinner {
      width: 14px; height: 14px;
      border: 2px solid rgba(0,0,0,0.2); border-top-color: #1a1a1a;
      border-radius: 50%; animation: gw-spin 0.75s linear infinite;
    }

    .gw-closed-msg {
      text-align: center; padding: 10px;
      color: #999; font-size: 0.9rem; font-weight: 600;
      background: #f9f9f9; border-radius: 10px;
    }

    /* ── Footer rules ── */
    .gw-rules-footer {
      background: white;
      border: 1.5px solid #e8ecff;
      border-radius: 16px;
      padding: 16px 20px;
      display: flex; flex-direction: column; gap: 0;
      box-shadow: 0 2px 10px rgba(26,35,126,0.06);
    }
    .gw-rules-item {
      display: flex; align-items: center; gap: 10px;
      font-size: 0.82rem; color: #666; font-weight: 500;
      padding: 10px 0;
    }
    .gw-rules-icon { font-size: 1rem; flex-shrink: 0; }
    .gw-rules-highlight { color: #795548; font-weight: 600; }
    .gw-rules-highlight strong { color: #e65100; }
    .gw-rules-divider { height: 1px; background: #f0f0f0; }
  `],
})
export class GiveawayComponent implements OnInit {
  private readonly giveawayService = inject(GiveawayService);
  private readonly tournamentService = inject(TournamentService);
  readonly auth = inject(AuthService);

  loading = signal(true);
  giveaways = signal<GiveawayDto[]>([]);
  myEntries = signal<Record<number, MyEntry | null>>({});
  submitting = signal<Record<number, boolean>>({});
  errorMsg = signal<Record<number, string | null>>({});
  homeScores = signal<Record<number, number>>({});
  awayScores = signal<Record<number, number>>({});

  private actualGroupStandings: Record<string, { firstName: string | null; firstFlag: string | null; secondName: string | null; secondFlag: string | null }> = {};
  private actualBest3rdTeams: { id: number; groupName: string; name: string; flagUrl: string }[] = [];

  private resolveR32Entry(slotNumber: number | null, side: 'home' | 'away'): { name: string | null; flag: string | null } {
    if (!slotNumber || slotNumber > 16) return { name: null, flag: null };
    const pairing = R32_PAIRINGS[slotNumber];
    if (!pairing) return { name: null, flag: null };
    const label = side === 'home' ? pairing[0] : pairing[1];

    if (label === '3rd') {
      if (!this.actualBest3rdTeams.length) return { name: null, flag: null };
      const groupToTeam: Record<string, { id: number; name: string; flag: string }> = {};
      for (const t of this.actualBest3rdTeams) groupToTeam[t.groupName] = { id: t.id, name: t.name, flag: t.flagUrl };
      const key = Object.keys(groupToTeam).sort().join('');
      const slotToGroup = FIFA_THIRD_PLACE_MATRIX[key];
      const grp = slotToGroup?.[slotNumber];
      const entry = grp ? groupToTeam[grp] : null;
      return entry ? { name: entry.name, flag: entry.flag } : { name: null, flag: null };
    }

    const m = label.match(/^([A-L]) (1st|2nd)$/);
    if (!m) return { name: null, flag: null };
    const s = this.actualGroupStandings[m[1]];
    if (!s) return { name: null, flag: null };
    return m[2] === '1st'
      ? { name: s.firstName, flag: s.firstFlag }
      : { name: s.secondName, flag: s.secondFlag };
  }

  resolveTeamName(slotNumber: number | null, side: 'home' | 'away'): string | null {
    return this.resolveR32Entry(slotNumber, side).name;
  }

  getHomeTeam(g: GiveawayDto): string {
    return g.match.homeTeam ?? this.resolveTeamName(g.match.slotNumber, 'home') ?? 'TBD';
  }

  getAwayTeam(g: GiveawayDto): string {
    return g.match.awayTeam ?? this.resolveTeamName(g.match.slotNumber, 'away') ?? 'TBD';
  }

  getHomeFlag(g: GiveawayDto): string | null {
    return g.match.homeTeamFlag ?? this.resolveR32Entry(g.match.slotNumber, 'home').flag;
  }

  getAwayFlag(g: GiveawayDto): string | null {
    return g.match.awayTeamFlag ?? this.resolveR32Entry(g.match.slotNumber, 'away').flag;
  }

  ngOnInit(): void {
    forkJoin({
      giveaways:     this.giveawayService.getActive(),
      groups:        this.tournamentService.getGroups(),
      actualBest3rd: this.tournamentService.getActualBest3rd(),
    }).subscribe({
      next: ({ giveaways, groups, actualBest3rd }) => {
        for (const grp of groups) {
          const teamById: Record<number, { name: string; flagUrl: string }> = {};
          grp.teams.forEach(t => teamById[t.id] = { name: t.name, flagUrl: t.flagUrl });
          this.actualGroupStandings[grp.name] = {
            firstName: grp.actualFirstTeamId ? (teamById[grp.actualFirstTeamId]?.name ?? null) : null,
            firstFlag: grp.actualFirstTeamId ? (teamById[grp.actualFirstTeamId]?.flagUrl ?? null) : null,
            secondName: grp.actualSecondTeamId ? (teamById[grp.actualSecondTeamId]?.name ?? null) : null,
            secondFlag: grp.actualSecondTeamId ? (teamById[grp.actualSecondTeamId]?.flagUrl ?? null) : null,
          };
        }
        if (actualBest3rd.teamIds?.length) {
          for (const id of actualBest3rd.teamIds) {
            for (const grp of groups) {
              const team = grp.teams.find(t => t.id === id);
              if (team) { this.actualBest3rdTeams.push({ id, groupName: grp.name, name: team.name, flagUrl: team.flagUrl }); break; }
            }
          }
        }
        const list = giveaways ?? [];
        this.giveaways.set(list);
        this.loading.set(false);
        if (this.auth.isLoggedIn()) {
          list?.forEach(g => {
            this.giveawayService.getMyEntry(g.id).subscribe({
              next: (e) => {
                const entries = this.myEntries();
                entries[g.id] = e;
                this.myEntries.set(entries);
              },
              error: () => {},
            });
          });
        }
      },
      error: () => this.loading.set(false),
    });
  }

  submitEntry(giveawayId: number): void {
    const scores = this.homeScores();
    const awayScores = this.awayScores();
    this.errorMsg.set({ ...this.errorMsg(), [giveawayId]: null });
    this.submitting.set({ ...this.submitting(), [giveawayId]: true });

    this.giveawayService.enter(giveawayId, scores[giveawayId] || 0, awayScores[giveawayId] || 0).subscribe({
      next: () => {
        const entries = this.myEntries();
        entries[giveawayId] = {
          homeScore: scores[giveawayId] || 0,
          awayScore: awayScores[giveawayId] || 0,
          submittedAt: new Date().toISOString(),
        };
        this.myEntries.set(entries);
        this.giveaways.set(
          this.giveaways().map(g => g.id === giveawayId ? { ...g, entryCount: g.entryCount + 1 } : g)
        );
        this.submitting.set({ ...this.submitting(), [giveawayId]: false });
      },
      error: (e) => {
        this.errorMsg.set({ ...this.errorMsg(), [giveawayId]: e?.error?.message ?? 'Failed to submit entry.' });
        this.submitting.set({ ...this.submitting(), [giveawayId]: false });
      },
    });
  }

  getHomeScore(id: number): number {
    return this.homeScores()[id] || 0;
  }

  setHomeScore(id: number, val: number): void {
    this.homeScores.set({ ...this.homeScores(), [id]: val });
  }

  getAwayScore(id: number): number {
    return this.awayScores()[id] || 0;
  }

  setAwayScore(id: number, val: number): void {
    this.awayScores.set({ ...this.awayScores(), [id]: val });
  }

  formatMatchTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }
}
