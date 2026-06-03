import { Component, inject, signal, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { SeoService } from '../../core/services/seo.service';

interface TimeLeft {
  days: number; hours: number; minutes: number; seconds: number; locked: boolean;
}
interface PrizeTier {
  id: number; place: string; medal: string; title: string;
  color: string;
  rewards: { icon: string; label: string }[];
  criteria: { icon: string; label: string }[];
}

const TOURNAMENT_START = '2026-06-11T16:00:00'; // First match kick-off (UTC)
const WC_DATE          = 'June 11, 2026';

const PRIZES: PrizeTier[] = [
  {
    id: 3, place: '1st Place', medal: '🥇', title: 'Gold',
    color: 'linear-gradient(135deg,#e65100,#f9a825)',
    rewards: [
      { icon: '👕', label: 'Jersey' },
      { icon: '⚽', label: 'Match Football' },
      { icon: '👟', label: 'Turf Shoes' },
    ],
    criteria: [
      { icon: '🎯', label: 'Predict the match winner' },
      { icon: '📊', label: 'Exact scoreline' },
    ],
  },
  {
    id: 2, place: '2nd Place', medal: '🥈', title: 'Silver',
    color: 'linear-gradient(135deg,#37474f,#546e7a)',
    rewards: [
      { icon: '👕', label: 'Jersey' },
      { icon: '⚽', label: 'Match Football' },
    ],
    criteria: [
      { icon: '🎯', label: 'Predict the match winner' },
      { icon: '📏', label: 'Goal difference' },
    ],
  },
  {
    id: 1, place: '3rd Place', medal: '🥉', title: 'Bronze',
    color: 'linear-gradient(135deg,#bf360c,#e64a19)',
    rewards: [
      { icon: '👕', label: 'Jersey' },
    ],
    criteria: [
      { icon: '🎯', label: 'Predict the match winner' },
    ],
  },
];

const WHEEL_COLORS = [
  '#C62828','#1565C0','#2E7D32','#6A1B9A',
  '#E65100','#00695C','#283593','#AD1457',
];
const WHEEL_TEAMS = [
  { name: 'Brazil',       iso: 'br' }, { name: 'Argentina',    iso: 'ar' },
  { name: 'France',       iso: 'fr' }, { name: 'England',      iso: 'gb-eng' },
  { name: 'Spain',        iso: 'es' }, { name: 'Germany',      iso: 'de' },
  { name: 'Portugal',     iso: 'pt' }, { name: 'Netherlands',  iso: 'nl' },
  { name: 'Belgium',      iso: 'be' }, { name: 'Croatia',      iso: 'hr' },
  { name: 'Uruguay',      iso: 'uy' }, { name: 'Colombia',     iso: 'co' },
  { name: 'Mexico',       iso: 'mx' }, { name: 'USA',          iso: 'us' },
  { name: 'Canada',       iso: 'ca' }, { name: 'Morocco',      iso: 'ma' },
  { name: 'Senegal',      iso: 'sn' }, { name: 'Japan',        iso: 'jp' },
  { name: 'South Korea',  iso: 'kr' }, { name: 'Australia',    iso: 'au' },
  { name: 'Switzerland',  iso: 'ch' }, { name: 'Denmark',      iso: 'dk' },
  { name: 'Poland',       iso: 'pl' }, { name: 'Serbia',       iso: 'rs' },
  { name: 'Ecuador',      iso: 'ec' }, { name: 'Peru',         iso: 'pe' },
  { name: 'Saudi Arabia', iso: 'sa' }, { name: 'Iran',         iso: 'ir' },
  { name: 'Cameroon',     iso: 'cm' }, { name: 'Tunisia',      iso: 'tn' },
  { name: 'Costa Rica',   iso: 'cr' }, { name: 'Panama',       iso: 'pa' },
].map((t, i) => ({ ...t, color: WHEEL_COLORS[i % WHEEL_COLORS.length] }));

const SPIN_FAVOURITES = ['Brazil','Argentina','France','Spain','Portugal','England','Germany','Netherlands'];
const SPIN_OTHERS     = WHEEL_TEAMS.map(t => t.name).filter(n => !SPIN_FAVOURITES.includes(n));

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
          <div class="locked-banner">⚽ Tournament has kicked off! Late picks score 0 for started matches.</div>
        } @else {
          <div class="big-countdown">
            <span class="bc-label">Tournament kicks off in</span>
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
          <a class="cta-secondary" routerLink="/leaderboard">Leaderboard</a>
          <a class="cta-rules" routerLink="/rules">Rules</a>
        </div>
      </div>

      <!-- Right: slot machine reel -->
      <div class="hero-figure">
        <div class="hslot">
          <div class="hslot-eyebrow">🎰 Lucky Spin</div>
          <div class="hslot-chassis">
            <div class="hslot-screen">
              <div class="hslot-center-glow"></div>
              <div class="hslot-reel" #slotReelHero>
                @for (t of reelItems; track $index) {
                  <div class="hslot-item" [style.--team-color]="t.color">
                    <img class="hslot-flag" [src]="'https://flagcdn.com/32x24/' + t.iso + '.png'" [alt]="t.name" width="32" height="24">
                    <span class="hslot-name">{{ t.name }}</span>
                  </div>
                }
              </div>
              <div class="hslot-vignette"></div>
            </div>
          </div>
          <button class="hslot-btn" [class.spinning]="isSpinning" (click)="spin()" [disabled]="isSpinning">
            @if (isSpinning) {
              <svg class="spin-ring" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.3)" stroke-width="3"/><path d="M12 3a9 9 0 0 1 9 9" stroke="white" stroke-width="3" stroke-linecap="round"/></svg>
              Spinning…
            } @else { 🎰 SPIN! }
          </button>
          @if (spinWinner) {
            <div class="hslot-result">🏆 {{ spinWinner.name }}</div>
          } @else {
            <div class="hslot-idle">Spin to find your champion!</div>
          }
        </div>
      </div>

    </section>

    <div class="spin-prizes-stack">
    <!-- ── Lucky Spin (mobile only — hero card handles desktop) ────── -->
    <section class="spin-section">
      <div class="spin-head">
        <div class="section-eyebrow">🎰 LUCKY SPIN</div>
        <h2 class="spin-title">Who's Your Champion?</h2>
        <p class="spin-sub">Spin the reel — let fate pick your World Cup winner!</p>
      </div>

      <div class="spin-layout">
        <!-- Slot machine -->
        <div class="mslot-chassis">
          <div class="mslot-screen">
            <div class="mslot-center-glow"></div>
            <div class="mslot-reel" #slotReelMobile>
              @for (t of reelItems; track $index) {
                <div class="mslot-item" [style.--team-color]="t.color">
                  <img class="mslot-flag" [src]="'https://flagcdn.com/32x24/' + t.iso + '.png'" [alt]="t.name" width="32" height="24">
                  <span class="mslot-name">{{ t.name }}</span>
                </div>
              }
            </div>
            <div class="mslot-vignette"></div>
          </div>
        </div>

        <div class="spin-right">
          <button class="spin-btn" [class.spinning]="isSpinning" (click)="spin()" [disabled]="isSpinning">
            @if (isSpinning) {
              <svg class="spin-ring" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.3)" stroke-width="3"/><path d="M12 3a9 9 0 0 1 9 9" stroke="white" stroke-width="3" stroke-linecap="round"/></svg>
              Spinning…
            } @else { <span>🎰</span> SPIN! }
          </button>

          @if (spinWinner) {
            <div class="spin-result">
              <div class="spin-result-crown">🏆</div>
              <div class="spin-result-name">{{ spinWinner.name }}</div>
              <div class="spin-result-msg">Could be your World Cup champion!</div>
              <button class="spin-go-btn" (click)="goToBracket(prizes[0])">Build my bracket →</button>
            </div>
          } @else {
            <div class="spin-hint">
              <div class="spin-hint-icon">⚽</div>
              <p>Hit <strong>SPIN</strong> to find out which team fate picks for you!</p>
            </div>
          }
        </div>
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
              <span class="ps-big-medal">{{ prize.medal }}</span>
              <span class="ps-tier-name">{{ prize.title }}</span>
            </div>

            <!-- Body -->
            <div class="ps-body">

              <!-- Prizes — focal point -->
              <div class="ps-prizes-label">🎁 You win:</div>
              <div class="ps-rewards">
                @for (r of prize.rewards; track r.label) {
                  <div class="ps-reward-item" [class.ps-reward-gold]="prize.id === 3">
                    <span class="ps-reward-icon">{{ r.icon }}</span>
                    <span class="ps-reward-label">{{ r.label }}</span>
                  </div>
                }
              </div>

              <div class="ps-divider"></div>

              <div class="ps-predict-label">You predict:</div>
              <div class="ps-criteria">
                @for (c of prize.criteria; track c.label) {
                  <div class="ps-criterion">
                    <span class="ps-c-icon">{{ c.icon }}</span>
                    <span class="ps-c-text">{{ c.label }}</span>
                  </div>
                }
              </div>

              <button class="ps-cta"
                      [class.ps-cta-gold]="prize.id === 3"
                      [class.ps-cta-silver]="prize.id === 2"
                      [class.ps-cta-bronze]="prize.id === 1"
                      (click)="goToBracket(prize)">
                Play for {{ prize.title }} →
              </button>

            </div>
          </div>
        }
      </div>
    </section>
    </div><!-- /spin-prizes-stack -->

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

    <!-- ── Sponsor CTA ─────────────────────────────────────────────── -->
    <div class="sponsor-section">
      <div class="sponsor-inner">
        <div class="sponsor-badge">🤝 Become a Sponsor</div>
        <h3 class="sponsor-title">Be the proud sponsor of <span class="sponsor-highlight">Predict The Champion</span></h3>
        <p class="sponsor-desc">
          Help us give bigger and better prizes to our winners!<br>
          Your brand in front of passionate football fans. Let's make this unforgettable together.
        </p>
        <a
          href="https://www.facebook.com/share/1Ky9JzeZBq/"
          target="_blank"
          rel="noopener noreferrer"
          class="sponsor-btn">
          <svg class="sponsor-fb-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.791-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.883v2.286h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
          </svg>
          Contact Us on Facebook
        </a>
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
      justify-content: space-between;
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
    .cta-rules {
      display: inline-flex; align-items: center; gap: 4px;
      color: rgba(255,255,255,0.5); font-size: 0.82rem; font-weight: 600;
      text-decoration: none; transition: color 0.18s; white-space: nowrap;
      padding: 4px 2px; border-bottom: 1px dashed rgba(255,255,255,0.25);
    }
    .cta-rules:hover { color: rgba(255,255,255,0.85); border-bottom-color: rgba(255,255,255,0.5); }

    /* ── Hero slot machine (right column) ───────────────────────── */
    .hero-figure {
      position: relative; z-index: 1; flex-shrink: 0;
      display: none; flex-direction: column; align-items: center;
      padding-right: 12px;
    }
    @media (min-width: 640px) { .hero-figure { display: flex; } }

    .hslot { display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .hslot-eyebrow {
      font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.18em; color: rgba(255,255,255,0.40);
    }

    /* Chassis */
    .hslot-chassis {
      background: #020813;
      border: 2px solid transparent;
      border-radius: 18px; padding: 5px;
      position: relative;
      background-clip: padding-box;
      box-shadow:
        0 0 0 2px rgba(249,168,37,0.7),
        0 0 30px rgba(249,168,37,0.35),
        0 0 60px rgba(249,168,37,0.12),
        inset 0 0 20px rgba(0,0,0,0.8);
      width: 260px;
      animation: chassis-pulse 2.5s ease-in-out infinite;
    }
    @keyframes chassis-pulse {
      0%,100% { box-shadow: 0 0 0 2px rgba(249,168,37,0.7), 0 0 30px rgba(249,168,37,0.35), 0 0 60px rgba(249,168,37,0.12), inset 0 0 20px rgba(0,0,0,0.8); }
      50%     { box-shadow: 0 0 0 2px rgba(249,168,37,1),   0 0 45px rgba(249,168,37,0.55), 0 0 90px rgba(249,168,37,0.22), inset 0 0 20px rgba(0,0,0,0.8); }
    }

    /* Screen */
    .hslot-screen {
      position: relative;
      height: 264px; /* 3 × 88px */
      overflow: hidden; border-radius: 12px;
      background: linear-gradient(180deg, #060e1f 0%, #0a1628 50%, #060e1f 100%);
      /* CRT scanline overlay */
      &::after {
        content: ''; position: absolute; inset: 0; z-index: 5; pointer-events: none;
        background: repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px);
      }
    }
    /* Gold selection lines */
    .hslot-screen::before {
      content: ''; position: absolute; left: 0; right: 0; z-index: 3;
      top: 88px; height: 88px;
      background: linear-gradient(180deg,
        rgba(249,168,37,0.0) 0%,
        rgba(249,168,37,0.12) 20%,
        rgba(249,168,37,0.18) 50%,
        rgba(249,168,37,0.12) 80%,
        rgba(249,168,37,0.0) 100%
      );
      border-top: 1.5px solid rgba(249,168,37,0.9);
      border-bottom: 1.5px solid rgba(249,168,37,0.9);
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.08),
        0 -1px 12px rgba(249,168,37,0.5),
        0  1px 12px rgba(249,168,37,0.5);
    }

    /* Center ambient glow */
    .hslot-center-glow {
      position: absolute; left: 0; right: 0; top: 88px; height: 88px;
      background: radial-gradient(ellipse at center, rgba(249,168,37,0.15) 0%, transparent 70%);
      z-index: 1; pointer-events: none;
      animation: center-pulse 1.8s ease-in-out infinite;
    }
    @keyframes center-pulse {
      0%,100% { opacity: 1; }
      50%     { opacity: 0.4; }
    }

    /* Reel */
    .hslot-reel {
      position: absolute; top: 0; left: 0; right: 0;
      will-change: transform; z-index: 2;
    }
    .hslot-item {
      height: 88px; display: flex; align-items: center; gap: 12px;
      padding: 0 18px;
      font-size: 1rem; font-weight: 700; color: rgba(255,255,255,0.5);
      border-bottom: 1px solid rgba(255,255,255,0.04);
      letter-spacing: 0.02em;
      border-left: 3px solid var(--team-color, transparent);
      box-shadow: inset 3px 0 12px -8px var(--team-color, transparent);
    }
    .hslot-flag { flex-shrink: 0; border-radius: 2px; box-shadow: 0 1px 4px rgba(0,0,0,0.5); object-fit: cover; }
    .hslot-name { flex: 1; }

    /* Top/bottom vignette */
    .hslot-vignette {
      position: absolute; inset: 0; z-index: 4; pointer-events: none;
      background: linear-gradient(to bottom,
        rgba(6,14,31,0.97) 0%, rgba(6,14,31,0.5) 20%,
        transparent 33%, transparent 67%,
        rgba(6,14,31,0.5) 80%, rgba(6,14,31,0.97) 100%
      );
    }

    .hslot-btn {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 10px 28px; border: none; border-radius: 50px; cursor: pointer;
      font-size: 0.88rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
      background: linear-gradient(135deg,#f9a825,#e65100);
      color: white; box-shadow: 0 3px 14px rgba(249,168,37,0.45);
      transition: transform 0.18s, box-shadow 0.18s;
    }
    .hslot-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(249,168,37,0.60); }
    .hslot-btn:disabled { cursor: not-allowed; }
    .hslot-btn.spinning {
      display: inline-flex; align-items: center; gap: 7px;
      animation: btn-pulse 1.2s ease-in-out infinite;
      background: linear-gradient(135deg,#e65100,#f9a825,#e65100); background-size: 200% 100%;
      animation: btn-shimmer 1.4s linear infinite, btn-glow 1.2s ease-in-out infinite;
    }
    .hslot-btn .spin-ring { width: 15px; height: 15px; animation: ring-spin 0.8s linear infinite; flex-shrink: 0; }

    .hslot-idle { font-size: 0.75rem; color: rgba(255,255,255,0.35); }
    .hslot-result {
      font-size: 0.95rem; font-weight: 800; color: white;
      animation: resultPop 0.4s cubic-bezier(0.22,1,0.36,1) both;
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
    @keyframes ring-spin {
      to { transform: rotate(360deg); }
    }
    @keyframes btn-shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    @keyframes btn-glow {
      0%,100% { box-shadow: 0 4px 16px rgba(249,168,37,0.5); }
      50%     { box-shadow: 0 4px 28px rgba(249,168,37,0.9), 0 0 40px rgba(249,168,37,0.4); }
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
      padding: 28px 20px 22px;
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      color: white; text-align: center;
    }
    .ps-big-medal { font-size: 3.4rem; line-height: 1; margin: 0 0 6px; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.4)); }
    .ps-tier-name { font-size: 1.5rem; font-weight: 900; letter-spacing: 0.04em; }

    /* Body */
    .ps-body { padding: 20px; display: flex; flex-direction: column; gap: 14px; flex: 1; }

    /* Rewards — focal */
    .ps-prizes-label {
      font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.14em; color: #f9a825;
    }
    .ps-rewards { display: flex; flex-direction: column; gap: 10px; }
    .ps-reward-item {
      display: flex; align-items: center; gap: 14px;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.10);
      border-radius: 12px; padding: 12px 16px;
      transition: background 0.18s;
    }
    .ps-reward-item.ps-reward-gold {
      background: rgba(249,168,37,0.10);
      border-color: rgba(249,168,37,0.22);
    }
    .ps-reward-icon { font-size: 1.6rem; flex-shrink: 0; }
    .ps-reward-label { font-size: 0.95rem; font-weight: 700; color: white; }

    /* Divider */
    .ps-divider {
      height: 1px;
      background: rgba(255,255,255,0.08);
      margin: 2px 0;
    }

    .ps-predict-label {
      font-size: 0.62rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.12em; color: rgba(255,255,255,0.42);
    }
    .ps-criteria { display: flex; flex-direction: column; gap: 8px; }
    .ps-criterion {
      display: flex; align-items: center; gap: 10px;
      background: rgba(255,255,255,0.06); border-radius: 10px; padding: 9px 12px;
      border: 1px solid rgba(255,255,255,0.06);
    }
    .ps-c-icon { font-size: 1rem; flex-shrink: 0; }
    .ps-c-text { font-size: 0.83rem; font-weight: 500; color: rgba(255,255,255,0.75); }

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
    .ps-cta-silver {
      background: linear-gradient(135deg, #78909c, #b0bec5);
      color: white; border-color: transparent;
      box-shadow: 0 4px 16px rgba(176,190,197,0.30);
    }
    .ps-cta-silver:hover {
      background: linear-gradient(135deg, #90a4ae, #cfd8dc);
      box-shadow: 0 6px 24px rgba(176,190,197,0.50);
    }
    .ps-cta-bronze {
      background: linear-gradient(135deg, #bf360c, #e64a19);
      color: white; border-color: transparent;
      box-shadow: 0 4px 16px rgba(230,74,25,0.35);
    }
    .ps-cta-bronze:hover {
      background: linear-gradient(135deg, #d84315, #ff5722);
      box-shadow: 0 6px 24px rgba(230,74,25,0.55);
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

    /* ── Sponsor section ─────────────────────────────────────────── */
    .sponsor-section {
      background: linear-gradient(135deg, #f8f9ff 0%, #eef0fb 100%);
      border-top: 2px dashed #c5cae9;
      padding: 48px 16px;
      text-align: center;
    }
    .sponsor-inner { max-width: 600px; margin: 0 auto; }
    .sponsor-badge {
      display: inline-block;
      background: #e8eaf6; color: #1a237e;
      font-size: 0.8rem; font-weight: 700;
      padding: 5px 14px; border-radius: 20px;
      letter-spacing: 0.5px; margin-bottom: 16px;
    }
    .sponsor-title {
      font-size: 1.5rem; font-weight: 900;
      color: #1a237e; margin: 0 0 12px;
      line-height: 1.3;
    }
    .sponsor-highlight { color: #f9a825; }
    .sponsor-desc {
      font-size: 0.95rem; color: #555;
      line-height: 1.7; margin: 0 0 28px;
    }
    .sponsor-btn {
      display: inline-flex; align-items: center; gap: 10px;
      background: #1877f2; color: white; text-decoration: none;
      padding: 14px 28px; border-radius: 50px;
      font-size: 1rem; font-weight: 700;
      box-shadow: 0 4px 14px rgba(24,119,242,0.35);
      transition: all 0.2s;
    }
    .sponsor-btn:hover {
      background: #1565c0;
      box-shadow: 0 6px 20px rgba(24,119,242,0.45);
      transform: translateY(-2px);
    }
    .sponsor-fb-icon { width: 20px; height: 20px; flex-shrink: 0; }
    @media (min-width: 600px) { .sponsor-title { font-size: 1.8rem; } }

    /* ── Spin + Prizes stack ─────────────────────────────────────── */
    .spin-prizes-stack { display: flex; flex-direction: column; gap: 0; }
    @media (max-width: 639px) {
      .prizes-section { order: 1; }
      .spin-section   { order: 2; }
    }

    /* ── Lucky Spin section (mobile only) ───────────────────────── */
    @media (min-width: 640px) { .spin-section { display: none; } }
    .spin-section {
      background: linear-gradient(160deg,#0d1b4b 0%,#1a237e 60%,#283593 100%);
      border-radius: 24px; padding: 40px 20px 48px;
      margin: 16px 0;
    }
    .spin-head { text-align: center; margin-bottom: 32px; }
    .spin-title { font-size: 1.8rem; font-weight: 900; color: white; margin: 0 0 8px; letter-spacing: -0.02em; }
    .spin-sub { font-size: 0.88rem; color: rgba(255,255,255,0.50); margin: 0; }

    .spin-layout {
      display: flex; flex-direction: column; align-items: center; gap: 28px;
      max-width: 640px; margin: 0 auto;
    }

    /* Mobile slot chassis */
    .mslot-chassis {
      background: #020813;
      border-radius: 20px; padding: 6px;
      box-shadow:
        0 0 0 2px rgba(249,168,37,0.7),
        0 0 40px rgba(249,168,37,0.35),
        0 0 80px rgba(249,168,37,0.12),
        inset 0 0 24px rgba(0,0,0,0.8);
      width: 100%; max-width: 360px;
      animation: chassis-pulse 2.5s ease-in-out infinite;
    }
    .mslot-screen {
      position: relative;
      height: 340px; /* 5 × 68px */
      overflow: hidden; border-radius: 14px;
      background: linear-gradient(180deg, #060e1f 0%, #0a1628 50%, #060e1f 100%);
      &::after {
        content: ''; position: absolute; inset: 0; z-index: 5; pointer-events: none;
        background: repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px);
      }
    }
    .mslot-screen::before {
      content: ''; position: absolute; left: 0; right: 0; z-index: 3;
      top: 136px; height: 68px;
      background: linear-gradient(180deg,
        rgba(249,168,37,0.0) 0%,
        rgba(249,168,37,0.12) 20%,
        rgba(249,168,37,0.18) 50%,
        rgba(249,168,37,0.12) 80%,
        rgba(249,168,37,0.0) 100%
      );
      border-top: 1.5px solid rgba(249,168,37,0.9);
      border-bottom: 1.5px solid rgba(249,168,37,0.9);
      box-shadow: 0 -1px 12px rgba(249,168,37,0.5), 0 1px 12px rgba(249,168,37,0.5);
    }
    .mslot-center-glow {
      position: absolute; left: 0; right: 0; top: 136px; height: 68px;
      background: radial-gradient(ellipse at center, rgba(249,168,37,0.15) 0%, transparent 70%);
      z-index: 1; pointer-events: none;
      animation: center-pulse 1.8s ease-in-out infinite;
    }
    .mslot-reel {
      position: absolute; top: 0; left: 0; right: 0;
      will-change: transform; z-index: 2;
    }
    .mslot-item {
      height: 68px; display: flex; align-items: center; gap: 12px;
      padding: 0 20px;
      font-size: 0.95rem; font-weight: 600; color: rgba(255,255,255,0.5);
      border-left: 3px solid var(--team-color, transparent);
      box-shadow: inset 3px 0 16px -8px var(--team-color, transparent);
      border-bottom: 1px solid rgba(255,255,255,0.04);
      letter-spacing: 0.02em;
    }
    .mslot-flag { flex-shrink: 0; border-radius: 2px; box-shadow: 0 1px 4px rgba(0,0,0,0.5); object-fit: cover; }
    .mslot-name { flex: 1; }
    .mslot-vignette {
      position: absolute; inset: 0; z-index: 4; pointer-events: none;
      background: linear-gradient(to bottom,
        rgba(6,14,31,0.97) 0%, rgba(6,14,31,0.5) 18%,
        transparent 30%, transparent 70%,
        rgba(6,14,31,0.5) 82%, rgba(6,14,31,0.97) 100%
      );
    }

    /* Right panel */
    .spin-right {
      display: flex; flex-direction: column; align-items: center; gap: 20px;
      text-align: center; width: 100%; max-width: 360px;
    }

    .spin-btn {
      display: inline-flex; align-items: center; gap: 10px;
      padding: 15px 40px; border: none; border-radius: 50px; cursor: pointer;
      font-size: 1rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
      background: linear-gradient(135deg,#f9a825,#e65100); color: white;
      box-shadow: 0 4px 20px rgba(249,168,37,0.45); transition: all 0.18s; white-space: nowrap;
    }
    .spin-btn:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 8px 28px rgba(249,168,37,0.60); }
    .spin-btn:disabled { cursor: not-allowed; transform: none; }
    .spin-btn span { font-size: 1.2rem; }
    .spin-btn.spinning {
      background: linear-gradient(135deg,#e65100,#f9a825,#e65100); background-size: 200% 100%;
      animation: btn-shimmer 1.4s linear infinite, btn-glow 1.2s ease-in-out infinite;
    }
    .spin-btn .spin-ring { width: 18px; height: 18px; animation: ring-spin 0.8s linear infinite; flex-shrink: 0; }

    .spin-hint {
      display: flex; flex-direction: column; align-items: center; gap: 10px;
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09);
      border-radius: 16px; padding: 18px 20px;
    }
    .spin-hint-icon { font-size: 1.8rem; }
    .spin-hint p { margin: 0; font-size: 0.86rem; color: rgba(255,255,255,0.58); line-height: 1.6; }
    .spin-hint strong { color: #f9a825; }

    @keyframes resultPop {
      from { opacity: 0; transform: scale(0.88) translateY(16px); }
      to   { opacity: 1; transform: scale(1)    translateY(0); }
    }
    @keyframes crownBounce {
      0%   { transform: scale(0) rotate(-20deg); }
      70%  { transform: scale(1.2) rotate(5deg); }
      100% { transform: scale(1) rotate(0); }
    }
    .spin-result {
      display: flex; flex-direction: column; align-items: center; gap: 10px;
      background: rgba(249,168,37,0.10); border: 1px solid rgba(249,168,37,0.35);
      border-radius: 20px; padding: 22px 28px; width: 100%;
      animation: resultPop 0.45s cubic-bezier(0.22,1,0.36,1) both;
    }
    .spin-result-crown { font-size: 2.2rem; animation: crownBounce 0.6s 0.2s cubic-bezier(0.22,1,0.36,1) both; }
    .spin-result-name { font-size: 1.5rem; font-weight: 900; color: white; letter-spacing: -0.01em; }
    .spin-result-msg { font-size: 0.80rem; color: rgba(255,255,255,0.50); }
    .spin-go-btn {
      margin-top: 4px; padding: 10px 22px; border: none; border-radius: 26px; cursor: pointer;
      font-size: 0.85rem; font-weight: 700;
      background: linear-gradient(135deg,#f9a825,#e65100); color: white;
      box-shadow: 0 3px 12px rgba(249,168,37,0.40); transition: all 0.18s; white-space: nowrap;
    }
    .spin-go-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(249,168,37,0.55); }

    /* ── Responsive ──────────────────────────────────────────────── */
    @media (max-width: 639px) {
      .hero { display: none; }
    }
    @media (min-width: 640px) {
      .hero { padding: 48px 36px 52px; gap: 28px; min-height: 420px; }
      .hero-title { font-size: 2.8rem; }
    }
    @media (min-width: 900px) {
      .hero { padding: 52px 48px 56px; gap: 40px; }
      .hero-title { font-size: 3.4rem; }
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
export class HomeComponent implements OnInit, OnDestroy, AfterViewInit {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  @ViewChild('slotReelHero')   slotReelHeroRef!:   ElementRef<HTMLDivElement>;
  @ViewChild('slotReelMobile') slotReelMobileRef!:  ElementRef<HTMLDivElement>;

  // Reel: 80 repetitions of 32 teams = 2560 items; start at index 1280 (middle)
  readonly reelItems = Array.from({ length: 80 }, () => WHEEL_TEAMS).flat();
  private readonly ITEM_H      = 68;  // mobile row height
  private readonly HERO_ITEM_H = 88;  // desktop row height
  private readonly NUM_TEAMS   = WHEEL_TEAMS.length;
  private currentCenterIdx    = 40 * WHEEL_TEAMS.length; // 1280

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

  // ── Spinner state ───────────────────────────────────────────────
  isSpinning = false;
  spinWinner: { name: string; color: string } | null = null;
  private rafId: number | null = null;

  // ── Clock state ─────────────────────────────────────────────────
  time  = signal<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0, locked: false });
  tick  = signal(false);
  private sub?: Subscription;

  goToBracket(prize: PrizeTier): void {
    this.router.navigate(['/bracket'], { queryParams: { tier: prize.title } });
  }

  pad(n: number): string { return n.toString().padStart(2, '0'); }

  // ── Lifecycle ───────────────────────────────────────────────────
  ngOnInit(): void {
    this.seo.set({
      title: 'Predict The Champion | FIFA World Cup 2026 Bracket Game',
      description: 'Fill your bracket, earn points for every correct pick, and top the leaderboard to claim your prize.',
      url: '/home',
    });
    this.tickClock();
    this.sub = interval(1000).subscribe(() => {
      this.tick.set(true);
      setTimeout(() => this.tick.set(false), 180);
      this.tickClock();
    });
  }

  ngAfterViewInit(): void {
    this.applyReelPosition(this.currentCenterIdx);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
  }

  // ── Slot reel spin ───────────────────────────────────────────────
  spin(): void {
    if (this.isSpinning) return;
    this.isSpinning = true;
    this.spinWinner = null;

    // 75% favourite, 25% other
    const pool = Math.random() < 0.75 ? SPIN_FAVOURITES : SPIN_OTHERS;
    const winnerName = pool[Math.floor(Math.random() * pool.length)];
    const winnerIdx  = WHEEL_TEAMS.findIndex(t => t.name === winnerName);
    const minTarget  = this.currentCenterIdx + this.NUM_TEAMS * 6; // ≥6 full passes
    const remainder  = minTarget % this.NUM_TEAMS;
    const toAdd      = (winnerIdx - remainder + this.NUM_TEAMS) % this.NUM_TEAMS;
    const targetIdx  = minTarget + (toAdd === 0 ? this.NUM_TEAMS : toAdd);

    const h          = this.ITEM_H;
    const hh         = this.HERO_ITEM_H;
    const heroStart  = -(this.currentCenterIdx - 1) * hh;
    const heroEnd    = -(targetIdx - 1) * hh;
    const mobStart   = -(this.currentCenterIdx - 2) * h;
    const mobEnd     = -(targetIdx - 2) * h;
    const duration   = 4200 + Math.random() * 1600; // 4.2–5.8 s
    const startTime  = performance.now();

    const animate = (now: number) => {
      const elapsed  = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 5); // ease-out quint

      if (this.slotReelHeroRef?.nativeElement)
        this.slotReelHeroRef.nativeElement.style.transform =
          `translateY(${heroStart + (heroEnd - heroStart) * eased}px)`;
      if (this.slotReelMobileRef?.nativeElement)
        this.slotReelMobileRef.nativeElement.style.transform =
          `translateY(${mobStart + (mobEnd - mobStart) * eased}px)`;

      if (progress < 1) {
        this.rafId = requestAnimationFrame(animate);
      } else {
        this.currentCenterIdx = targetIdx;
        this.isSpinning = false;
        this.spinWinner = WHEEL_TEAMS[winnerIdx];
      }
    };

    this.rafId = requestAnimationFrame(animate);
  }

  private applyReelPosition(centerIdx: number): void {
    if (this.slotReelHeroRef?.nativeElement)
      this.slotReelHeroRef.nativeElement.style.transform = `translateY(${-(centerIdx - 1) * this.HERO_ITEM_H}px)`;
    if (this.slotReelMobileRef?.nativeElement)
      this.slotReelMobileRef.nativeElement.style.transform = `translateY(${-(centerIdx - 2) * this.ITEM_H}px)`;
  }

  // ── Clock ───────────────────────────────────────────────────────
  private tickClock(): void {
    const diff = new Date(TOURNAMENT_START).getTime() - Date.now();
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
