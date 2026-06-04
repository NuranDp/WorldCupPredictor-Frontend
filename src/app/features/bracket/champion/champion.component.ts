import { Component, inject, computed } from '@angular/core';
import { BracketService } from '../../../core/services/bracket.service';
import { BracketViewComponent } from '../../bracket-view/bracket-view.component';

@Component({
  selector: 'app-champion',
  standalone: true,
  imports: [BracketViewComponent],
  template: `
    <div class="champion-wrap">
      <div class="champion-card" [class.card-revealed]="!!champion()">

        <!-- Header -->
        <div class="champ-header" [class.header-pending]="!champion()">
          <div class="champ-header-left">
            <span class="champ-super">WORLD CUP 2026</span>
            <span class="champ-title">Champion</span>
          </div>
          <span class="champ-trophy">🏆</span>
        </div>

        <!-- Revealed state -->
        @if (champion(); as c) {
          <div class="champ-body">
            <div class="flag-wrap">
              <img [src]="c.flagUrl" [alt]="c.name" class="champ-flag">
              <div class="flag-glow"></div>
            </div>
            <h2 class="champ-name">{{ c.name }}</h2>
            <p class="champ-sub">Your predicted 2026 World Cup winner</p>
            <div class="stars-row">
              @for (s of [1,2,3,4,5]; track s) {
                <span class="star" [style.animation-delay.ms]="s * 80">⭐</span>
              }
            </div>
          </div>
        } @else {
          <!-- Pending state -->
          <div class="champ-pending">
            <div class="lock-icon">🔒</div>
            <p class="pending-title">Not yet revealed</p>
            <p class="pending-hint">Complete all knockout rounds — your champion will appear here.</p>
            <div class="pending-steps">
              @for (step of pendingSteps(); track step.label) {
                <div class="step-row" [class.step-done]="step.done">
                  <span class="step-dot">{{ step.done ? '✓' : '○' }}</span>
                  <span class="step-label">{{ step.label }}</span>
                </div>
              }
            </div>
          </div>
        }

      </div>
    </div>

    <!-- Full bracket -->
    <div class="bracket-section">
      <div class="bracket-section-title">📊 Full Bracket</div>
      <app-bracket-view [embedded]="true" />
    </div>
  `,
  styles: [`
    .champion-wrap {
      display: flex;
      justify-content: center;
      padding: 16px 0 24px;
    }
    .bracket-section {
      margin-top: 8px;
    }
    .bracket-section-title {
      font-size: 0.78rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.1em;
      color: #888; padding: 0 4px 10px;
    }

    /* ── Card ──────────────────────────────────────────────────── */
    .champion-card {
      width: 100%;
      max-width: 440px;
      background: white;
      border-radius: 20px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.12);
      overflow: hidden;
    }
    .card-revealed {
      animation: cardReveal 0.5s cubic-bezier(0.22, 1, 0.36, 1);
      box-shadow: 0 8px 40px rgba(249,168,37,0.35), 0 2px 16px rgba(0,0,0,0.12);
    }
    @keyframes cardReveal {
      from { opacity: 0.6; transform: scale(0.95) translateY(12px); }
      to   { opacity: 1;   transform: scale(1)    translateY(0); }
    }

    /* ── Header ────────────────────────────────────────────────── */
    .champ-header {
      background: linear-gradient(135deg, #e65100 0%, #f57f17 50%, #f9a825 100%);
      padding: 18px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: white;
    }
    .header-pending {
      background: linear-gradient(135deg, #37474f 0%, #546e7a 100%);
    }
    .champ-header-left { display: flex; flex-direction: column; gap: 2px; }
    .champ-super {
      font-size: 0.65rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.14em; opacity: 0.75;
    }
    .champ-title { font-size: 1.5rem; font-weight: 800; letter-spacing: 0.03em; }
    .champ-trophy {
      font-size: 2.4rem;
      animation: trophyFloat 3s ease-in-out infinite;
      display: inline-block;
    }
    @keyframes trophyFloat {
      0%, 100% { transform: translateY(0); }
      50%       { transform: translateY(-5px); }
    }

    /* ── Revealed body ─────────────────────────────────────────── */
    .champ-body {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32px 24px 28px;
      animation: bodyIn 0.45s cubic-bezier(0.22, 1, 0.36, 1);
    }
    @keyframes bodyIn {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .flag-wrap {
      position: relative;
      margin-bottom: 20px;
    }
    .champ-flag {
      display: block;
      width: 180px;
      height: auto;
      border-radius: 10px;
      box-shadow: 0 8px 28px rgba(0,0,0,0.25);
      animation: flagReveal 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both;
    }
    @keyframes flagReveal {
      from { opacity: 0; transform: scale(0.6) rotate(-4deg); }
      to   { opacity: 1; transform: scale(1) rotate(0deg); }
    }
    .flag-glow {
      position: absolute;
      inset: -12px;
      border-radius: 18px;
      background: radial-gradient(ellipse, rgba(249,168,37,0.4) 0%, transparent 70%);
      z-index: -1;
      animation: glowPulse 2s ease-in-out infinite alternate;
    }
    @keyframes glowPulse {
      from { opacity: 0.5; transform: scale(1); }
      to   { opacity: 1;   transform: scale(1.08); }
    }

    .champ-name {
      font-size: 1.9rem; font-weight: 800;
      margin: 0 0 6px; text-align: center;
      animation: nameIn 0.4s ease-out 0.25s both;
    }
    @keyframes nameIn {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .champ-sub {
      color: #888; font-size: 0.9rem; margin: 0 0 20px;
      text-align: center;
      animation: nameIn 0.4s ease-out 0.35s both;
    }

    .stars-row {
      display: flex; gap: 6px;
      animation: nameIn 0.4s ease-out 0.45s both;
    }
    .star {
      font-size: 1.1rem;
      display: inline-block;
      animation: starPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    }
    @keyframes starPop {
      from { opacity: 0; transform: scale(0) rotate(-30deg); }
      to   { opacity: 1; transform: scale(1) rotate(0deg); }
    }

    /* ── Pending body ──────────────────────────────────────────── */
    .champ-pending {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32px 24px 28px;
      text-align: center;
    }
    .lock-icon { font-size: 2.5rem; margin-bottom: 12px; opacity: 0.4; }
    .pending-title {
      font-size: 1.1rem; font-weight: 700;
      color: #444; margin: 0 0 6px;
    }
    .pending-hint {
      font-size: 0.85rem; color: #999;
      margin: 0 0 24px; max-width: 280px; line-height: 1.5;
    }

    .pending-steps {
      display: flex; flex-direction: column;
      gap: 8px; width: 100%; max-width: 260px;
      text-align: left;
    }
    .step-row {
      display: flex; align-items: center; gap: 10px;
      font-size: 0.83rem; color: #bbb;
      transition: color 0.3s;
    }
    .step-row.step-done { color: #43a047; }
    .step-dot { font-size: 0.75rem; font-weight: 700; width: 16px; text-align: center; }
    .step-label { }
  `],
})
export class ChampionComponent {
  private readonly bracketService = inject(BracketService);
  readonly champion = computed(() => this.bracketService.champion);

  pendingSteps = computed(() => {
    const picks = this.bracketService.knockoutPicks();
    const countPicked = (slots: number[]) =>
      slots.filter(s => picks.find(p => p.slotNumber === s)?.pickedTeamId !== null).length;

    return [
      { label: 'Round of 32 (16 picks)',   done: countPicked([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]) === 16 },
      { label: 'Round of 16 (8 picks)',    done: countPicked([17,18,19,20,21,22,23,24]) === 8 },
      { label: 'Quarter-Finals (4 picks)', done: countPicked([25,26,27,28]) === 4 },
      { label: 'Semi-Finals (2 picks)',    done: countPicked([29,30]) === 2 },
      { label: 'Final (1 pick)',           done: countPicked([32]) === 1 },
    ];
  });
}
