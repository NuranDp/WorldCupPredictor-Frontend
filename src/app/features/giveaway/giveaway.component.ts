import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { GiveawayService, GiveawayDto, MyEntry } from '../../core/services/giveaway.service';
import { AuthService } from '../../core/services/auth.service';

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

        <!-- ── Header ── -->
        <div class="gw-header">
          <div class="gw-label-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            Lucky winner draws
          </div>
          <h1 class="gw-title">Active Giveaways</h1>
          <p class="gw-subtitle">Pick your predictions and enter to win</p>
        </div>

        <!-- ── Giveaway cards list ── -->
        <div class="gw-cards-list">
          @for (giveaway of giveaways(); track giveaway.id) {
            <div class="gw-draw-card">

              <!-- Winner banner (if drawn) -->
              @if (giveaway.status === 'Drawn' && giveaway.winner) {
                <div class="gw-card-winner-banner">
                  <div class="gw-card-trophy">🏆</div>
                  <div class="gw-card-winner-info">
                    <div class="gw-card-winner-name">{{ giveaway.winner.name }}</div>
                    @if (giveaway.isLuckyDraw) {
                      <span class="gw-lucky-tag">🍀 Lucky draw</span>
                    }
                  </div>
                </div>
              }

              <!-- Match header -->
              <div class="gw-card-header">
                <div class="gw-card-match-info">
                  <span class="gw-card-status" [class]="'gw-card-status-' + giveaway.status.toLowerCase()">
                    {{ giveaway.status }}
                  </span>
                  <div class="gw-card-teams">
                    @if (giveaway.match.homeTeamFlag) {
                      <img [src]="giveaway.match.homeTeamFlag" class="gw-card-flag" alt="" />
                    }
                    <span class="gw-card-team-names">
                      {{ giveaway.match.homeTeam ?? 'TBD' }} vs {{ giveaway.match.awayTeam ?? 'TBD' }}
                    </span>
                    @if (giveaway.match.awayTeamFlag) {
                      <img [src]="giveaway.match.awayTeamFlag" class="gw-card-flag" alt="" />
                    }
                  </div>
                </div>
                @if (giveaway.status === 'Drawn' && giveaway.match.homeScore !== null) {
                  <div class="gw-card-score">{{ giveaway.match.homeScore }} – {{ giveaway.match.awayScore }}</div>
                } @else if (giveaway.match.matchDate) {
                  <div class="gw-card-time">{{ formatMatchTime(giveaway.match.matchDate) }}</div>
                }
              </div>

              <!-- Card body -->
              <div class="gw-card-body">

                <!-- Prize and entries row -->
                <div class="gw-card-info-row">
                  <div class="gw-card-info-item">
                    <span class="gw-card-label">Prize</span>
                    <span class="gw-card-value">{{ giveaway.prize }}</span>
                  </div>
                  <div class="gw-card-info-item">
                    <span class="gw-card-label">Entries</span>
                    <span class="gw-card-value">{{ giveaway.entryCount }}/50</span>
                  </div>
                </div>

                <!-- Entry form or confirmation -->
                @if (giveaway.status === 'Open') {
                  @if (!auth.isLoggedIn()) {
                    <div class="gw-card-login">
                      <p>Log in to submit your prediction</p>
                      <a routerLink="/login" [queryParams]="{returnUrl: '/giveaway'}" class="gw-card-login-btn">Log in</a>
                    </div>
                  } @else if (myEntries()[giveaway.id]) {
                    <div class="gw-card-confirmed">
                      <div class="gw-check">✓</div>
                      <div>
                        <div class="gw-confirmed-title">You're in!</div>
                        <div class="gw-confirmed-score">
                          {{ myEntries()[giveaway.id]!.homeScore }} – {{ myEntries()[giveaway.id]!.awayScore }}
                        </div>
                      </div>
                    </div>
                  } @else {
                    <div class="gw-card-form">
                      <div class="gw-card-form-title">Your prediction</div>
                      <div class="gw-card-score-inputs">
                        <div class="gw-card-input-col">
                          <span class="gw-card-input-team">{{ giveaway.match.homeTeam }}</span>
                          <div class="gw-card-stepper-row">
                            <button class="gw-card-stepper-btn" (click)="setHomeScore(giveaway.id, getHomeScore(giveaway.id) > 0 ? getHomeScore(giveaway.id) - 1 : 0)">−</button>
                            <div class="gw-card-score-display">{{ getHomeScore(giveaway.id) }}</div>
                            <button class="gw-card-stepper-btn" (click)="setHomeScore(giveaway.id, getHomeScore(giveaway.id) + 1)">+</button>
                          </div>
                        </div>
                        <div class="gw-card-vs">−</div>
                        <div class="gw-card-input-col">
                          <span class="gw-card-input-team">{{ giveaway.match.awayTeam }}</span>
                          <div class="gw-card-stepper-row">
                            <button class="gw-card-stepper-btn" (click)="setAwayScore(giveaway.id, getAwayScore(giveaway.id) > 0 ? getAwayScore(giveaway.id) - 1 : 0)">−</button>
                            <div class="gw-card-score-display">{{ getAwayScore(giveaway.id) }}</div>
                            <button class="gw-card-stepper-btn" (click)="setAwayScore(giveaway.id, getAwayScore(giveaway.id) + 1)">+</button>
                          </div>
                        </div>
                      </div>

                      @if (errorMsg()[giveaway.id]) {
                        <div class="gw-card-error">{{ errorMsg()[giveaway.id] }}</div>
                      }

                      <button class="gw-card-submit-btn" [disabled]="submitting()[giveaway.id]" (click)="submitEntry(giveaway.id)">
                        @if (submitting()[giveaway.id]) {
                          <div class="gw-card-spinner"></div> Submitting…
                        } @else {
                          Submit Prediction
                        }
                      </button>
                    </div>
                  }
                }

                @if (giveaway.status === 'Closed' || giveaway.status === 'Drawn') {
                  <div class="gw-card-closed">
                    {{ giveaway.status === 'Closed' ? 'Entries closed' : 'Draw completed' }}
                  </div>
                }

              </div>
            </div>
          }
        </div>

        <!-- ── Footer note ── -->
        <div class="gw-footer-card">
          <div class="gw-footer-rule">One entry per account, per giveaway</div>
          <div class="gw-footer-focus">
            <span class="gw-focus-icon">⚠️</span>
            <span class="gw-focus-text"><strong>Minimum 50 entries</strong> required to draw</span>
          </div>
          <div class="gw-footer-rule">1 winner from correct predictions</div>
        </div>

      }
    </div>
  `,
  styles: [`
    .gw-page {
      max-width: 600px;
      margin: 36px auto;
      padding: 0 16px 64px;
    }

    /* Loading */
    .gw-loading {
      text-align: center; padding: 80px 0;
    }
    .gw-spinner {
      width: 36px; height: 36px; margin: 0 auto 16px;
      border: 2.5px solid #e0e0e0;
      border-top-color: #1a237e;
      border-radius: 50%;
      animation: gw-spin 0.75s linear infinite;
    }
    @keyframes gw-spin { to { transform: rotate(360deg); } }

    /* Empty */
    .gw-empty {
      text-align: center; padding: 80px 0;
    }
    .gw-empty-icon { font-size: 3rem; margin-bottom: 12px; }
    .gw-empty h2 { margin: 0 0 8px; font-size: 1.3rem; font-weight: 600; }
    .gw-empty p { color: #888; margin: 0 0 24px; }
    .gw-back-btn {
      display: inline-block; padding: 10px 20px;
      background: #1a237e; color: white;
      border-radius: 8px; text-decoration: none; font-weight: 600;
    }

    /* Header */
    .gw-header {
      text-align: center; margin-bottom: 28px;
    }
    .gw-label-pill {
      display: inline-flex; align-items: center; gap: 6px;
      border: 1.5px solid #d4af37;
      background: #fffde7;
      color: #795548;
      font-size: 11px; font-weight: 700;
      letter-spacing: 0.08em; text-transform: uppercase;
      padding: 5px 14px; border-radius: 20px;
      margin-bottom: 14px;
    }
    .gw-label-pill svg { color: #d4af37; }
    .gw-title {
      font-size: 2rem; font-weight: 800;
      color: #1a237e; margin: 0 0 8px;
      letter-spacing: -0.02em;
    }
    .gw-subtitle {
      color: #666; font-size: 0.93rem; margin: 0; max-width: 400px; margin: 0 auto;
    }

    /* Cards list */
    .gw-cards-list {
      display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px;
    }

    /* Draw card */
    .gw-draw-card {
      background: white;
      border: 1px solid #e8e8e8;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    }

    .gw-card-winner-banner {
      background: linear-gradient(135deg, #1a237e 0%, #4a148c 100%);
      color: white;
      padding: 12px 16px;
      display: flex; align-items: center; gap: 10px;
    }
    .gw-card-trophy { font-size: 1.5rem; }
    .gw-card-winner-info { flex: 1; }
    .gw-card-winner-name { font-weight: 700; font-size: 0.95rem; }
    .gw-lucky-tag {
      display: inline-block;
      font-size: 0.75rem; font-weight: 700;
      background: rgba(255,255,255,0.2);
      color: #a5d6a7;
      padding: 2px 8px; border-radius: 6px; margin-top: 4px;
    }

    .gw-card-header {
      background: #f8f9ff;
      border-bottom: 1px solid #eee;
      padding: 14px 16px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .gw-card-match-info { flex: 1; }
    .gw-card-status {
      display: inline-block;
      font-size: 10px; font-weight: 700;
      padding: 3px 10px; border-radius: 12px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .gw-card-status-open { background: #e8f5e9; color: #2e7d32; }
    .gw-card-status-closed { background: #fce4ec; color: #c62828; }
    .gw-card-status-drawn { background: #e3f2fd; color: #1565c0; }

    .gw-card-teams {
      display: flex; align-items: center; gap: 6px;
      font-weight: 600; font-size: 0.9rem;
    }
    .gw-card-flag { width: 24px; height: 16px; border-radius: 2px; }
    .gw-card-team-names { flex: 1; }
    .gw-card-score { font-size: 1.3rem; font-weight: 800; color: #1a237e; }
    .gw-card-time { font-size: 0.8rem; color: #aaa; }

    .gw-card-body { padding: 16px; }

    .gw-card-info-row {
      display: flex; gap: 20px; margin-bottom: 14px;
    }
    .gw-card-info-item { }
    .gw-card-label { display: block; font-size: 0.75rem; color: #aaa; text-transform: uppercase; margin-bottom: 2px; }
    .gw-card-value { display: block; font-size: 0.95rem; font-weight: 700; color: #333; }

    .gw-card-login {
      background: #f8f9ff;
      border-radius: 10px;
      padding: 12px 14px;
      text-align: center;
      font-size: 0.85rem;
    }
    .gw-card-login p { margin: 0 0 8px; color: #666; }
    .gw-card-login-btn {
      display: inline-block;
      padding: 6px 16px;
      background: #1a237e; color: white;
      border-radius: 6px; text-decoration: none; font-weight: 600;
      font-size: 0.8rem;
    }

    .gw-card-confirmed {
      background: #e8f5e9;
      border: 1px solid #a5d6a7;
      border-radius: 10px;
      padding: 12px 14px;
      display: flex; gap: 10px; align-items: center;
    }
    .gw-check {
      width: 28px; height: 28px; flex-shrink: 0;
      background: #2e7d32; color: white;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700;
    }
    .gw-confirmed-title { font-weight: 700; color: #2e7d32; font-size: 0.9rem; }
    .gw-confirmed-score { font-size: 1rem; font-weight: 800; color: #1a237e; }

    .gw-card-form { }
    .gw-card-form-title { font-weight: 700; font-size: 0.85rem; margin-bottom: 10px; color: #333; }
    .gw-card-score-inputs { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
    .gw-card-input-col { flex: 1; }
    .gw-card-input-team { display: block; font-size: 0.75rem; color: #aaa; margin-bottom: 6px; font-weight: 600; }
    .gw-card-stepper-row { display: flex; align-items: center; gap: 4px; }
    .gw-card-stepper-btn {
      width: 32px; height: 32px;
      background: #f0f4ff; border: 1px solid #c5cae9;
      color: #1a237e; border-radius: 6px;
      font-weight: 700; cursor: pointer;
      transition: all 0.15s;
    }
    .gw-card-stepper-btn:hover { background: #1a237e; color: white; border-color: #1a237e; }
    .gw-card-score-display {
      flex: 1; text-align: center;
      font-size: 1.2rem; font-weight: 800; color: #1a237e;
    }
    .gw-card-vs { color: #ddd; font-weight: 700; flex-shrink: 0; }

    .gw-card-error {
      background: #fce4ec; color: #c62828;
      border-radius: 8px; padding: 8px 12px;
      font-size: 0.8rem; margin-bottom: 12px;
    }

    .gw-card-submit-btn {
      width: 100%; padding: 12px;
      background: #1a237e; color: white;
      border: none; border-radius: 10px;
      font-weight: 700; cursor: pointer;
      font-size: 0.9rem;
      display: flex; align-items: center; justify-content: center; gap: 6px;
      transition: background 0.15s;
    }
    .gw-card-submit-btn:hover:not(:disabled) { background: #283593; }
    .gw-card-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .gw-card-spinner {
      width: 14px; height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: gw-spin 0.75s linear infinite;
    }

    .gw-card-closed {
      background: #f5f5f5;
      color: #999;
      text-align: center;
      padding: 10px;
      border-radius: 8px;
      font-size: 0.85rem;
    }

    /* Footer */
    .gw-footer-card {
      background: linear-gradient(135deg, #fef8e7 0%, #fef5dc 100%);
      border: 2px solid #d4af37;
      border-radius: 12px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .gw-footer-rule {
      font-size: 0.8rem;
      color: #888;
      font-weight: 500;
    }
    .gw-footer-focus {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      background: rgba(212, 175, 55, 0.1);
      padding: 8px 12px;
      border-radius: 8px;
    }
    .gw-focus-icon {
      font-size: 0.95rem;
    }
    .gw-focus-text {
      font-size: 0.85rem;
      color: #795548;
      font-weight: 600;
    }
  `],
})
export class GiveawayComponent implements OnInit {
  private readonly giveawayService = inject(GiveawayService);
  readonly auth = inject(AuthService);

  loading = signal(true);
  giveaways = signal<GiveawayDto[]>([]);
  myEntries = signal<Record<number, MyEntry | null>>({});
  submitting = signal<Record<number, boolean>>({});
  errorMsg = signal<Record<number, string | null>>({});
  homeScores = signal<Record<number, number>>({});
  awayScores = signal<Record<number, number>>({});

  ngOnInit(): void {
    this.giveawayService.getActive().subscribe({
      next: (list) => {
        this.giveaways.set(list ?? []);
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
