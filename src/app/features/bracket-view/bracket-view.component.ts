import { Component, inject, OnInit, signal, ElementRef, ViewChild } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { BracketService } from '../../core/services/bracket.service';
import { TournamentService } from '../../core/services/tournament.service';
import { Team } from '../../core/models/tournament.models';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { forkJoin } from 'rxjs';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

interface MatchNode {
  slot: number;
  home: Team | null;
  away: Team | null;
  winner: Team | null;
  homeScore: number | null;
  awayScore: number | null;
}

// Left side: R32→R16→QF→SF (outer to inner)
const L_R32_GROUPS: [number, number][] = [[1,2],[3,4],[5,6],[7,8]];
const L_R16_GROUPS: [number, number][] = [[17,18],[19,20]];
const L_QF_GROUPS:  [number, number][] = [[25,26]];
const L_SF = 29;

// Right side: SF→QF→R16→R32 (inner to outer, matches left half mirrored)
const R_SF = 30;
const R_QF_GROUPS:  [number, number][] = [[27,28]];
const R_R16_GROUPS: [number, number][] = [[21,22],[23,24]];
const R_R32_GROUPS: [number, number][] = [[9,10],[11,12],[13,14],[15,16]];

const FINAL = 32;
const THIRD = 31;

@Component({
  selector: 'app-bracket-view',
  standalone: true,
  imports: [MatProgressBarModule, NgTemplateOutlet],
  template: `
    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    } @else {
      <div class="bv-page">

        <!-- Header -->
        <div class="bv-header">
          <div class="bv-header-left">
            @if (!isSharedView()) {
              <button class="bv-edit-btn" (click)="goEdit()">← Edit Bracket</button>
            }
            <span class="bv-tier">{{ bracketService.tier() }}</span>
            @if (bracketService.champion) {
              <span class="bv-champ-label">
                <img [src]="bracketService.champion.flagUrl" class="bv-flag">
                {{ bracketService.champion.name }}
                👑
              </span>
            }
          </div>
          <div class="bv-actions">
            <button class="bv-action-btn" (click)="copyShareLink()" [class.copied]="linkCopied()">
              {{ linkCopied() ? '✓ Copied!' : '🔗 Share' }}
            </button>
            <button class="bv-action-btn" (click)="downloadImage()" [disabled]="exporting()">
              {{ exporting() === 'img' ? '⏳ Exporting…' : '🖼 Download Image' }}
            </button>
            <button class="bv-action-btn" (click)="downloadPdf()" [disabled]="exporting()">
              {{ exporting() === 'pdf' ? '⏳ Exporting…' : '📄 Download PDF' }}
            </button>
          </div>
        </div>

        <!-- Bracket -->
        <div class="bracket-scroll">
          <div class="bracket-wrap" #bracketEl>

            <!-- LEFT half: R32 → R16 → QF → SF (left to right) -->
            <div class="half half-left">

              <!-- R32 -->
              <div class="round round-r32">
                @for (pair of L_R32_GROUPS; track $index) {
                  <div class="match-group">
                    <div class="match-cell top">
                      <ng-container *ngTemplateOutlet="matchCard; context:{ n: getNode(pair[0]), side:'left' }" />
                    </div>
                    <div class="match-cell bottom">
                      <ng-container *ngTemplateOutlet="matchCard; context:{ n: getNode(pair[1]), side:'left' }" />
                    </div>
                  </div>
                }
              </div>

              <!-- R16 -->
              <div class="round">
                @for (pair of L_R16_GROUPS; track $index) {
                  <div class="match-group">
                    <div class="match-cell top">
                      <ng-container *ngTemplateOutlet="matchCard; context:{ n: getNode(pair[0]), side:'left' }" />
                    </div>
                    <div class="match-cell bottom">
                      <ng-container *ngTemplateOutlet="matchCard; context:{ n: getNode(pair[1]), side:'left' }" />
                    </div>
                  </div>
                }
              </div>

              <!-- QF -->
              <div class="round">
                @for (pair of L_QF_GROUPS; track $index) {
                  <div class="match-group">
                    <div class="match-cell top">
                      <ng-container *ngTemplateOutlet="matchCard; context:{ n: getNode(pair[0]), side:'left' }" />
                    </div>
                    <div class="match-cell bottom">
                      <ng-container *ngTemplateOutlet="matchCard; context:{ n: getNode(pair[1]), side:'left' }" />
                    </div>
                  </div>
                }
              </div>

              <!-- SF -->
              <div class="round round-sf">
                <div class="match-cell sf-cell">
                  <ng-container *ngTemplateOutlet="matchCard; context:{ n: getNode(L_SF), side:'left' }" />
                </div>
              </div>

            </div>

            <!-- CENTER -->
            <div class="bracket-center">
              <div class="center-final">
                <div class="center-label">🏆 FINAL</div>
                <ng-container *ngTemplateOutlet="matchCard; context:{ n: getNode(FINAL), side:'center' }" />
              </div>

              @if (bracketService.champion) {
                <div class="center-champion">
                  <div class="champ-crown">👑</div>
                  <img [src]="bracketService.champion.flagUrl" class="champ-flag">
                  <div class="champ-name">{{ bracketService.champion.name }}</div>
                  <div class="champ-sub">World Cup Champion</div>
                </div>
              } @else {
                <div class="center-champion center-tbd">
                  <div class="champ-crown">🏆</div>
                  <div class="champ-name">TBD</div>
                </div>
              }

              <div class="center-third">
                <div class="center-label">🥉 3RD PLACE</div>
                <ng-container *ngTemplateOutlet="matchCard; context:{ n: getNode(THIRD), side:'center' }" />
              </div>
            </div>

            <!-- RIGHT half: SF → QF → R16 → R32 (left to right, mirrored) -->
            <div class="half half-right">

              <!-- SF -->
              <div class="round round-sf">
                <div class="match-cell sf-cell">
                  <ng-container *ngTemplateOutlet="matchCard; context:{ n: getNode(R_SF), side:'right' }" />
                </div>
              </div>

              <!-- QF -->
              <div class="round">
                @for (pair of R_QF_GROUPS; track $index) {
                  <div class="match-group right-group">
                    <div class="match-cell top">
                      <ng-container *ngTemplateOutlet="matchCard; context:{ n: getNode(pair[0]), side:'right' }" />
                    </div>
                    <div class="match-cell bottom">
                      <ng-container *ngTemplateOutlet="matchCard; context:{ n: getNode(pair[1]), side:'right' }" />
                    </div>
                  </div>
                }
              </div>

              <!-- R16 -->
              <div class="round">
                @for (pair of R_R16_GROUPS; track $index) {
                  <div class="match-group right-group">
                    <div class="match-cell top">
                      <ng-container *ngTemplateOutlet="matchCard; context:{ n: getNode(pair[0]), side:'right' }" />
                    </div>
                    <div class="match-cell bottom">
                      <ng-container *ngTemplateOutlet="matchCard; context:{ n: getNode(pair[1]), side:'right' }" />
                    </div>
                  </div>
                }
              </div>

              <!-- R32 -->
              <div class="round round-r32">
                @for (pair of R_R32_GROUPS; track $index) {
                  <div class="match-group right-group">
                    <div class="match-cell top">
                      <ng-container *ngTemplateOutlet="matchCard; context:{ n: getNode(pair[0]), side:'right' }" />
                    </div>
                    <div class="match-cell bottom">
                      <ng-container *ngTemplateOutlet="matchCard; context:{ n: getNode(pair[1]), side:'right' }" />
                    </div>
                  </div>
                }
              </div>

            </div>
          </div>
        </div>

      </div>
    }

    <!-- Match card template -->
    <ng-template #matchCard let-n="n" let-side="side">
      <div class="match-card" [class.mc-winner-set]="n.winner">
        <div class="mc-team" [class.mc-win]="n.winner?.id === n.home?.id" [class.mc-lose]="n.winner && n.winner?.id !== n.home?.id">
          @if (n.home) {
            <img [src]="n.home.flagUrl" class="mc-flag" [alt]="n.home.fifaCode">
            <span class="mc-code">{{ n.home.fifaCode }}</span>
            @if (bracketService.tier() !== 'Bronze' && n.homeScore !== null) {
              <span class="mc-score">{{ n.homeScore }}</span>
            }
          } @else {
            <span class="mc-tbd">TBD</span>
          }
        </div>
        <div class="mc-divider"></div>
        <div class="mc-team" [class.mc-win]="n.winner?.id === n.away?.id" [class.mc-lose]="n.winner && n.winner?.id !== n.away?.id">
          @if (n.away) {
            <img [src]="n.away.flagUrl" class="mc-flag" [alt]="n.away.fifaCode">
            <span class="mc-code">{{ n.away.fifaCode }}</span>
            @if (bracketService.tier() !== 'Bronze' && n.awayScore !== null) {
              <span class="mc-score">{{ n.awayScore }}</span>
            }
          } @else {
            <span class="mc-tbd">TBD</span>
          }
        </div>
      </div>
    </ng-template>
  `,
  styles: [`
    :host { display: block; background: #f4f6fb; min-height: 100vh; }

    /* ── Header ─────────────────────────────────────────────────── */
    .bv-page { padding: 16px 20px; }
    .bv-header {
      display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 10px; margin-bottom: 16px;
    }
    .bv-header-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .bv-edit-btn {
      padding: 6px 16px; border-radius: 20px; border: 2px solid #1a237e;
      background: white; color: #1a237e; font-weight: 700; font-size: 0.8rem; cursor: pointer;
    }
    .bv-edit-btn:hover { background: #e8eaf6; }
    .bv-tier {
      padding: 3px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700;
      background: linear-gradient(135deg,#e8eaf6,#c5cae9); color: #1a237e; border: 1.5px solid #1a237e;
    }
    .bv-champ-label {
      display: flex; align-items: center; gap: 6px;
      font-size: 0.82rem; font-weight: 700; color: #1a237e;
    }
    .bv-flag { width: 18px; height: 13px; object-fit: cover; border-radius: 2px; }
    .bv-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .bv-action-btn {
      padding: 6px 14px; border-radius: 20px; border: 1.5px solid #c5cae9;
      background: white; color: #1a237e; font-size: 0.78rem; font-weight: 600; cursor: pointer;
      transition: all 0.15s;
    }
    .bv-action-btn:hover:not(:disabled) { background: #e8eaf6; border-color: #1a237e; }
    .bv-action-btn:disabled { opacity: 0.5; cursor: default; }
    .bv-action-btn.copied { background: #e8f5e9; border-color: #2e7d32; color: #2e7d32; }

    /* ── Scroll wrapper ──────────────────────────────────────────── */
    .bracket-scroll { overflow-x: auto; padding-bottom: 16px; }

    /* ── Main bracket layout ─────────────────────────────────────── */
    .bracket-wrap {
      display: flex;
      align-items: stretch;
      min-width: 1100px;
      background: white;
      border-radius: 12px;
      padding: 24px 8px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.07);
    }

    /* ── Half (left / right) ─────────────────────────────────────── */
    .half {
      display: flex;
      flex: 1;
      align-items: stretch;
    }
    .half-left  { flex-direction: row; }
    .half-right { flex-direction: row; } /* SF closest to center, R32 outermost */

    /* ── Round column ────────────────────────────────────────────── */
    .round {
      display: flex;
      flex-direction: column;
      flex: 1;
      position: relative;
    }

    /* ── Match group (pair of matches that feed into one next-round match) ── */
    .match-group {
      display: flex;
      flex-direction: column;
      flex: 1;
      position: relative;
    }

    /* ── Match cell ──────────────────────────────────────────────── */
    .match-cell {
      flex: 1;
      display: flex;
      align-items: center;
      padding: 4px 6px;
      position: relative;
    }

    /* ─── LEFT SIDE connectors ───────────────────────────────────── */

    /* Horizontal line extending RIGHT from each match (towards next round) */
    .half-left .match-cell::after {
      content: '';
      position: absolute;
      right: -1px;
      top: 50%;
      width: 7px;
      height: 2px;
      background: #c5cae9;
    }

    /* Vertical bar connecting top and bottom match in a group */
    .half-left .match-group::after {
      content: '';
      position: absolute;
      right: -1px;
      top: 25%;
      height: 50%;
      width: 2px;
      background: #c5cae9;
    }

    /* Horizontal line from group midpoint to next round's match */
    .half-left .match-group::before {
      content: '';
      position: absolute;
      right: -7px;
      top: 50%;
      width: 7px;
      height: 2px;
      background: #c5cae9;
    }

    /* SF cells on left don't need right connector (final is in center) */
    .half-left .sf-cell::after { display: none; }

    /* ─── RIGHT SIDE connectors (mirror of left) ─────────────────── */

    /* Horizontal line extending LEFT from each match */
    .half-right .match-cell::after {
      content: '';
      position: absolute;
      left: -1px;
      top: 50%;
      width: 7px;
      height: 2px;
      background: #c5cae9;
    }

    /* Vertical bar */
    .half-right .match-group::after {
      content: '';
      position: absolute;
      left: -1px;
      top: 25%;
      height: 50%;
      width: 2px;
      background: #c5cae9;
    }

    /* Horizontal line from group midpoint leftward */
    .half-right .match-group::before {
      content: '';
      position: absolute;
      left: -7px;
      top: 50%;
      width: 7px;
      height: 2px;
      background: #c5cae9;
    }

    /* SF cells on right don't need left connector */
    .half-right .sf-cell::after { display: none; }

    /* ─── SF cells span full height (no pairing needed) ─────────── */
    .round-sf {
      display: flex;
      flex-direction: column;
    }
    .sf-cell {
      flex: 1;
      display: flex;
      align-items: center;
      padding: 4px 6px;
    }

    /* ── Center ──────────────────────────────────────────────────── */
    .bracket-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      min-width: 150px;
      padding: 0 12px;
    }
    .center-label {
      font-size: 0.6rem; font-weight: 800; color: #1a237e;
      text-transform: uppercase; letter-spacing: 1px;
      text-align: center; margin-bottom: 4px;
    }
    .center-champion {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      background: linear-gradient(135deg, #fff8e1, #ffe082);
      border: 2px solid #f9a825; border-radius: 12px;
      padding: 12px 16px; min-width: 120px; text-align: center;
    }
    .center-tbd { background: #f5f5f5; border-color: #ddd; }
    .champ-crown { font-size: 1.6rem; }
    .champ-flag  { width: 40px; height: 28px; object-fit: cover; border-radius: 3px; }
    .champ-name  { font-size: 0.85rem; font-weight: 800; color: #1a237e; }
    .champ-sub   { font-size: 0.6rem; color: #888; font-weight: 600; }
    .center-final, .center-third { width: 100%; }

    /* ── Match card ──────────────────────────────────────────────── */
    .match-card {
      width: 100%;
      background: white;
      border: 1.5px solid #e0e0e0;
      border-radius: 6px;
      overflow: hidden;
      min-width: 80px;
    }
    .match-card.mc-winner-set { border-color: #90caf9; }

    .mc-team {
      display: flex; align-items: center; gap: 4px;
      padding: 4px 6px; min-height: 24px;
    }
    .mc-team + .mc-team { border-top: 1px solid #f0f0f0; }
    .mc-win  { background: #e8eaf6; }
    .mc-lose { opacity: 0.45; }
    .mc-flag { width: 16px; height: 11px; object-fit: cover; border-radius: 1px; flex-shrink: 0; }
    .mc-code { font-size: 0.6rem; font-weight: 700; color: #1a237e; flex: 1; }
    .mc-score { font-size: 0.6rem; font-weight: 800; color: #1a237e; margin-left: auto; }
    .mc-tbd  { font-size: 0.58rem; color: #bbb; padding: 2px 0; }
    .mc-divider { height: 1px; background: #f0f0f0; }

    /* Center match card slightly larger */
    .bracket-center .match-card { min-width: 120px; }
    .bracket-center .mc-team { padding: 5px 8px; }
    .bracket-center .mc-code { font-size: 0.7rem; }
    .bracket-center .mc-flag { width: 20px; height: 14px; }
  `],
})
export class BracketViewComponent implements OnInit {
  readonly bracketService = inject(BracketService);
  private readonly tournamentService = inject(TournamentService);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);

  /** true when loaded via a public /share/:id URL (no auth, no edit button) */
  isSharedView = signal(false);

  @ViewChild('bracketEl') bracketEl!: ElementRef<HTMLDivElement>;

  loading   = signal(true);
  exporting = signal<'img' | 'pdf' | null>(null);
  linkCopied = signal(false);

  readonly L_R32_GROUPS = L_R32_GROUPS;
  readonly L_R16_GROUPS = L_R16_GROUPS;
  readonly L_QF_GROUPS  = L_QF_GROUPS;
  readonly L_SF  = L_SF;
  readonly R_SF  = R_SF;
  readonly R_QF_GROUPS  = R_QF_GROUPS;
  readonly R_R16_GROUPS = R_R16_GROUPS;
  readonly R_R32_GROUPS = R_R32_GROUPS;
  readonly FINAL = FINAL;
  readonly THIRD = THIRD;

  ngOnInit(): void {
    const shareId = this.route.snapshot.paramMap.get('id');
    if (shareId) this.isSharedView.set(true);

    forkJoin({
      groups: this.tournamentService.getGroups(),
      slots:  this.tournamentService.getKnockoutSlots(),
    }).subscribe({
      next: ({ groups, slots }) => {
        this.bracketService.loadTeams(groups);
        this.bracketService.initSlots(slots);
        const load$ = shareId
          ? this.bracketService.loadSharedBracket(Number(shareId))
          : this.bracketService.loadBracket();
        load$.subscribe({
          next:  () => this.loading.set(false),
          error: () => this.loading.set(false),
        });
      },
      error: () => this.loading.set(false),
    });
  }

  getNode(slot: number): MatchNode {
    const home   = this.bracketService.resolveTeamForSlot(slot, 'home');
    const away   = this.bracketService.resolveTeamForSlot(slot, 'away');
    const pick   = this.bracketService.knockoutPicks().find(p => p.slotNumber === slot);
    const winner = pick?.pickedTeamId ? this.bracketService.getTeam(pick.pickedTeamId) : null;
    return { slot, home, away, winner, homeScore: pick?.homeScore ?? null, awayScore: pick?.awayScore ?? null };
  }

  goEdit(): void { this.router.navigate(['/bracket']); }

  async copyShareLink(): Promise<void> {
    try {
      const bracketId = this.bracketService.bracketId();
      const url = bracketId
        ? `${window.location.origin}/share/bracket/${bracketId}`
        : window.location.href;
      await navigator.clipboard.writeText(url);
      this.linkCopied.set(true);
      setTimeout(() => this.linkCopied.set(false), 2500);
    } catch { /* ignore */ }
  }

  async downloadImage(): Promise<void> {
    if (this.exporting()) return;
    this.exporting.set('img');
    try {
      const dataUrl = await toPng(this.bracketEl.nativeElement, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = 'my-bracket.png';
      link.href = dataUrl;
      link.click();
    } catch (e) { console.error(e); }
    finally { this.exporting.set(null); }
  }

  async downloadPdf(): Promise<void> {
    if (this.exporting()) return;
    this.exporting.set('pdf');
    try {
      const dataUrl = await toPng(this.bracketEl.nativeElement, { cacheBust: true, pixelRatio: 2 });
      const img = new Image();
      img.src = dataUrl;
      await new Promise(r => { img.onload = r; });

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [img.width / 2, img.height / 2] });
      pdf.addImage(dataUrl, 'PNG', 0, 0, img.width / 2, img.height / 2);
      pdf.save('my-bracket.pdf');
    } catch (e) { console.error(e); }
    finally { this.exporting.set(null); }
  }
}
