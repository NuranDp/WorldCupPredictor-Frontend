import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

interface TimeLeft {
  days: number; hours: number; minutes: number; seconds: number; locked: boolean;
}
interface PrizeTier {
  id: number; place: string; medal: string; title: string;
  color: string;
  reward: string;
  criteria: { icon: string; label: string }[];
}

const LOCK_DATE = '2026-06-10T00:00:00';
const WC_DATE   = 'June 11, 2026';

const PRIZES: PrizeTier[] = [
  {
    id: 1, place: '3rd Place', medal: '🥉', title: 'Bronze',
    color: 'linear-gradient(135deg,#bf360c,#e64a19)',
    reward: '👕 Official Jersey',
    criteria: [
      { icon: '🎯', label: 'Predict the match winner' },
    ],
  },
  {
    id: 2, place: '2nd Place', medal: '🥈', title: 'Silver',
    color: 'linear-gradient(135deg,#37474f,#546e7a)',
    reward: '👕 Jersey + ⚽ Football',
    criteria: [
      { icon: '🎯', label: 'Predict the match winner' },
      { icon: '📏', label: 'Goal difference' },
    ],
  },
  {
    id: 3, place: '1st Place', medal: '🥇', title: 'Gold',
    color: 'linear-gradient(135deg,#e65100,#f9a825)',
    reward: '👕 Jersey + ⚽ Football + 👟 Turf Shoe',
    criteria: [
      { icon: '🎯', label: 'Predict the match winner' },
      { icon: '📊', label: 'Exact scoreline' },
    ],
  },
];

