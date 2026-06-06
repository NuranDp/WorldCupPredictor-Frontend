import { Component, inject, OnInit, signal, ElementRef, ViewChild, Input, computed } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { BracketService } from '../../core/services/bracket.service';
import { TournamentService } from '../../core/services/tournament.service';
import { SeoService } from '../../core/services/seo.service';
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

// Left side feeds SF1 (29): QF1(25) and QF3(27)
// QF1 ← R16-17([1,3]) + R16-18([2,5])
// QF3 ← R16-21([11,12]) + R16-22([9,10])
const L_R32_GROUPS: [number, number][] = [[1,3],[2,5],[11,12],[9,10]];
const L_R16_GROUPS: [number, number][] = [[17,18],[21,22]];
const L_QF_GROUPS:  [number, number][] = [[25,27]];
const L_SF = 29;

// Right side feeds SF2 (30): QF2(26) and QF4(28)
// QF2 ← R16-19([4,6]) + R16-20([7,8])
// QF4 ← R16-23([14,16]) + R16-24([13,15])
const R_SF = 30;
const R_QF_GROUPS:  [number, number][] = [[26,28]];
const R_R16_GROUPS: [number, number][] = [[19,20],[23,24]];
const R_R32_GROUPS: [number, number][] = [[4,6],[7,8],[14,16],[13,15]];

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

        <!-- Header (hidden when embedded) -->
        @if (!embedded) {
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
            <button class="bv-action-btn bv-story-btn" (click)="shareStory()" [disabled]="exporting()">
              {{ exporting() === 'story' ? '⏳ Generating…' : '📲 Share Story' }}
            </button>
            <button class="bv-action-btn" (click)="downloadImage()" [disabled]="exporting()">
              {{ exporting() === 'img' ? '⏳ Exporting…' : '🖼 Download Image' }}
            </button>
            <button class="bv-action-btn" (click)="downloadPdf()" [disabled]="exporting()">
              {{ exporting() === 'pdf' ? '⏳ Exporting…' : '📄 Download PDF' }}
            </button>
          </div>
        </div>
        }

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

    <!-- ── Story Preview Modal ───────────────────────────────────── -->
    @if (showStoryModal()) {
      <div class="story-modal-overlay" (click)="closeStoryModal()">
        <div class="story-modal" (click)="$event.stopPropagation()">
          <div class="story-modal-header">
            <span class="story-modal-title">📲 Story Preview</span>
            <button class="story-modal-close" (click)="closeStoryModal()">✕</button>
          </div>
          <div class="story-modal-preview">
            <!-- Live preview of the card (scaled down) -->
            <div class="story-card-preview">
              <div class="sc-bg"></div>
              <div class="sc-header">
                <span class="sc-logo">🏆 Predict The Champion</span>
                <span class="sc-subtitle">FIFA World Cup 2026</span>
              </div>
              <div class="sc-champion">
                <div class="sc-section-label">🥇 My Champion Pick</div>
                @if (bracketService.champion) {
                  <div class="sc-champ-card">
                    <img [src]="bracketService.champion.flagUrl" class="sc-champ-flag">
                    <span class="sc-champ-name">{{ bracketService.champion.name }}</span>
                    <span class="sc-crown">👑</span>
                  </div>
                } @else {
                  <div class="sc-champ-card sc-tbd">TBD</div>
                }
              </div>
              <div class="sc-section">
                <div class="sc-section-label">🏆 Final</div>
                <div class="sc-match">
                  <div class="sc-team">
                    @if (getNode(FINAL).home) {
                      <img [src]="getNode(FINAL).home!.flagUrl" class="sc-flag">
                      <span>{{ getNode(FINAL).home!.fifaCode }}</span>
                    } @else { <span class="sc-tbd-sm">TBD</span> }
                  </div>
                  <span class="sc-vs">vs</span>
                  <div class="sc-team">
                    @if (getNode(FINAL).away) {
                      <img [src]="getNode(FINAL).away!.flagUrl" class="sc-flag">
                      <span>{{ getNode(FINAL).away!.fifaCode }}</span>
                    } @else { <span class="sc-tbd-sm">TBD</span> }
                  </div>
                </div>
              </div>
              <div class="sc-section">
                <div class="sc-section-label">🎯 Semi Finals</div>
                <div class="sc-sf-row">
                  <div class="sc-match sc-match-sm">
                    <div class="sc-team">
                      @if (getNode(L_SF).home) { <img [src]="getNode(L_SF).home!.flagUrl" class="sc-flag"><span>{{ getNode(L_SF).home!.fifaCode }}</span> }
                      @else { <span class="sc-tbd-sm">TBD</span> }
                    </div>
                    <span class="sc-vs">vs</span>
                    <div class="sc-team">
                      @if (getNode(L_SF).away) { <img [src]="getNode(L_SF).away!.flagUrl" class="sc-flag"><span>{{ getNode(L_SF).away!.fifaCode }}</span> }
                      @else { <span class="sc-tbd-sm">TBD</span> }
                    </div>
                  </div>
                  <div class="sc-match sc-match-sm">
                    <div class="sc-team">
                      @if (getNode(R_SF).home) { <img [src]="getNode(R_SF).home!.flagUrl" class="sc-flag"><span>{{ getNode(R_SF).home!.fifaCode }}</span> }
                      @else { <span class="sc-tbd-sm">TBD</span> }
                    </div>
                    <span class="sc-vs">vs</span>
                    <div class="sc-team">
                      @if (getNode(R_SF).away) { <img [src]="getNode(R_SF).away!.flagUrl" class="sc-flag"><span>{{ getNode(R_SF).away!.fifaCode }}</span> }
                      @else { <span class="sc-tbd-sm">TBD</span> }
                    </div>
                  </div>
                </div>
              </div>
              <div class="sc-section">
                <div class="sc-section-label">⚡ Quarter Finals</div>
                <div class="sc-qf-grid">
                  @for (slot of [25, 26, 27, 28]; track slot) {
                    <div class="sc-match sc-match-sm">
                      <div class="sc-team">
                        @if (getNode(slot).home) { <img [src]="getNode(slot).home!.flagUrl" class="sc-flag"><span>{{ getNode(slot).home!.fifaCode }}</span> }
                        @else { <span class="sc-tbd-sm">TBD</span> }
                      </div>
                      <span class="sc-vs">vs</span>
                      <div class="sc-team">
                        @if (getNode(slot).away) { <img [src]="getNode(slot).away!.flagUrl" class="sc-flag"><span>{{ getNode(slot).away!.fifaCode }}</span> }
                        @else { <span class="sc-tbd-sm">TBD</span> }
                      </div>
                    </div>
                  }
                </div>
              </div>
              <div class="sc-url-bar">
                <span class="sc-url-icon">🔗</span>
                <span class="sc-url-text">predictthechampion.com</span>
              </div>
            </div>
          </div>
          <button class="story-download-btn" (click)="downloadStory()" [disabled]="exporting()">
            {{ exporting() === 'story' ? '⏳ Downloading…' : '⬇️ Download Story Image' }}
          </button>
        </div>
      </div>
    }

    <!-- ── Hidden Story Card (9:16) ─────────────────────────────── -->
    <div class="story-card" #storyCard>
      <!-- Background gradient -->
      <div class="sc-bg"></div>

      <!-- Header -->
      <div class="sc-header">
        <span class="sc-logo">🏆 Predict The Champion</span>
        <span class="sc-subtitle">FIFA World Cup 2026</span>
      </div>

      <!-- Champion -->
      <div class="sc-champion">
        <div class="sc-section-label">🥇 My Champion Pick</div>
        @if (bracketService.champion) {
          <div class="sc-champ-card">
            <img [src]="bracketService.champion.flagUrl" class="sc-champ-flag">
            <span class="sc-champ-name">{{ bracketService.champion.name }}</span>
            <span class="sc-crown">👑</span>
          </div>
        } @else {
          <div class="sc-champ-card sc-tbd">TBD</div>
        }
      </div>

      <!-- Final -->
      <div class="sc-section">
        <div class="sc-section-label">🏆 Final</div>
        <div class="sc-match">
          <div class="sc-team">
            @if (getNode(FINAL).home) {
              <img [src]="getNode(FINAL).home!.flagUrl" class="sc-flag">
              <span>{{ getNode(FINAL).home!.fifaCode }}</span>
            } @else { <span class="sc-tbd-sm">TBD</span> }
          </div>
          <span class="sc-vs">vs</span>
          <div class="sc-team">
            @if (getNode(FINAL).away) {
              <img [src]="getNode(FINAL).away!.flagUrl" class="sc-flag">
              <span>{{ getNode(FINAL).away!.fifaCode }}</span>
            } @else { <span class="sc-tbd-sm">TBD</span> }
          </div>
        </div>
      </div>

      <!-- Semi Finals -->
      <div class="sc-section">
        <div class="sc-section-label">🎯 Semi Finals</div>
        <div class="sc-sf-row">
          <div class="sc-match sc-match-sm">
            <div class="sc-team">
              @if (getNode(L_SF).home) {
                <img [src]="getNode(L_SF).home!.flagUrl" class="sc-flag">
                <span>{{ getNode(L_SF).home!.fifaCode }}</span>
              } @else { <span class="sc-tbd-sm">TBD</span> }
            </div>
            <span class="sc-vs">vs</span>
            <div class="sc-team">
              @if (getNode(L_SF).away) {
                <img [src]="getNode(L_SF).away!.flagUrl" class="sc-flag">
                <span>{{ getNode(L_SF).away!.fifaCode }}</span>
              } @else { <span class="sc-tbd-sm">TBD</span> }
            </div>
          </div>
          <div class="sc-match sc-match-sm">
            <div class="sc-team">
              @if (getNode(R_SF).home) {
                <img [src]="getNode(R_SF).home!.flagUrl" class="sc-flag">
                <span>{{ getNode(R_SF).home!.fifaCode }}</span>
              } @else { <span class="sc-tbd-sm">TBD</span> }
            </div>
            <span class="sc-vs">vs</span>
            <div class="sc-team">
              @if (getNode(R_SF).away) {
                <img [src]="getNode(R_SF).away!.flagUrl" class="sc-flag">
                <span>{{ getNode(R_SF).away!.fifaCode }}</span>
              } @else { <span class="sc-tbd-sm">TBD</span> }
            </div>
          </div>
        </div>
      </div>

      <!-- Quarter Finals -->
      <div class="sc-section">
        <div class="sc-section-label">⚡ Quarter Finals</div>
        <div class="sc-qf-grid">
          @for (slot of [25, 26, 27, 28]; track slot) {
            <div class="sc-match sc-match-sm">
              <div class="sc-team">
                @if (getNode(slot).home) {
                  <img [src]="getNode(slot).home!.flagUrl" class="sc-flag">
                  <span>{{ getNode(slot).home!.fifaCode }}</span>
                } @else { <span class="sc-tbd-sm">TBD</span> }
              </div>
              <span class="sc-vs">vs</span>
              <div class="sc-team">
                @if (getNode(slot).away) {
                  <img [src]="getNode(slot).away!.flagUrl" class="sc-flag">
                  <span>{{ getNode(slot).away!.fifaCode }}</span>
                } @else { <span class="sc-tbd-sm">TBD</span> }
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Tier + Footer -->
      <div class="sc-url-bar">
        <span class="sc-url-icon">🔗</span>
        <span class="sc-url-text">predictthechampion.com</span>
      </div>
    </div>

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
      display: flex; flex-direction: column;
      gap: 10px; margin-bottom: 16px;
    }
    @media (min-width: 600px) {
      .bv-header { flex-direction: row; align-items: center; justify-content: space-between; flex-wrap: wrap; }
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
    .bv-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      width: 100%;
    }
    @media (min-width: 600px) {
      .bv-actions { display: flex; flex-wrap: wrap; width: auto; }
    }
    .bv-action-btn {
      padding: 6px 14px; border-radius: 20px; border: 1.5px solid #c5cae9;
      background: white; color: #1a237e; font-size: 0.78rem; font-weight: 600; cursor: pointer;
      transition: all 0.15s;
    }
    .bv-action-btn:hover:not(:disabled) { background: #e8eaf6; border-color: #1a237e; }
    .bv-action-btn:disabled { opacity: 0.5; cursor: default; }
    .bv-action-btn.copied { background: #e8f5e9; border-color: #2e7d32; color: #2e7d32; }
    .bv-story-btn { background: linear-gradient(135deg, #e91e63, #9c27b0); color: white; border-color: transparent; }
    .bv-story-btn:hover:not(:disabled) { background: linear-gradient(135deg, #c2185b, #7b1fa2); border-color: transparent; }

    /* ── Story Preview Modal ────────────────────────────────────── */
    .story-modal-overlay {
      position: fixed; inset: 0; z-index: 1000;
      background: rgba(0,0,0,0.75); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      padding: 16px;
    }
    .story-modal {
      background: #1a1a2e; border-radius: 20px;
      padding: 20px; width: min(380px, 100%);
      display: flex; flex-direction: column; gap: 16px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.6);
      border: 1px solid rgba(255,255,255,0.08);
    }
    .story-modal-header {
      display: flex; align-items: center; justify-content: space-between;
    }
    .story-modal-title { font-size: 0.95rem; font-weight: 700; color: white; }
    .story-modal-close {
      width: 30px; height: 30px; border-radius: 50%;
      border: none; background: rgba(255,255,255,0.1); color: white;
      font-size: 0.8rem; cursor: pointer; transition: background 0.15s;
    }
    .story-modal-close:hover { background: rgba(255,255,255,0.2); }
    .story-modal-preview {
      display: flex; justify-content: center;
      overflow: hidden; border-radius: 12px;
    }
    /* Scale down the story card for preview */
    .story-card-preview {
      width: 405px; height: 720px;
      background: linear-gradient(160deg, #0d1b6e 0%, #1a237e 40%, #1b0a4e 100%);
      border-radius: 20px;
      display: flex; flex-direction: column;
      padding: 32px 28px 24px;
      box-sizing: border-box;
      gap: 18px;
      font-family: 'Segoe UI', sans-serif;
      overflow: hidden;
      transform: scale(0.82);
      transform-origin: top center;
      margin-bottom: calc((720px * 0.82 - 720px));
    }
    .story-download-btn {
      padding: 14px; border-radius: 12px; border: none;
      background: linear-gradient(135deg, #e91e63, #9c27b0);
      color: white; font-size: 0.95rem; font-weight: 700;
      cursor: pointer; transition: opacity 0.15s;
      width: 100%;
    }
    .story-download-btn:hover:not(:disabled) { opacity: 0.9; }
    .story-download-btn:disabled { opacity: 0.5; cursor: default; }

    /* ── Story Card ──────────────────────────────────────────────── */
    .story-card {
      position: fixed;
      left: -9999px; top: 0;
      visibility: hidden;
      width: 405px; height: 720px;
      background: linear-gradient(160deg, #0d1b6e 0%, #1a237e 40%, #1b0a4e 100%);
      border-radius: 20px;
      display: flex; flex-direction: column;
      padding: 32px 28px 24px;
      box-sizing: border-box;
      gap: 18px;
      font-family: 'Segoe UI', sans-serif;
      overflow: hidden;
    }
    .sc-bg {
      position: absolute; inset: 0;
      background: radial-gradient(ellipse at 20% 10%, rgba(255,255,255,0.07) 0%, transparent 60%),
                  radial-gradient(ellipse at 80% 90%, rgba(255,193,7,0.08) 0%, transparent 50%);
      pointer-events: none;
    }
    .sc-header {
      display: flex; flex-direction: column; align-items: center; gap: 2px;
    }
    .sc-logo {
      font-size: 1.2rem; font-weight: 800; color: #ffd700; letter-spacing: 0.02em;
    }
    .sc-subtitle {
      font-size: 0.72rem; color: rgba(255,255,255,0.55); letter-spacing: 0.12em; text-transform: uppercase;
    }
    .sc-champion {
      display: flex; flex-direction: column; align-items: center; gap: 10px;
    }
    .sc-section {
      display: flex; flex-direction: column; gap: 8px;
    }
    .sc-section-label {
      font-size: 0.68rem; font-weight: 700; color: rgba(255,255,255,0.5);
      text-transform: uppercase; letter-spacing: 0.1em; text-align: center;
    }
    .sc-champ-card {
      display: flex; align-items: center; gap: 12px;
      background: rgba(255,215,0,0.12); border: 1.5px solid rgba(255,215,0,0.35);
      border-radius: 14px; padding: 14px 24px;
      width: 100%; box-sizing: border-box; justify-content: center;
    }
    .sc-champ-flag { width: 48px; height: 34px; object-fit: cover; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.4); }
    .sc-champ-name { font-size: 1.3rem; font-weight: 800; color: #ffd700; }
    .sc-crown { font-size: 1.5rem; }
    .sc-match {
      display: flex; align-items: center; justify-content: center; gap: 10px;
      background: rgba(255,255,255,0.07); border-radius: 10px; padding: 10px 16px;
    }
    .sc-match-sm { padding: 8px 12px; flex: 1; }
    .sc-sf-row { display: flex; gap: 8px; }
    .sc-qf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .sc-team { display: flex; align-items: center; gap: 6px; color: white; font-size: 0.85rem; font-weight: 700; }
    .sc-flag { width: 24px; height: 17px; object-fit: cover; border-radius: 3px; }
    .sc-vs { font-size: 0.72rem; color: rgba(255,255,255,0.4); font-weight: 600; }
    .sc-tbd { color: rgba(255,255,255,0.4); font-size: 0.9rem; }
    .sc-tbd-sm { color: rgba(255,255,255,0.35); font-size: 0.75rem; }
    .sc-footer {
      margin-top: auto;
      display: flex; justify-content: center; align-items: center;
      border-top: 1px solid rgba(255,255,255,0.1); padding-top: 14px;
    }
    .sc-tier {
      font-size: 0.75rem; font-weight: 700; color: #ffd700;
      background: rgba(255,215,0,0.12); border-radius: 20px; padding: 4px 12px;
      border: 1px solid rgba(255,215,0,0.25);
    }
    .sc-url-bar {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      background: rgba(255,215,0,0.15);
      border: 1.5px solid rgba(255,215,0,0.4);
      border-radius: 30px;
      padding: 10px 20px;
      margin-top: 16px;
    }
    .sc-url-icon { font-size: 1rem; }
    .sc-url-text { font-size: 1rem; font-weight: 800; color: #ffd700; letter-spacing: 0.03em; }

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
  private readonly seo = inject(SeoService);

  /** true when loaded via a public /share/:id URL (no auth, no edit button) */
  isSharedView = signal(false);

  /** When true: skip data loading (parent already loaded) and hide the header. */
  @Input() embedded = false;

  @ViewChild('bracketEl') bracketEl!: ElementRef<HTMLDivElement>;
  @ViewChild('storyCard') storyCardEl!: ElementRef<HTMLDivElement>;

  loading   = signal(true);
  exporting = signal<'img' | 'pdf' | 'story' | null>(null);
  showStoryModal = signal(false);
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
    // When embedded in another page, data is already loaded — skip all API calls.
    if (this.embedded) {
      this.loading.set(false);
      return;
    }

    this.seo.set({
      title: 'Bracket | Predict The Champion',
      description: 'View this FIFA World Cup 2026 bracket prediction.',
      url: '/share/bracket',
    });

    const shareToken = this.route.snapshot.paramMap.get('id');
    if (shareToken) this.isSharedView.set(true);

    forkJoin({
      groups: this.tournamentService.getGroups(),
      slots:  this.tournamentService.getKnockoutSlots(),
    }).subscribe({
      next: ({ groups, slots }) => {
        this.bracketService.loadTeams(groups);
        this.bracketService.initSlots(slots);
        const load$ = shareToken
          ? this.bracketService.loadSharedBracket(shareToken)
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
      const token = this.bracketService.shareToken();
      if (!token) return;
      const url = `${window.location.origin}/share/bracket/${token}`;
      await navigator.clipboard.writeText(url);
      this.linkCopied.set(true);
      setTimeout(() => this.linkCopied.set(false), 2500);
    } catch { /* ignore */ }
  }

  shareStory(): void {
    this.showStoryModal.set(true);
  }

  closeStoryModal(): void {
    if (this.exporting()) return;
    this.showStoryModal.set(false);
  }

  async downloadStory(): Promise<void> {
    if (this.exporting()) return;
    this.exporting.set('story');
    const el = this.storyCardEl.nativeElement;
    el.style.position = 'fixed';
    el.style.left = '0';
    el.style.top = '0';
    el.style.zIndex = '99999';
    el.style.visibility = 'visible';
    try {
      await new Promise(r => setTimeout(r, 150));
      const dataUrl = await toPng(el, { cacheBust: true, pixelRatio: 3, width: 405, height: 720 });
      const link = document.createElement('a');
      link.download = 'my-bracket-story.png';
      link.href = dataUrl;
      link.click();
      this.showStoryModal.set(false);
    } catch (e) { console.error(e); }
    finally {
      el.style.position = 'fixed';
      el.style.left = '-9999px';
      el.style.top = '0';
      el.style.zIndex = '';
      el.style.visibility = 'hidden';
      this.exporting.set(null);
    }
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
