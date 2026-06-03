import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-rules',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="rules-page">

      <!-- Header -->
      <div class="rp-header">
        <a class="rp-back" routerLink="/home">← Back</a>
        <div class="rp-eyebrow">📖 OFFICIAL RULES</div>
        <h1 class="rp-title">How to Play</h1>
        <p class="rp-sub">Pick your tier, fill your bracket, and earn points for every correct prediction.</p>
      </div>

      <!-- Tier cards -->
      <div class="tier-grid">

        <!-- Bronze -->
        <div class="tier-card tier-bronze">
          <div class="tc-medal">🥉</div>
          <div class="tc-name">Bronze</div>
          <div class="tc-tagline">Winner picks only</div>
          <div class="tc-section-label">WHAT YOU PREDICT</div>
          <ul class="tc-list">
            <li>✅ Group stage 1st &amp; 2nd place</li>
            <li>✅ Best 3rd place qualifiers</li>
            <li>✅ Knockout match winner</li>
          </ul>
          <div class="tc-section-label">POINTS PER CORRECT PICK</div>
          <div class="tc-points-grid">
            <div class="tc-pt-row"><span>Group 1st / 2nd</span><span class="tc-pts">5 pts each</span></div>
            <div class="tc-pt-row"><span>Best 3rd qualifier</span><span class="tc-pts">3 pts each</span></div>
            <div class="tc-pt-row"><span>Round of 32</span><span class="tc-pts">5 pts</span></div>
            <div class="tc-pt-row"><span>Round of 16</span><span class="tc-pts">10 pts</span></div>
            <div class="tc-pt-row"><span>Quarter-Final</span><span class="tc-pts">15 pts</span></div>
            <div class="tc-pt-row"><span>Semi-Final</span><span class="tc-pts">20 pts</span></div>
            <div class="tc-pt-row"><span>3rd Place match</span><span class="tc-pts">10 pts</span></div>
            <div class="tc-pt-row"><span>Final</span><span class="tc-pts">30 pts</span></div>
          </div>
        </div>

        <!-- Silver -->
        <div class="tier-card tier-silver">
          <div class="tc-medal">🥈</div>
          <div class="tc-name">Silver</div>
          <div class="tc-tagline">Winner + goal margin</div>
          <div class="tc-section-label">WHAT YOU PREDICT</div>
          <ul class="tc-list">
            <li>✅ Everything in Bronze</li>
            <li>✅ Goal margin for each knockout match (e.g. "win by 2")</li>
            <li>✅ If margin is 0 → pick the penalties winner</li>
          </ul>
          <div class="tc-section-label">POINTS PER CORRECT PICK</div>
          <div class="tc-points-grid">
            <div class="tc-pt-row"><span>All Bronze points apply</span><span class="tc-pts">—</span></div>
            <div class="tc-pt-row tc-bonus"><span>Correct goal margin</span><span class="tc-pts">+3 pts</span></div>
            <div class="tc-pt-row tc-bonus"><span>Penalty winner (margin 0)</span><span class="tc-pts">base only</span></div>
          </div>
          <div class="tc-note">💡 Penalty wins count as a 0-goal margin — pick the right team for base points.</div>
        </div>

        <!-- Gold -->
        <div class="tier-card tier-gold">
          <div class="tc-crown">⭐ TOP PRIZE</div>
          <div class="tc-medal">🥇</div>
          <div class="tc-name">Gold</div>
          <div class="tc-tagline">Exact scoreline</div>
          <div class="tc-section-label">WHAT YOU PREDICT</div>
          <ul class="tc-list">
            <li>✅ Everything in Bronze</li>
            <li>✅ Exact scoreline for each knockout match (e.g. 2–1)</li>
            <li>✅ If scores are equal (e.g. 1–1) → pick the penalties winner</li>
          </ul>
          <div class="tc-section-label">POINTS PER CORRECT PICK</div>
          <div class="tc-points-grid">
            <div class="tc-pt-row"><span>All Bronze points apply</span><span class="tc-pts">—</span></div>
            <div class="tc-pt-row tc-bonus"><span>Correct goal difference</span><span class="tc-pts">+3 pts</span></div>
            <div class="tc-pt-row tc-bonus"><span>Exact scoreline</span><span class="tc-pts">+5 pts</span></div>
            <div class="tc-pt-row tc-bonus"><span>Penalty winner (drawn score)</span><span class="tc-pts">base + bonuses</span></div>
          </div>
          <div class="tc-note">💡 A 1–1 prediction with the correct penalties winner earns base + goal diff bonus + exact score bonus.</div>
        </div>

      </div>

      <!-- Deadline rule -->
      <div class="deadline-block">
        <div class="db-icon">⏰</div>
        <div class="db-content">
          <div class="db-title">Submission Deadline — All Tiers</div>
          <div class="db-body">
            You must submit your bracket <strong>at least 1 hour before each match kicks off</strong>
            to earn points for that match. Picks submitted after the deadline score <strong>0 points</strong>
            for that specific match — but you can still update picks for future matches.
          </div>
        </div>
      </div>

      <!-- Quick comparison table -->
      <div class="compare-block">
        <div class="cb-title">Quick Comparison</div>
        <div class="compare-table-wrap">
          <table class="compare-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>🥉 Bronze</th>
                <th>🥈 Silver</th>
                <th>🥇 Gold</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Pick winner</td><td class="yes">✅</td><td class="yes">✅</td><td class="yes">✅</td></tr>
              <tr><td>Group stage picks</td><td class="yes">✅</td><td class="yes">✅</td><td class="yes">✅</td></tr>
              <tr><td>Best 3rd picks</td><td class="yes">✅</td><td class="yes">✅</td><td class="yes">✅</td></tr>
              <tr><td>Goal margin</td><td class="no">❌</td><td class="yes">✅ +3pts</td><td class="yes">✅ +3pts</td></tr>
              <tr><td>Exact scoreline</td><td class="no">❌</td><td class="no">❌</td><td class="yes">✅ +5pts</td></tr>
              <tr><td>Penalty picks</td><td class="no">❌</td><td class="yes">✅</td><td class="yes">✅</td></tr>
              <tr><td>Max pts (Final)</td><td>30</td><td>33</td><td>38</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- CTA -->
      <div class="rp-cta">
        <a class="cta-primary" routerLink="/bracket">Fill My Bracket →</a>
        <a class="cta-secondary" routerLink="/home">Back to Home</a>
      </div>

    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: calc(100vh - 56px);
      background: linear-gradient(160deg, #0a1228 0%, #0f1f55 50%, #1a237e 100%);
      /* bleed out of page-content padding */
      margin: -16px -12px -32px;
      padding: 0 12px 60px;
    }
    @media (min-width: 520px)  { :host { margin: -16px -20px -32px; padding: 0 20px 60px; } }
    @media (min-width: 768px)  { :host { margin: -24px -32px -40px; padding: 0 32px 60px; } }

    .rules-page {
      max-width: 960px; margin: 0 auto; padding: 0 0 60px;
    }

    /* ── Header ──────────────────────────────────────────────────── */
    .rp-header {
      text-align: center; padding: 40px 20px 32px;
      position: relative;
    }
    .rp-back {
      position: absolute; left: 0; top: 44px;
      font-size: 0.85rem; font-weight: 600; color: rgba(255,255,255,0.55);
      text-decoration: none; transition: color 0.15s;
    }
    .rp-back:hover { color: white; }
    .rp-eyebrow {
      font-size: 0.68rem; font-weight: 700; letter-spacing: 0.18em;
      text-transform: uppercase; color: #f9a825; margin-bottom: 10px;
    }
    .rp-title {
      font-size: 2.4rem; font-weight: 900; color: white;
      margin: 0 0 12px; letter-spacing: -0.02em;
    }
    .rp-sub {
      font-size: 1rem; color: rgba(255,255,255,0.62); margin: 0;
    }

    /* ── Tier cards ──────────────────────────────────────────────── */
    .tier-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px; padding: 0 16px; margin-bottom: 24px;
    }
    @media (max-width: 700px) {
      .tier-grid { grid-template-columns: 1fr; }
    }

    .tier-card {
      border-radius: 18px; padding: 24px 20px;
      display: flex; flex-direction: column; gap: 10px;
      position: relative; overflow: hidden;
    }
    .tier-bronze {
      background: rgba(191,120,50,0.10);
      border: 1px solid rgba(191,120,50,0.25);
    }
    .tier-silver {
      background: rgba(120,144,156,0.12);
      border: 1px solid rgba(176,190,197,0.25);
    }
    .tier-gold {
      background: rgba(249,168,37,0.08);
      border: 1px solid rgba(249,168,37,0.35);
      box-shadow: 0 0 40px rgba(249,168,37,0.10);
    }
    .tc-crown {
      position: absolute; top: 14px; right: 14px;
      font-size: 0.6rem; font-weight: 800; letter-spacing: 0.08em;
      background: linear-gradient(135deg,#f9a825,#e65100);
      color: white; padding: 3px 8px; border-radius: 20px;
    }
    .tc-medal { font-size: 2.2rem; line-height: 1; }
    .tc-name {
      font-size: 1.4rem; font-weight: 900; color: white; margin: 0;
    }
    .tc-tagline {
      font-size: 0.8rem; font-weight: 600;
      color: rgba(255,255,255,0.5); margin-bottom: 4px;
    }
    .tc-section-label {
      font-size: 0.58rem; font-weight: 800; letter-spacing: 0.14em;
      text-transform: uppercase; color: rgba(255,255,255,0.35);
      margin-top: 6px;
    }
    .tc-list {
      list-style: none; margin: 0; padding: 0;
      display: flex; flex-direction: column; gap: 5px;
    }
    .tc-list li {
      font-size: 0.82rem; color: rgba(255,255,255,0.75);
    }
    .tc-points-grid {
      display: flex; flex-direction: column; gap: 4px;
    }
    .tc-pt-row {
      display: flex; justify-content: space-between; align-items: center;
      font-size: 0.78rem; color: rgba(255,255,255,0.65);
      padding: 3px 0; border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .tc-pt-row:last-child { border-bottom: none; }
    .tc-pts { font-weight: 700; color: white; white-space: nowrap; }
    .tc-bonus .tc-pts { color: #f9a825; }
    .tc-note {
      font-size: 0.72rem; color: rgba(255,255,255,0.45);
      background: rgba(255,255,255,0.04); border-radius: 8px;
      padding: 8px 10px; line-height: 1.5; margin-top: 4px;
    }

    /* ── Deadline block ──────────────────────────────────────────── */
    .deadline-block {
      display: flex; gap: 16px; align-items: flex-start;
      background: rgba(183,28,28,0.10);
      border: 1px solid rgba(183,28,28,0.28);
      border-radius: 16px; padding: 20px 24px;
      margin: 0 16px 24px;
    }
    .db-icon { font-size: 1.8rem; flex-shrink: 0; }
    .db-title {
      font-size: 0.95rem; font-weight: 800; color: white; margin-bottom: 6px;
    }
    .db-body {
      font-size: 0.85rem; color: rgba(255,255,255,0.65); line-height: 1.6;
    }
    .db-body strong { color: white; }

    /* ── Comparison table ────────────────────────────────────────── */
    .compare-block {
      margin: 0 16px 28px; background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08); border-radius: 16px;
      overflow: hidden;
    }
    .cb-title {
      font-size: 0.7rem; font-weight: 800; letter-spacing: 0.14em;
      text-transform: uppercase; color: rgba(255,255,255,0.4);
      padding: 14px 20px 10px;
    }
    .compare-table-wrap { overflow-x: auto; }
    .compare-table {
      width: 100%; border-collapse: collapse;
      font-size: 0.84rem;
    }
    .compare-table th {
      padding: 10px 16px; text-align: center; font-weight: 700;
      color: rgba(255,255,255,0.55); font-size: 0.78rem;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .compare-table th:first-child { text-align: left; }
    .compare-table td {
      padding: 9px 16px; text-align: center;
      color: rgba(255,255,255,0.65);
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .compare-table td:first-child { text-align: left; }
    .compare-table tr:last-child td { border-bottom: none; }
    .compare-table .yes { color: #66bb6a; font-weight: 600; }
    .compare-table .no  { color: rgba(255,255,255,0.25); }

    /* ── CTA ─────────────────────────────────────────────────────── */
    .rp-cta {
      display: flex; gap: 12px; justify-content: center;
      flex-wrap: wrap; padding: 0 16px;
    }
    .cta-primary {
      display: inline-flex; align-items: center;
      padding: 13px 28px; border-radius: 50px;
      background: linear-gradient(135deg,#f9a825,#e65100);
      color: white; font-weight: 800; font-size: 0.95rem;
      text-decoration: none; box-shadow: 0 4px 16px rgba(249,168,37,0.4);
      transition: all 0.18s;
    }
    .cta-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(249,168,37,0.55); }
    .cta-secondary {
      display: inline-flex; align-items: center;
      padding: 13px 28px; border-radius: 50px;
      border: 1.5px solid rgba(255,255,255,0.22);
      color: rgba(255,255,255,0.78); font-weight: 700; font-size: 0.95rem;
      text-decoration: none; transition: all 0.18s;
    }
    .cta-secondary:hover { border-color: rgba(255,255,255,0.5); color: white; background: rgba(255,255,255,0.06); }
  `],
})
export class RulesComponent implements OnInit {
  private readonly seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.set({
      title: 'How to Play | Predict The Champion',
      description: 'Learn how to fill your bracket, earn points, and compete to win prizes in the FIFA World Cup 2026 prediction game.',
      url: '/rules',
    });
  }
}
