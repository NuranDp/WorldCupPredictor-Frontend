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

      } @else if (!giveaway()) {
        <div class="gw-empty">
          <div class="gw-empty-icon">🎁</div>
          <h2>No active giveaway</h2>
          <p>Check back soon — the next giveaway will be announced here.</p>
          <a routerLink="/home" class="gw-back-btn">← Back to home</a>
        </div>

      } @else {

        <!-- ── Header ── -->
        <div class="gw-header">
          <div class="gw-label-pill">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            Lucky winner draw
          </div>
          <h1 class="gw-title">Win the prize</h1>
          <p class="gw-subtitle">Predict the exact scoreline — one lucky winner picked from correct predictions</p>
        </div>

        <!-- ── Winner card (when drawn) ── -->
        @if (giveaway()!.status === 'Drawn' && giveaway()!.winner) {
          <div class="gw-winner-card">
            <div class="gw-winner-top">
              <div class="gw-trophy-ring">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 9H4.5a2.5 2.5 0 010-5H6m12 5h1.5a2.5 2.5 0 000-5H18M6 9v11m12-11v11M9 20h6M12 4v1M7.5 9A4.5 4.5 0 0012 13.5 4.5 4.5 0 0016.5 9"/></svg>
              </div>
              <div class="gw-winner-label">Winner</div>
            </div>
            <div class="gw-winner-name">{{ giveaway()!.winner!.name }}</div>
            @if (giveaway()!.isLuckyDraw) {
              <div class="gw-lucky-pill">🍀 Lucky draw</div>
            } @else {
              <div class="gw-correct-pill">🎯 Predicted the exact score</div>
            }
            <div class="gw-winner-prize-row">
              <span class="gw-winner-prize-label">Prize</span>
              <span class="gw-winner-prize-value">{{ giveaway()!.prize }}</span>
            </div>
            @if (giveaway()!.match.homeScore !== null) {
              <div class="gw-final-score">
                Final score: <strong>{{ giveaway()!.match.homeTeam }} {{ giveaway()!.match.homeScore }} – {{ giveaway()!.match.awayScore }} {{ giveaway()!.match.awayTeam }}</strong>
              </div>
            }
          </div>
        }

        <!-- ── Match card ── -->
        <div class="gw-match-card">
          <div class="gw-match-card-header">
            <span class="gw-match-card-title">Match</span>
            <span class="gw-status-pill" [class]="'gw-status-' + giveaway()!.status.toLowerCase()">
              {{ giveaway()!.status === 'Open' ? 'Open' : giveaway()!.status === 'Closed' ? 'Closed' : 'Drawn' }}
            </span>
          </div>

          <div class="gw-teams">
            <div class="gw-team">
              @if (giveaway()!.match.homeTeamFlag) {
                <img [src]="giveaway()!.match.homeTeamFlag" class="gw-flag" alt="" />
              } @else {
                <div class="gw-flag-placeholder"></div>
              }
              <span class="gw-team-name">{{ giveaway()!.match.homeTeam ?? 'TBD' }}</span>
            </div>
            <div class="gw-vs-col">
              @if (giveaway()!.status === 'Drawn' && giveaway()!.match.homeScore !== null) {
                <span class="gw-ft-score">{{ giveaway()!.match.homeScore }} – {{ giveaway()!.match.awayScore }}</span>
              } @else {
                <span class="gw-vs-text">vs</span>
                @if (giveaway()!.match.matchDate) {
                  <span class="gw-match-time">{{ formatMatchTime(giveaway()!.match.matchDate!) }}</span>
                }
              }
            </div>
            <div class="gw-team gw-team-right">
              <span class="gw-team-name">{{ giveaway()!.match.awayTeam ?? 'TBD' }}</span>
              @if (giveaway()!.match.awayTeamFlag) {
                <img [src]="giveaway()!.match.awayTeamFlag" class="gw-flag" alt="" />
              } @else {
                <div class="gw-flag-placeholder"></div>
              }
            </div>
          </div>

          <div class="gw-stats-row">
            <div class="gw-stat">
              <div class="gw-stat-icon">🎁</div>
              <div class="gw-stat-label">Prize</div>
              <div class="gw-stat-value">{{ giveaway()!.prize }}</div>
            </div>
            <div class="gw-stat">
              <div class="gw-stat-icon">👥</div>
              <div class="gw-stat-label">Entries</div>
              <div class="gw-stat-value">{{ giveaway()!.entryCount }}</div>
            </div>
            <div class="gw-stat">
              <div class="gw-stat-icon">🎲</div>
              <div class="gw-stat-label">Draw</div>
              <div class="gw-stat-value">After FT</div>
            </div>
          </div>
        </div>

        <!-- ── Entry section ── -->
        @if (giveaway()!.status === 'Open') {
          @if (!auth.isLoggedIn()) {
            <div class="gw-login-card">
              <div class="gw-login-icon">🔐</div>
              <h3>Login to enter</h3>
              <p>You need an account to submit your prediction and enter the draw.</p>
              <a routerLink="/login" [queryParams]="{returnUrl: '/giveaway'}" class="gw-login-btn">Log in to enter</a>
            </div>
          } @else if (myEntry()) {
            <div class="gw-entered-card">
              <div class="gw-entered-top">
                <div class="gw-check-circle">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <span class="gw-entered-title">You're in the draw!</span>
              </div>
              <div class="gw-prediction-display">
                <div class="gw-pred-team">
                  @if (giveaway()!.match.homeTeamFlag) { <img [src]="giveaway()!.match.homeTeamFlag" class="gw-pred-flag" alt="" /> }
                  <span>{{ giveaway()!.match.homeTeam ?? 'Home' }}</span>
                </div>
                <div class="gw-pred-score">
                  <span class="gw-pred-num">{{ myEntry()!.homeScore }}</span>
                  <span class="gw-pred-dash">–</span>
                  <span class="gw-pred-num">{{ myEntry()!.awayScore }}</span>
                </div>
                <div class="gw-pred-team gw-pred-team-right">
                  <span>{{ giveaway()!.match.awayTeam ?? 'Away' }}</span>
                  @if (giveaway()!.match.awayTeamFlag) { <img [src]="giveaway()!.match.awayTeamFlag" class="gw-pred-flag" alt="" /> }
                </div>
              </div>
              <p class="gw-entered-note">Good luck! Winner is drawn after the final whistle.</p>
            </div>
          } @else {
            <div class="gw-form-card">
              <div class="gw-form-header">
                <div class="gw-form-title">Predict the final score</div>
                <p class="gw-form-hint">Enter the exact scoreline to join the draw</p>
              </div>

              <div class="gw-score-row">
                <div class="gw-score-team-col">
                  <div class="gw-score-team-name">
                    @if (giveaway()!.match.homeTeamFlag) { <img [src]="giveaway()!.match.homeTeamFlag" class="gw-score-flag" alt="" /> }
                    {{ giveaway()!.match.homeTeam ?? 'Home' }}
                  </div>
                  <div class="gw-score-input-wrap">
                    <button class="gw-stepper" (click)="homeScore = homeScore > 0 ? homeScore - 1 : 0" aria-label="decrease">−</button>
                    <div class="gw-score-num">{{ homeScore }}</div>
                    <button class="gw-stepper" (click)="homeScore = homeScore + 1" aria-label="increase">+</button>
                  </div>
                </div>

                <div class="gw-score-divider">—</div>

                <div class="gw-score-team-col gw-score-team-col-right">
                  <div class="gw-score-team-name gw-score-team-name-right">
                    {{ giveaway()!.match.awayTeam ?? 'Away' }}
                    @if (giveaway()!.match.awayTeamFlag) { <img [src]="giveaway()!.match.awayTeamFlag" class="gw-score-flag" alt="" /> }
                  </div>
                  <div class="gw-score-input-wrap">
                    <button class="gw-stepper" (click)="awayScore = awayScore > 0 ? awayScore - 1 : 0" aria-label="decrease">−</button>
                    <div class="gw-score-num">{{ awayScore }}</div>
                    <button class="gw-stepper" (click)="awayScore = awayScore + 1" aria-label="increase">+</button>
                  </div>
                </div>
              </div>

              @if (errorMsg()) {
                <div class="gw-error">{{ errorMsg() }}</div>
              }

              <button class="gw-submit-btn" [disabled]="submitting()" (click)="submitEntry()">
                @if (submitting()) {
                  <div class="gw-btn-spinner"></div> Submitting…
                } @else {
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8L2 7h20l-6-4z"/></svg>
                  Submit Prediction
                }
              </button>
            </div>
          }
        }

        <!-- ── Footer note ── -->
        <p class="gw-footer-note">
          One entry per account &nbsp;·&nbsp; Minimum 100 entries required to draw &nbsp;·&nbsp;
          1 winner from correct predictions
        </p>

      }
    </div>
  `,
  styles: [`
    .gw-page {
      max-width: 560px;
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

    /* Winner card */
    .gw-winner-card {
      background: linear-gradient(135deg, #1a237e 0%, #4a148c 100%);
      border-radius: 16px; padding: 32px 24px;
      text-align: center; margin-bottom: 20px;
      position: relative; overflow: hidden;
    }
    .gw-winner-card::before {
      content: '';
      position: absolute; inset: 0;
      background: repeating-linear-gradient(45deg, transparent, transparent 20px, rgba(255,255,255,0.03) 20px, rgba(255,255,255,0.03) 40px);
    }
    .gw-winner-top {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      margin-bottom: 12px; position: relative;
    }
    .gw-trophy-ring {
      width: 56px; height: 56px;
      background: rgba(255,255,255,0.15);
      border: 2px solid rgba(212,175,55,0.6);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: #f9a825;
    }
    .gw-winner-label {
      font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
      text-transform: uppercase; color: rgba(255,255,255,0.6);
    }
    .gw-winner-name {
      font-size: 2rem; font-weight: 800;
      color: #f9a825;
      margin-bottom: 12px; position: relative;
    }
    .gw-lucky-pill, .gw-correct-pill {
      display: inline-block;
      font-size: 0.82rem; font-weight: 600;
      padding: 4px 14px; border-radius: 20px;
      margin-bottom: 16px; position: relative;
    }
    .gw-lucky-pill { background: rgba(255,255,255,0.15); color: rgba(255,255,255,0.9); }
    .gw-correct-pill { background: rgba(76,175,80,0.3); color: #a5d6a7; }
    .gw-winner-prize-row {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      color: white; font-size: 0.95rem; position: relative; margin-bottom: 8px;
    }
    .gw-winner-prize-label { opacity: 0.6; }
    .gw-winner-prize-value { font-weight: 700; color: #f9a825; }
    .gw-final-score { font-size: 0.82rem; color: rgba(255,255,255,0.5); position: relative; }

    /* Match card */
    .gw-match-card {
      background: white;
      border: 1px solid #e8e8e8;
      border-radius: 16px;
      overflow: hidden;
      margin-bottom: 16px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    }
    .gw-match-card-header {
      padding: 12px 20px;
      background: #f8f9ff;
      border-bottom: 1px solid #eee;
      display: flex; justify-content: space-between; align-items: center;
    }
    .gw-match-card-title {
      font-size: 11px; font-weight: 700; letter-spacing: 0.08em;
      text-transform: uppercase; color: #888;
    }
    .gw-status-pill {
      font-size: 12px; font-weight: 700;
      padding: 3px 12px; border-radius: 20px;
    }
    .gw-status-open   { background: #e8f5e9; color: #2e7d32; }
    .gw-status-closed { background: #fce4ec; color: #c62828; }
    .gw-status-drawn  { background: #e3f2fd; color: #1565c0; }

    .gw-teams {
      display: flex; align-items: center;
      padding: 24px 20px 20px;
    }
    .gw-team {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; gap: 8px;
    }
    .gw-team-right { }
    .gw-flag {
      width: 52px; height: 34px;
      object-fit: cover; border-radius: 4px;
      border: 1px solid #eee;
    }
    .gw-flag-placeholder {
      width: 52px; height: 34px;
      background: #f5f5f5; border-radius: 4px;
    }
    .gw-team-name { font-size: 1rem; font-weight: 700; color: #1a1a2e; text-align: center; }
    .gw-vs-col {
      flex-shrink: 0; width: 80px; text-align: center;
      display: flex; flex-direction: column; align-items: center; gap: 2px;
    }
    .gw-vs-text {
      font-size: 0.8rem; font-weight: 700; color: #bbb;
      text-transform: uppercase; letter-spacing: 0.08em;
    }
    .gw-match-time { font-size: 0.75rem; color: #aaa; }
    .gw-ft-score { font-size: 1.5rem; font-weight: 800; color: #1a237e; }

    .gw-stats-row {
      display: grid; grid-template-columns: repeat(3, 1fr);
      border-top: 1px solid #f0f0f0;
    }
    .gw-stat {
      padding: 14px 8px; text-align: center;
      border-right: 1px solid #f0f0f0;
    }
    .gw-stat:last-child { border-right: none; }
    .gw-stat-icon { font-size: 1.2rem; margin-bottom: 4px; }
    .gw-stat-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #aaa; margin-bottom: 2px; }
    .gw-stat-value { font-size: 0.92rem; font-weight: 700; color: #333; }

    /* Login */
    .gw-login-card {
      background: white; border: 1px solid #e8e8e8; border-radius: 16px;
      padding: 32px 24px; text-align: center;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
      margin-bottom: 16px;
    }
    .gw-login-icon { font-size: 2rem; margin-bottom: 10px; }
    .gw-login-card h3 { margin: 0 0 8px; font-size: 1.1rem; }
    .gw-login-card p { color: #888; margin: 0 0 20px; font-size: 0.9rem; }
    .gw-login-btn {
      display: inline-block; padding: 12px 28px;
      background: #1a237e; color: white;
      border-radius: 10px; text-decoration: none; font-weight: 700;
      font-size: 0.95rem;
    }

    /* Already entered */
    .gw-entered-card {
      background: white; border: 1.5px solid #a5d6a7;
      border-radius: 16px; padding: 24px 20px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
      margin-bottom: 16px;
    }
    .gw-entered-top {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 16px;
    }
    .gw-check-circle {
      width: 36px; height: 36px; flex-shrink: 0;
      background: #e8f5e9; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: #2e7d32;
    }
    .gw-entered-title { font-size: 1.05rem; font-weight: 700; color: #2e7d32; }

    .gw-prediction-display {
      display: flex; align-items: center;
      background: #f8f9ff; border-radius: 10px;
      padding: 16px; gap: 8px; margin-bottom: 12px;
    }
    .gw-pred-team {
      flex: 1; display: flex; align-items: center; gap: 6px;
      font-size: 0.9rem; font-weight: 600; color: #333;
    }
    .gw-pred-team-right { justify-content: flex-end; flex-direction: row-reverse; }
    .gw-pred-flag { width: 24px; height: 16px; object-fit: cover; border-radius: 2px; }
    .gw-pred-score {
      display: flex; align-items: center; gap: 6px; flex-shrink: 0;
    }
    .gw-pred-num {
      width: 40px; height: 40px;
      background: white; border: 2px solid #1a237e;
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.2rem; font-weight: 800; color: #1a237e;
    }
    .gw-pred-dash { font-size: 1.1rem; font-weight: 700; color: #ccc; }
    .gw-entered-note { font-size: 0.82rem; color: #888; text-align: center; margin: 0; }

    /* Form card */
    .gw-form-card {
      background: white; border: 1px solid #e8e8e8;
      border-radius: 16px; padding: 28px 24px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
      margin-bottom: 16px;
    }
    .gw-form-header { margin-bottom: 24px; }
    .gw-form-title { font-size: 1.1rem; font-weight: 700; color: #1a1a2e; margin-bottom: 4px; }
    .gw-form-hint { color: #888; font-size: 0.85rem; margin: 0; }

    .gw-score-row {
      display: flex; align-items: center;
      gap: 12px; margin-bottom: 24px;
    }
    .gw-score-team-col { flex: 1; }
    .gw-score-team-col-right { }
    .gw-score-team-name {
      font-size: 0.85rem; font-weight: 600; color: #555;
      margin-bottom: 10px; text-align: center;
      display: flex; align-items: center; justify-content: center; gap: 6px;
    }
    .gw-score-team-name-right { }
    .gw-score-flag { width: 22px; height: 15px; object-fit: cover; border-radius: 2px; border: 1px solid #eee; }
    .gw-score-input-wrap {
      display: flex; align-items: center; justify-content: center;
      gap: 6px;
    }
    .gw-stepper {
      width: 36px; height: 36px;
      background: #f0f4ff; border: 1.5px solid #c5cae9;
      color: #1a237e; border-radius: 50%;
      font-size: 1.1rem; font-weight: 700;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: background 0.15s;
    }
    .gw-stepper:hover { background: #1a237e; color: white; border-color: #1a237e; }
    .gw-score-num {
      width: 60px; height: 60px;
      background: #f8f9ff; border: 2px solid #1a237e;
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 2rem; font-weight: 800; color: #1a237e;
      user-select: none;
    }
    .gw-score-divider {
      font-size: 1.5rem; font-weight: 700; color: #ddd;
      flex-shrink: 0; padding-top: 20px;
    }

    .gw-error {
      background: #fce4ec; color: #c62828;
      border-radius: 8px; padding: 10px 14px;
      font-size: 0.85rem; margin-bottom: 16px;
    }

    .gw-submit-btn {
      width: 100%; padding: 15px;
      background: #1a237e; color: white;
      border: none; border-radius: 12px;
      font-size: 1rem; font-weight: 700; cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: background 0.15s;
    }
    .gw-submit-btn:hover:not(:disabled) { background: #283593; }
    .gw-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .gw-btn-spinner {
      width: 18px; height: 18px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: gw-spin 0.75s linear infinite;
    }

    /* Footer */
    .gw-footer-note {
      text-align: center; font-size: 0.78rem; color: #aaa;
      margin: 8px 0 0;
    }
  `],
})
export class GiveawayComponent implements OnInit {
  private readonly giveawayService = inject(GiveawayService);
  readonly auth = inject(AuthService);

  loading = signal(true);
  giveaway = signal<GiveawayDto | null>(null);
  myEntry = signal<MyEntry | null>(null);
  submitting = signal(false);
  errorMsg = signal<string | null>(null);

  homeScore = 0;
  awayScore = 0;

  ngOnInit(): void {
    this.giveawayService.getActive().subscribe({
      next: (g) => {
        this.giveaway.set(g);
        this.loading.set(false);
        if (g && this.auth.isLoggedIn()) {
          this.giveawayService.getMyEntry(g.id).subscribe({
            next: (e) => this.myEntry.set(e),
            error: () => {},
          });
        }
      },
      error: () => this.loading.set(false),
    });
  }

  submitEntry(): void {
    const g = this.giveaway();
    if (!g) return;
    this.errorMsg.set(null);
    this.submitting.set(true);

    this.giveawayService.enter(g.id, this.homeScore, this.awayScore).subscribe({
      next: () => {
        this.myEntry.set({
          homeScore: this.homeScore,
          awayScore: this.awayScore,
          submittedAt: new Date().toISOString(),
        });
        this.submitting.set(false);
      },
      error: (e) => {
        this.errorMsg.set(e?.error?.message ?? 'Failed to submit entry.');
        this.submitting.set(false);
      },
    });
  }

  formatMatchTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }
}