const HOW_STEPS = [
  { icon: '✏️', title: 'Fill Your Bracket',  desc: 'Pick winners from the Group Stage all the way to the Final.' },
  { icon: '🎯', title: 'Earn Points',         desc: 'Score points for every correct prediction. Harder rounds pay more.' },
  { icon: '🏆', title: 'Win Prizes',          desc: 'Top predictors win the prize pack. May the best analyst win!' },
];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <!-- ── Hero ──────────────────────────────────────────────────── -->
    <section class="hero">
      <div class="hero-bg">
        @for (b of balls; track b) { <div class="bg-ball" [style]="b"></div> }
      </div>

      <!-- Left: content -->
      <div class="hero-content">
        <div class="hero-badge">⚽ FIFA WORLD CUP 2026</div>

        <h1 class="hero-title">
          Predict.<br>Compete.<br><span class="hero-accent">Win.</span>
        </h1>

        <p class="hero-sub">
          Fill your bracket, earn points for every correct pick,
          and top the leaderboard to claim your prize.
        </p>

        @if (time().locked) {
          <div class="locked-banner">🔒 Bracket is locked — Tournament underway!</div>
        } @else {
          <div class="big-countdown">
            <span class="bc-label">Bracket locks in</span>
            <div class="bc-digits">
              <div class="bc-seg">
                <span class="bc-val">{{ pad(time().days) }}</span>
                <span class="bc-unit">Days</span>
              </div>
              <span class="bc-colon">:</span>
              <div class="bc-seg">
                <span class="bc-val">{{ pad(time().hours) }}</span>
                <span class="bc-unit">Hours</span>
              </div>
              <span class="bc-colon">:</span>
              <div class="bc-seg">
                <span class="bc-val">{{ pad(time().minutes) }}</span>
                <span class="bc-unit">Mins</span>
              </div>
              <span class="bc-colon">:</span>
              <div class="bc-seg">
                <span class="bc-val bc-sec" [class.tick]="tick()">{{ pad(time().seconds) }}</span>
                <span class="bc-unit">Secs</span>
              </div>
            </div>
            <span class="bc-wc-date">⚽ Tournament kicks off {{ wcDate }}</span>
          </div>
        }

        <div class="hero-cta">
          <a class="cta-primary" routerLink="/bracket">Fill My Bracket →</a>
          <a class="cta-secondary" routerLink="/leaderboard">View Scores</a>
        </div>
      </div>

      <!-- Right: animated player figure -->
      <div class="hero-figure" aria-hidden="true">
        <svg class="player-svg" viewBox="0 0 230 430" xmlns="http://www.w3.org/2000/svg" fill="none" overflow="visible">

          <!-- Ball shadow (stays on ground, outside ball-group) -->
          <ellipse cx="196" cy="226" rx="22" ry="6"
                   fill="rgba(0,0,0,0.24)" class="ball-shadow"/>

          <!-- ─── Left arm (balance, going lower-left) ─── -->
          <line x1="65"  y1="98"  x2="40"  y2="142"
                stroke="rgba(255,218,196,0.95)" stroke-width="14" stroke-linecap="round"/>
          <circle cx="40" cy="142" r="7" fill="rgba(245,208,186,0.92)"/>
          <line x1="40"  y1="142" x2="24"  y2="170"
                stroke="rgba(245,208,186,0.90)" stroke-width="12" stroke-linecap="round"/>

          <!-- ─── Left standing leg ─── -->
          <line x1="80"  y1="202" x2="72"  y2="278"
                stroke="rgba(255,218,196,0.95)" stroke-width="15" stroke-linecap="round"/>
          <circle cx="72" cy="278" r="8" fill="rgba(245,208,186,0.92)"/>
          <line x1="72"  y1="278" x2="66"  y2="354"
                stroke="rgba(245,208,186,0.90)" stroke-width="13" stroke-linecap="round"/>
          <!-- Left shoe -->
          <path d="M 66,354 Q 48,362 30,358 L 26,366 Q 44,374 70,370 Q 78,368 76,358 Z"
                fill="rgba(28,28,68,0.95)"/>
          <line x1="38" y1="361" x2="62" y2="360"
                stroke="rgba(255,255,255,0.24)" stroke-width="2" stroke-linecap="round"/>

          <!-- ─── Torso (white jersey) ─── -->
          <path d="M 65,82 Q 55,130 68,170 L 116,170 Q 130,130 120,82 Z"
                fill="rgba(255,255,255,0.93)"/>
          <!-- Jersey chest stripe -->
          <path d="M 72,108 Q 90,116 112,108 L 110,130 Q 90,138 74,130 Z"
                fill="rgba(160,185,255,0.30)"/>
          <!-- V-collar -->
          <path d="M 78,82 L 90,96 L 102,82"
                stroke="rgba(160,185,255,0.55)" stroke-width="2.5" fill="none" stroke-linejoin="round"/>

          <!-- ─── Shorts (navy) ─── -->
          <path d="M 68,170 L 64,202 L 120,202 L 116,170 Z"
                fill="rgba(26,35,126,0.86)"/>
          <line x1="92" y1="171" x2="92" y2="200"
                stroke="rgba(255,255,255,0.10)" stroke-width="1.5"/>

          <!-- ─── Right arm (raised up for balance) ─── -->
          <line x1="120" y1="98"  x2="154" y2="72"
                stroke="rgba(255,218,196,0.95)" stroke-width="14" stroke-linecap="round"/>
          <circle cx="154" cy="72" r="7" fill="rgba(245,208,186,0.92)"/>
          <line x1="154" y1="72"  x2="172" y2="50"
                stroke="rgba(245,208,186,0.90)" stroke-width="12" stroke-linecap="round"/>

          <!-- ─── Right kicking leg (animated) ─── -->
          <g class="kick-leg">
            <!-- Thigh -->
            <line x1="114" y1="202" x2="148" y2="230"
                  stroke="rgba(255,218,196,0.95)" stroke-width="15" stroke-linecap="round"/>
            <!-- Knee joint -->
            <circle cx="148" cy="230" r="8" fill="rgba(245,208,186,0.92)"/>
            <!-- Shin (extended forward-up toward ball) -->
            <line x1="148" y1="230" x2="178" y2="208"
                  stroke="rgba(245,208,186,0.90)" stroke-width="13" stroke-linecap="round"/>
            <!-- Right shoe -->
            <path d="M 178,208 Q 196,200 214,204 L 218,212 Q 200,220 176,216 Q 168,214 170,208 Z"
                  fill="rgba(28,28,68,0.95)"/>
            <line x1="184" y1="204" x2="208" y2="207"
                  stroke="rgba(255,255,255,0.24)" stroke-width="2" stroke-linecap="round"/>
          </g>

          <!-- ─── Head (drawn on top) ─── -->
          <g class="p-head">
            <!-- Neck -->
            <line x1="90" y1="68" x2="90" y2="82"
                  stroke="rgba(255,218,196,0.92)" stroke-width="14" stroke-linecap="round"/>
            <!-- Head -->
            <circle cx="90" cy="44" r="25" fill="rgba(255,218,196,0.96)"/>
            <!-- Hair -->
            <path d="M 66,40 Q 70,16 90,14 Q 110,16 114,40 L 113,32 Q 108,10 90,9 Q 72,10 67,32 Z"
                  fill="rgba(70,50,30,0.82)"/>
            <!-- Eyes -->
            <circle cx="82" cy="44" r="3.5" fill="rgba(35,35,65,0.88)"/>
            <circle cx="98" cy="44" r="3.5" fill="rgba(35,35,65,0.88)"/>
            <!-- Eye shine -->
            <circle cx="83.5" cy="42.5" r="1.2" fill="rgba(255,255,255,0.72)"/>
            <circle cx="99.5" cy="42.5" r="1.2" fill="rgba(255,255,255,0.72)"/>
            <!-- Smile -->
            <path d="M 85,54 Q 90,58 95,54"
                  stroke="rgba(160,100,80,0.65)" stroke-width="2" fill="none" stroke-linecap="round"/>
          </g>

          <!-- ─── Soccer Ball ─── -->
          <g class="ball-group">
            <g class="ball-squash">
              <!-- Ball body (solid white) -->
              <circle cx="196" cy="188" r="24"
                      fill="rgba(255,255,255,0.97)" stroke="rgba(220,220,220,0.50)" stroke-width="1"/>
              <!-- Classic black-patch pattern (spins) -->
              <g class="ball-spin">
                <!-- Centre pentagon -->
                <polygon points="196,169 211,179 207,196 185,196 181,179"
                         fill="rgba(18,18,18,0.84)" stroke="rgba(255,255,255,0.28)" stroke-width="0.8"/>
                <!-- Right patch -->
                <polygon points="211,179 224,175 226,189 218,197 207,196"
                         fill="rgba(18,18,18,0.50)" stroke="rgba(255,255,255,0.18)" stroke-width="0.8"/>
                <!-- Left patch -->
                <polygon points="181,179 168,175 166,189 174,197 185,196"
                         fill="rgba(18,18,18,0.50)" stroke="rgba(255,255,255,0.18)" stroke-width="0.8"/>
                <!-- Top patch -->
                <polygon points="196,169 209,163 217,172 211,179 196,169"
                         fill="rgba(18,18,18,0.30)" stroke="rgba(255,255,255,0.15)" stroke-width="0.8"/>
              </g>
            </g>
          </g>

          <!-- Ground glow -->
          <ellipse cx="80" cy="384" rx="68" ry="9" fill="rgba(255,255,255,0.04)"/>

        </svg>
      </div>

    </section>

    <!-- ── Prizes ─────────────────────────────────────────────────── -->
    <section class="prizes-section">

      <!-- Decorative background -->
      <div class="ps-bg" aria-hidden="true">
        @for (s of sparkles; track s) { <span class="ps-star" [style]="s">✦</span> }
      </div>

      <div class="ps-head">
        <div class="ps-eyebrow">🎁 PRIZES</div>
        <h2 class="ps-title">Choose Your Challenge</h2>
        <p class="ps-sub">Pick a tier, make your predictions, and claim your prize</p>
      </div>

      <div class="ps-grid">
        @for (prize of prizes; track prize.id; let i = $index) {
          <div class="ps-card"
               [class.ps-card-gold]="prize.id === 3"
               [style.animation-delay.ms]="i * 120">

            @if (prize.id === 3) {
              <div class="ps-top-badge">⭐ TOP PRIZE</div>
            }

            <!-- Coloured banner -->
            <div class="ps-banner" [style.background]="prize.color">
              <span class="ps-rank-label">{{ prize.place }}</span>
              <span class="ps-big-medal">{{ prize.medal }}</span>
              <span class="ps-tier-name">{{ prize.title }}</span>
            </div>

            <!-- Body -->
            <div class="ps-body">

              <div class="ps-predict-label">You predict:</div>
              <div class="ps-criteria">
                @for (c of prize.criteria; track c.label) {
                  <div class="ps-criterion">
                    <span class="ps-c-icon">{{ c.icon }}</span>
                    <span class="ps-c-text">{{ c.label }}</span>
                  </div>
                }
              </div>

              <div class="ps-prize-box">
                <span class="ps-prize-icon">🎁</span>
                <span class="ps-prize-value">{{ prize.reward }}</span>
              </div>

              <button class="ps-cta" [class.ps-cta-gold]="prize.id === 3"
                      (click)="goToBracket(prize)">
                Play for {{ prize.title }} →
              </button>

            </div>
          </div>
        }
      </div>
    </section>

    <!-- ── How it works ───────────────────────────────────────────── -->
    <section class="how-section">
      <div class="how-head">
        <div class="section-eyebrow">📖 HOW IT WORKS</div>
        <h2 class="section-title">Simple as 1 – 2 – 3</h2>
      </div>

      <div class="how-flow">
        @for (step of steps; track step.title; let i = $index; let last = $last) {
          <div class="how-step" [style.animation-delay.ms]="i * 100">
            <div class="hs-icon-wrap" [class]="'hs-color-' + i">
              <span class="hs-icon">{{ step.icon }}</span>
            </div>
            <div class="hs-badge" [class]="'hs-badge-' + i">Step {{ i + 1 }}</div>
            <h3 class="hs-title">{{ step.title }}</h3>
            <p class="hs-desc">{{ step.desc }}</p>
          </div>
          @if (!last) {
            <div class="how-arrow">→</div>
          }
        }
      </div>
    </section>

    <!-- ── Stats strip ────────────────────────────────────────────── -->
    <div class="stats-strip">
      @for (stat of stats; track stat.label) {
        <div class="stat-item">
          <span class="stat-icon">{{ stat.icon }}</span>
          <span class="stat-val">{{ stat.val }}</span>
          <span class="stat-label">{{ stat.label }}</span>
        </div>
      }
    </div>

    <!-- ── Footer CTA ─────────────────────────────────────────────── -->
    <div class="footer-cta">
      <div class="fta-inner">
        <div class="fta-glow" aria-hidden="true"></div>
        <span class="fta-eyebrow">⚽ Ready to compete?</span>
        <h3 class="fta-title">Make your predictions before the bracket locks</h3>
        <div class="fta-actions">
          <a class="cta-primary" routerLink="/bracket">Start My Bracket →</a>
          <a class="fta-secondary" routerLink="/leaderboard">View Leaderboard</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    /* ── Shared ──────────────────────────────────────────────────── */
    .section { padding: 40px 0 24px; }
    .section-eyebrow {
      font-size: 0.68rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.16em;
      color: #f9a825; margin-bottom: 8px; text-align: center;
    }
    .section-title {
      font-size: 1.6rem; font-weight: 800; color: #1a237e;
      text-align: center; margin: 0 0 8px; letter-spacing: -0.01em;
    }
    .section-sub { text-align: center; color: #888; font-size: 0.9rem; margin: 0 0 28px; }

    /* ── Hero ────────────────────────────────────────────────────── */
    .hero {
      position: relative;
      background: linear-gradient(145deg, #0d1b4b 0%, #1a237e 45%, #283593 100%);
      border-radius: 20px;
      overflow: hidden;
      padding: 48px 28px 52px;
      margin-bottom: 20px;
      min-height: 360px;
      display: flex;
      align-items: center;
      gap: 24px;
    }

    /* Background floating circles */
    .hero-bg { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
    .bg-ball {
      position: absolute; border-radius: 50%;
      background: rgba(255,255,255,0.04);
      animation: floatBall 12s ease-in-out infinite;
    }
    @keyframes floatBall {
      0%,100% { transform: translateY(0) rotate(0deg); }
      33%      { transform: translateY(-20px) rotate(120deg); }
      66%      { transform: translateY(12px) rotate(240deg); }
    }

    /* Content area */
    .hero-content {
      position: relative; z-index: 1; flex: 1;
      animation: heroIn 0.65s cubic-bezier(0.22,1,0.36,1);
    }
    @keyframes heroIn {
      from { opacity: 0; transform: translateY(22px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .hero-badge {
      display: inline-flex; align-items: center;
      background: rgba(249,168,37,0.16);
      border: 1px solid rgba(249,168,37,0.35);
      color: #f9a825; font-size: 0.7rem; font-weight: 700;
      letter-spacing: 0.12em; text-transform: uppercase;
      padding: 5px 14px; border-radius: 20px; margin-bottom: 18px;
      animation: heroIn 0.65s 0.08s both;
    }
    .hero-title {
      font-size: 2.5rem; font-weight: 900; color: white;
      line-height: 1.1; margin: 0 0 16px; letter-spacing: -0.02em;
      animation: heroIn 0.65s 0.13s both;
    }
    .hero-accent { color: #f9a825; }
    .hero-sub {
      color: rgba(255,255,255,0.62); font-size: 0.88rem;
      line-height: 1.65; margin: 0 0 24px;
      animation: heroIn 0.65s 0.18s both;
    }

    /* Countdown */
    .locked-banner {
      display: inline-flex; align-items: center; gap: 8px;
      background: rgba(183,28,28,0.22); border: 1px solid rgba(183,28,28,0.45);
      color: #ef9a9a; padding: 10px 20px; border-radius: 12px;
      font-weight: 600; font-size: 0.9rem; margin-bottom: 24px;
    }
    .big-countdown {
      display: inline-flex; flex-direction: column; gap: 6px;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.13);
      border-radius: 16px; padding: 14px 22px; margin-bottom: 24px;
      backdrop-filter: blur(8px);
      animation: heroIn 0.65s 0.22s both;
    }
    .bc-label {
      font-size: 0.66rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.13em; color: rgba(255,255,255,0.52); text-align: center;
    }
    .bc-digits { display: flex; align-items: flex-start; gap: 4px; }
    .bc-seg {
      display: flex; flex-direction: column; align-items: center;
      gap: 3px; min-width: 50px;
    }
    .bc-val {
      font-size: 1.9rem; font-weight: 800; color: white; line-height: 1;
      font-variant-numeric: tabular-nums;
    }
    .bc-sec { color: #f9a825; }
    .bc-val.tick { animation: tickPop 0.16s ease; }
    @keyframes tickPop {
      0%  { transform: scale(1); }
      45% { transform: scale(1.20); }
      100%{ transform: scale(1); }
    }
    .bc-unit {
      font-size: 0.59rem; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.1em; color: rgba(255,255,255,0.42);
    }
    .bc-colon {
      font-size: 1.7rem; font-weight: 700;
      color: rgba(255,255,255,0.28); line-height: 1; padding-top: 3px;
    }
    .bc-wc-date {
      font-size: 0.68rem; color: rgba(255,255,255,0.36);
      text-align: center; letter-spacing: 0.04em;
    }

    /* CTA */
    .hero-cta {
      display: flex; gap: 12px; flex-wrap: wrap; align-items: center;
      animation: heroIn 0.65s 0.28s both;
    }
    .cta-primary {
      display: inline-flex; align-items: center; padding: 11px 22px;
      border-radius: 26px;
      background: linear-gradient(135deg,#f9a825,#e65100);
      color: white; font-size: 0.90rem; font-weight: 700;
      text-decoration: none;
      box-shadow: 0 4px 16px rgba(249,168,37,0.42);
      transition: all 0.18s ease; white-space: nowrap;
    }
    .cta-primary:hover {
      box-shadow: 0 7px 24px rgba(249,168,37,0.58); transform: translateY(-2px);
    }
    .cta-secondary {
      display: inline-flex; align-items: center; padding: 10px 20px;
      border-radius: 26px; border: 2px solid rgba(255,255,255,0.24);
      color: rgba(255,255,255,0.78); font-size: 0.88rem; font-weight: 600;
      text-decoration: none; transition: all 0.18s ease; white-space: nowrap;
    }
    .cta-secondary:hover { border-color: rgba(255,255,255,0.52); color: white; background: rgba(255,255,255,0.08); }

    /* ── Player figure ───────────────────────────────────────────── */
    .hero-figure {
      position: relative; z-index: 1;
      flex-shrink: 0; display: none;
      align-items: flex-end; justify-content: center;
      animation: heroIn 0.65s 0.1s both;
    }
    .player-svg {
      width: 200px; height: auto;
      filter: drop-shadow(0 0 32px rgba(255,255,255,0.12));
    }

    /* ── Player animations ─────────────────────────────────────────── */

    /* Head gentle sway */
    .p-head {
      transform-origin: 90px 44px;
      animation: headSway 2.8s ease-in-out infinite;
    }
    @keyframes headSway {
      0%,100% { transform: rotate(0deg);  }
      35%     { transform: rotate(2.5deg); }
      70%     { transform: rotate(-2deg); }
    }

    /* Kick leg: rotates around right hip (114, 202)
       0deg = foot forward / kick moment (ball at foot)
       -16deg = foot pulled back (ball at peak)            */
    .kick-leg {
      transform-origin: 114px 202px;
      animation: kickLeg 1.4s infinite;
    }
    @keyframes kickLeg {
      0%,100% {
        transform: rotate(0deg);
        animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
      }
      50% {
        transform: rotate(-16deg);
        animation-timing-function: cubic-bezier(0.55, 0.055, 0.675, 0.19);
      }
    }

    /* Ball bounce: easeOutCubic going up (decelerates like real gravity)
                   easeInCubic coming down (accelerates like real gravity) */
    .ball-group {
      animation: ballBounce 1.4s infinite;
    }
    @keyframes ballBounce {
      0% {
        transform: translateY(0);
        animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
      }
      50% {
        transform: translateY(-78px);
        animation-timing-function: cubic-bezier(0.55, 0.055, 0.675, 0.19);
      }
      100% { transform: translateY(0); }
    }

    /* Ball squash at impact, stretch at peak */
    .ball-squash {
      transform-origin: 196px 188px;
      animation: ballSquash 1.4s infinite;
    }
    @keyframes ballSquash {
      0%,100% {
        transform: scaleX(1.18) scaleY(0.84);
        animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
      }
      20% { transform: scaleX(0.96) scaleY(1.04); }
      50% {
        transform: scaleX(0.94) scaleY(1.10);
        animation-timing-function: cubic-bezier(0.55, 0.055, 0.675, 0.19);
      }
      80% { transform: scaleX(0.97) scaleY(1.03); }
    }

    /* Ball patches spin continuously */
    .ball-spin {
      transform-origin: 196px 188px;
      animation: ballSpin 2.0s linear infinite;
    }
    @keyframes ballSpin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }

    /* Ground shadow shrinks and fades as ball rises */
    .ball-shadow {
      transform-origin: 196px 226px;
      animation: shadowAnim 1.4s infinite;
    }
    @keyframes shadowAnim {
      0%,100% {
        transform: scale(1);
        opacity: 0.65;
        animation-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
      }
      50% {
        transform: scale(0.22);
        opacity: 0.06;
        animation-timing-function: cubic-bezier(0.55, 0.055, 0.675, 0.19);
      }
    }

    /* ── Prizes section ─────────────────────────────────────────── */
    .prizes-section {
      position: relative;
      background: linear-gradient(160deg, #0a0612 0%, #1a0a2e 45%, #2d1458 100%);
      border-radius: 24px;
      padding: 52px 24px 56px;
      margin: 16px 0;
      overflow: hidden;
      box-shadow: 0 0 0 1px rgba(249,168,37,0.10),
                  inset 0 1px 0 rgba(249,168,37,0.08);
    }

    /* Sparkle stars — gold tones */
    .ps-bg { position: absolute; inset: 0; pointer-events: none; }
    .ps-star {
      position: absolute; color: #f9a825;
      animation: starPulse ease-in-out infinite;
    }
    @keyframes starPulse {
      0%,100% { transform: scale(1) rotate(0deg);   opacity: inherit; }
      50%     { transform: scale(1.5) rotate(30deg); opacity: 0.45; }
    }

    /* Section head */
    .ps-head { position: relative; z-index: 1; text-align: center; margin-bottom: 40px; }
    .ps-eyebrow {
      display: inline-block;
      font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.18em; color: #f9a825;
      background: rgba(249,168,37,0.12); border: 1px solid rgba(249,168,37,0.28);
      padding: 4px 14px; border-radius: 20px; margin-bottom: 12px;
    }
    .ps-title {
      font-size: 2rem; font-weight: 900; color: white;
      margin: 0 0 10px; letter-spacing: -0.02em;
    }
    @media (min-width: 600px) { .ps-title { font-size: 2.6rem; } }
    .ps-sub { font-size: 0.9rem; color: rgba(255,255,255,0.5); margin: 0; }

    /* Cards grid */
    .ps-grid {
      position: relative; z-index: 1;
      display: grid;
      grid-template-columns: 1fr;
      gap: 20px;
      max-width: 960px;
      margin: 0 auto;
    }
    @media (min-width: 640px) {
      .ps-grid { grid-template-columns: repeat(3, 1fr); align-items: start; }
    }

    /* Card base */
    .ps-card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 20px; overflow: hidden;
      display: flex; flex-direction: column;
      transition: transform 0.22s cubic-bezier(0.22,1,0.36,1),
                  box-shadow 0.22s ease;
      animation: psCardIn 0.5s cubic-bezier(0.22,1,0.36,1) both;
      position: relative;
      backdrop-filter: blur(6px);
    }
    @keyframes psCardIn {
      from { opacity:0; transform:translateY(36px) scale(0.96); }
      to   { opacity:1; transform:translateY(0)    scale(1); }
    }
    .ps-card:hover {
      transform: translateY(-6px);
      box-shadow: 0 16px 48px rgba(0,0,0,0.35);
    }

    /* Gold featured card */
    .ps-card-gold {
      border-color: rgba(249,168,37,0.50);
      background: rgba(249,168,37,0.07);
      box-shadow: 0 0 0 1px rgba(249,168,37,0.25),
                  0 0 60px rgba(249,168,37,0.18),
                  inset 0 1px 0 rgba(249,168,37,0.15);
    }
    @media (min-width: 640px) {
      .ps-card-gold { transform: translateY(-14px); }
      .ps-card-gold:hover { transform: translateY(-20px); }
    }

    /* TOP PRIZE badge */
    .ps-top-badge {
      position: absolute; top: 14px; right: 14px; z-index: 2;
      background: linear-gradient(135deg, #f9a825, #e65100);
      color: white; font-size: 0.6rem; font-weight: 800;
      text-transform: uppercase; letter-spacing: 0.12em;
      padding: 4px 10px; border-radius: 20px;
      box-shadow: 0 2px 8px rgba(249,168,37,0.50);
      animation: psCardIn 0.5s 0.3s both;
    }

    /* Banner */
    .ps-banner {
      padding: 28px 20px 24px;
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      color: white; text-align: center;
    }
    .ps-rank-label {
      font-size: 0.62rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.16em; opacity: 0.72;
    }
    .ps-big-medal { font-size: 3.4rem; line-height: 1; margin: 6px 0; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.4)); }
    .ps-tier-name { font-size: 1.5rem; font-weight: 900; letter-spacing: 0.04em; }

    /* Body */
    .ps-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; flex: 1; }

    .ps-predict-label {
      font-size: 0.62rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.12em; color: rgba(255,255,255,0.42);
    }
    .ps-criteria { display: flex; flex-direction: column; gap: 8px; }
    .ps-criterion {
      display: flex; align-items: center; gap: 10px;
      background: rgba(255,255,255,0.07); border-radius: 10px; padding: 9px 12px;
      border: 1px solid rgba(255,255,255,0.06);
    }
    .ps-c-icon { font-size: 1rem; flex-shrink: 0; }
    .ps-c-text { font-size: 0.85rem; font-weight: 500; color: rgba(255,255,255,0.85); }

    /* Prize box */
    .ps-prize-box {
      display: flex; align-items: flex-start; gap: 10px;
      background: rgba(249,168,37,0.08);
      border: 1px solid rgba(249,168,37,0.18);
      border-radius: 12px; padding: 12px 14px;
      margin-top: 4px;
    }
    .ps-prize-icon { font-size: 1.2rem; flex-shrink: 0; margin-top: 1px; }
    .ps-prize-value { font-size: 0.85rem; font-weight: 600; color: white; line-height: 1.4; }

    /* CTA button */
    .ps-cta {
      display: block; width: 100%;
      padding: 12px 0; border: none; border-radius: 12px;
      font-size: 0.88rem; font-weight: 700; cursor: pointer;
      transition: all 0.18s; margin-top: auto;
      background: rgba(255,255,255,0.10);
      color: rgba(255,255,255,0.80);
      border: 1px solid rgba(255,255,255,0.15);
    }
    .ps-cta:hover {
      background: rgba(255,255,255,0.18);
      color: white;
      transform: translateY(-1px);
    }
    .ps-cta-gold {
      background: linear-gradient(135deg, #f9a825, #e65100);
      color: white; border-color: transparent;
      box-shadow: 0 4px 16px rgba(249,168,37,0.40);
    }
    .ps-cta-gold:hover {
      box-shadow: 0 6px 24px rgba(249,168,37,0.55);
      background: linear-gradient(135deg, #ffb300, #f4511e);
    }

    /* ── How it works ────────────────────────────────────────────── */
    .how-section { padding: 40px 0 28px; }
    .how-head { text-align: center; margin-bottom: 36px; }

    .how-flow {
      display: flex;
      align-items: flex-start;
      gap: 0;
      flex-wrap: wrap;
      justify-content: center;
    }

    .how-step {
      display: flex; flex-direction: column; align-items: center; text-align: center;
      flex: 1; min-width: 180px; max-width: 260px;
      padding: 0 16px;
      animation: cardRise 0.45s cubic-bezier(0.22,1,0.36,1) both;
    }

    .hs-icon-wrap {
      width: 80px; height: 80px; border-radius: 24px;
      display: flex; align-items: center; justify-content: center;
      font-size: 2.4rem; margin-bottom: 14px;
      transition: transform 0.2s ease;
    }
    .how-step:hover .hs-icon-wrap { transform: translateY(-5px) scale(1.08); }

    .hs-color-0 { background: linear-gradient(135deg, #e3f2fd, #bbdefb); box-shadow: 0 8px 24px rgba(30,136,229,0.20); }
    .hs-color-1 { background: linear-gradient(135deg, #e8f5e9, #c8e6c9); box-shadow: 0 8px 24px rgba(56,142,60,0.20); }
    .hs-color-2 { background: linear-gradient(135deg, #fff8e1, #ffecb3); box-shadow: 0 8px 24px rgba(249,168,37,0.24); }

    .hs-badge {
      font-size: 0.62rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.12em; border-radius: 20px; padding: 3px 10px;
      margin-bottom: 8px;
    }
    .hs-badge-0 { background: #e3f2fd; color: #1565c0; }
    .hs-badge-1 { background: #e8f5e9; color: #2e7d32; }
    .hs-badge-2 { background: #fff8e1; color: #e65100; }

    .hs-title { font-size: 1rem; font-weight: 800; color: #1a237e; margin: 0 0 8px; }
    .hs-desc  { font-size: 0.84rem; color: #888; line-height: 1.6; margin: 0; }

    /* Arrow connector */
    .how-arrow {
      font-size: 1.6rem; color: #e0e0e0;
      display: flex; align-items: center; padding: 0 4px;
      padding-top: 28px; flex-shrink: 0;
    }
    @media (max-width: 600px) { .how-arrow { display: none; } }

    /* ── Stats strip ─────────────────────────────────────────────── */
    .stats-strip {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      background: linear-gradient(135deg, #1a237e 0%, #283593 100%);
      border-radius: 20px;
      padding: 0; margin: 8px 0;
      overflow: hidden;
    }
    @media (max-width: 480px) { .stats-strip { grid-template-columns: repeat(2, 1fr); } }

    .stat-item {
      display: flex; flex-direction: column; align-items: center;
      gap: 4px; padding: 24px 16px;
      border-right: 1px solid rgba(255,255,255,0.08);
      transition: background 0.18s;
    }
    .stat-item:last-child { border-right: none; }
    .stat-item:hover { background: rgba(255,255,255,0.06); }
    .stat-icon { font-size: 1.4rem; margin-bottom: 2px; }
    .stat-val   { font-size: 2rem; font-weight: 900; color: white; line-height: 1; font-variant-numeric: tabular-nums; }
    .stat-label { font-size: 0.7rem; color: rgba(255,255,255,0.52); font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; }

    /* ── Footer CTA ──────────────────────────────────────────────── */
    .footer-cta {
      margin: 16px 0 8px;
      border-radius: 20px;
      overflow: hidden;
    }
    .fta-inner {
      position: relative;
      background: linear-gradient(135deg, #0d1b4b 0%, #1a237e 50%, #283593 100%);
      padding: 48px 32px;
      text-align: center;
      overflow: hidden;
    }
    .fta-glow {
      position: absolute; inset: 0; pointer-events: none;
      background: radial-gradient(ellipse 60% 50% at 50% 100%, rgba(249,168,37,0.12), transparent);
    }
    .fta-eyebrow {
      display: inline-block;
      font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.16em; color: #f9a825;
      margin-bottom: 12px;
    }
    .fta-title {
      font-size: 1.4rem; font-weight: 800; color: white;
      margin: 0 0 28px; line-height: 1.3; letter-spacing: -0.01em;
      position: relative;
    }
    @media (min-width: 600px) { .fta-title { font-size: 1.8rem; } }
    .fta-actions {
      display: flex; gap: 14px; justify-content: center;
      flex-wrap: wrap; position: relative;
    }
    .fta-secondary {
      display: inline-flex; align-items: center; padding: 11px 22px;
      border-radius: 26px; border: 2px solid rgba(255,255,255,0.22);
      color: rgba(255,255,255,0.75); font-size: 0.9rem; font-weight: 600;
      text-decoration: none; transition: all 0.18s ease;
    }
    .fta-secondary:hover { border-color: rgba(255,255,255,0.5); color: white; background: rgba(255,255,255,0.08); }

    /* ── Responsive ──────────────────────────────────────────────── */
    @media (max-width: 639px) {
      .hero { display: none; }
    }
    @media (min-width: 640px) {
      .hero { padding: 52px 40px 56px; gap: 32px; min-height: 420px; }
      .hero-figure { display: flex; }
      .player-svg { width: 210px; }
      .hero-title { font-size: 3rem; }
    }
    @media (min-width: 900px) {
      .hero-title { font-size: 3.6rem; }
      .player-svg { width: 240px; }
    }

    /* ── Mobile-specific fixes ───────────────────────────────────── */
    @media (max-width: 639px) {
      .prizes-section { padding: 32px 16px 36px; border-radius: 16px; }
      .ps-title { font-size: 1.6rem; }
      .ps-grid { gap: 14px; }

      .how-section { padding: 28px 0 20px; }
      .how-flow { flex-direction: column; align-items: center; gap: 20px; }
      .how-step { min-width: 0; width: 100%; max-width: 100%; padding: 0 8px; }
      .hs-icon-wrap { width: 60px; height: 60px; font-size: 1.8rem; }

      .stats-strip { border-radius: 14px; }
      .stat-val { font-size: 1.4rem; }
      .stat-item { padding: 16px 8px; }

      .fta-inner { padding: 28px 16px; }
      .fta-title { font-size: 1.2rem; }
    }
  `],
})
export class HomeComponent implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  prizes = PRIZES;
  steps  = HOW_STEPS;
  wcDate = WC_DATE;

  stats = [
    { icon: '🌍', val: '48',  label: 'Teams' },
    { icon: '📋', val: '12',  label: 'Groups' },
    { icon: '⚽', val: '104', label: 'Matches' },
    { icon: '🏆', val: '1',   label: 'Champion' },
  ];

  sparkles = Array.from({ length: 18 }, (_, i) => {
    const size = 0.5 + Math.random() * 1.2;
    return `top:${Math.random() * 100}%;left:${Math.random() * 100}%;` +
           `font-size:${size}rem;opacity:${0.08 + Math.random() * 0.18};` +
           `animation-delay:${-i * 0.7}s;animation-duration:${4 + Math.random() * 5}s`;
  });

  balls = Array.from({ length: 8 }, (_, i) => {
    const size = 55 + Math.random() * 110;
    return `width:${size}px;height:${size}px;` +
           `top:${Math.random() * 100}%;left:${Math.random() * 100}%;` +
           `animation-duration:${10 + i * 2.5}s;animation-delay:${-i * 1.5}s`;
  });

  selectedPrize = signal<number | null>(null);
  time  = signal<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0, locked: false });
  tick  = signal(false);

  private sub?: Subscription;

  togglePrize(id: number): void {
    this.selectedPrize.set(this.selectedPrize() === id ? null : id);
  }

  goToBracket(prize: PrizeTier): void {
    this.router.navigate(['/bracket'], { queryParams: { tier: prize.title } });
  }

  selectedPrizeName(): string {
    return PRIZES.find(p => p.id === this.selectedPrize())?.title ?? '';
  }

  pad(n: number): string { return n.toString().padStart(2, '0'); }

  ngOnInit(): void {
    this.tickClock();
    this.sub = interval(1000).subscribe(() => {
      this.tick.set(true);
      setTimeout(() => this.tick.set(false), 180);
      this.tickClock();
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  private tickClock(): void {
    const diff = new Date(LOCK_DATE).getTime() - Date.now();
    if (diff <= 0) {
      this.time.set({ days: 0, hours: 0, minutes: 0, seconds: 0, locked: true });
      return;
    }
    this.time.set({
      days:    Math.floor(diff / 86400000),
      hours:   Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
      locked:  false,
    });
  }
}
