import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BracketService } from '../../core/services/bracket.service';
import { DraftService } from '../../core/services/draft.service';
import { TournamentService } from '../../core/services/tournament.service';
import { AuthService } from '../../core/services/auth.service';
import { GuestBracketService } from '../../core/services/guest-bracket.service';
import { AuthModalComponent } from '../../shared/auth-modal/auth-modal.component';
import { TournamentGroup, TournamentConfig, BracketDraftMeta, BracketDraftFull } from '../../core/models/tournament.models';
import { GroupStageComponent } from './group-stage/group-stage.component';
import { KnockoutComponent } from './knockout/knockout.component';
import { ChampionComponent } from './champion/champion.component';
import { CountdownComponent } from '../../shared/countdown/countdown.component';

@Component({
  selector: 'app-bracket',
  standalone: true,
  imports: [
    MatProgressBarModule, RouterLink,
    GroupStageComponent, KnockoutComponent, ChampionComponent,
    CountdownComponent,
    FormsModule,
    DatePipe,
    AuthModalComponent,
  ],
  template: `
    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    } @else {

      <!-- ── Page header ──────────────────────────────────────── -->
      <div class="page-header">

        <!-- Left: countdown + tier + submitted indicator -->
        <div class="header-left">
          @if (config()) {
            <app-countdown [lockDate]="config()!.bracketLockDate" />
          }
          <div class="tier-pills">
            @for (t of tiers; track t.value) {
              <button class="hdr-btn tier-pill"
                      [class.tier-pill-active]="bracketService.tier() === t.value"
                      [disabled]="bracketService.isLocked()"
                      (click)="bracketService.setTier(t.value)">
                {{ t.medal }} {{ t.value }}
              </button>
            }
          </div>
        </div>

        <!-- Right: action buttons -->
        <div class="header-actions">
          <a class="hdr-btn rules-btn" routerLink="/rules">Rules</a>
          <button class="hdr-btn drafts-btn" (click)="openDraftsDrawer()">
            📋 My Drafts
            @if (drafts().length > 0) {
              <span class="drafts-badge">{{ drafts().length }}</span>
            }
          </button>
          <button class="hdr-btn save-btn"
                  [disabled]="bracketService.isLocked() || savingDraft()"
                  (click)="openSaveDraftModal()">
            {{ savingDraft() ? 'Saving…' : '💾 Save Draft' }}
          </button>
          <button class="hdr-btn submit-btn"
                  [disabled]="bracketService.isLocked() || saving()"
                  (click)="submitFinal()">
            @if (saving()) { Submitting… }
            @else if (bracketService.bracketId()) { 🔄 Update }
            @else { 🏆 Final Submit }
          </button>
        </div>

      </div>

      <!-- ── Submitted banner ──────────────────────────────────── -->
      @if (bracketService.bracketId()) {
        <div class="submitted-banner" (click)="viewSubmission()">
          <span class="sb-icon">✅</span>
          <span class="sb-text">Your bracket has been submitted</span>
          <span class="sb-link">View &amp; Download →</span>
        </div>
      }

      <!-- ── Step navigator ───────────────────────────────────── -->
      <div class="step-nav">

        <button class="snav-item"
                [class.sn-active]="activeStep() === 0"
                [class.sn-done]="bracketService.groupPicksComplete"
                (click)="goTo(0)">
          <div class="sn-circle">
            @if (bracketService.groupPicksComplete) { ✓ } @else { 1 }
          </div>
          <div class="sn-text">
            <span class="sn-label">Group Stage</span>
            <span class="sn-sub">{{ groupsDone() }}/12 groups</span>
          </div>
        </button>

        <div class="sn-connector" [class.sn-conn-done]="bracketService.groupPicksComplete"></div>

        <button class="snav-item"
                [class.sn-active]="activeStep() === 1"
                [class.sn-done]="allKnockoutDone()"
                (click)="goTo(1)">
          <div class="sn-circle">
            @if (allKnockoutDone()) { ✓ } @else { 2 }
          </div>
          <div class="sn-text">
            <span class="sn-label">Knockout</span>
            <span class="sn-sub">{{ knockoutPicked() }}/31 picks</span>
          </div>
        </button>

        <div class="sn-connector" [class.sn-conn-done]="allKnockoutDone()"></div>

        <button class="snav-item"
                [class.sn-active]="activeStep() === 2"
                [class.sn-done]="!!bracketService.champion"
                (click)="goTo(2)">
          <div class="sn-circle">
            @if (bracketService.champion) { 🏆 } @else { 3 }
          </div>
          <div class="sn-text">
            <span class="sn-label">Champion</span>
            <span class="sn-sub">{{ bracketService.champion?.name ?? 'Pending' }}</span>
          </div>
        </button>

      </div>

      <!-- ── Step content ─────────────────────────────────────── -->
      @if (stepVisible()) {
        <div class="step-content" [class]="'step-dir-' + stepDir()">

          @if (activeStep() === 0) {
            <app-group-stage [groups]="groups()" />
            <div class="step-actions">
              <button class="action-next" (click)="goTo(1)">Knockout Rounds →</button>
            </div>
          }

          @if (activeStep() === 1) {
            <app-knockout />
            <div class="step-actions">
              <button class="action-back" (click)="goTo(0)">← Groups</button>
              <button class="action-next" (click)="goTo(2)">Champion →</button>
            </div>
          }

          @if (activeStep() === 2) {
            <app-champion />
            <div class="step-actions">
              <button class="action-back" (click)="goTo(1)">← Knockout</button>
            </div>
          }

        </div>
      }

      <!-- ── Drafts drawer ─────────────────────────────────────── -->
      @if (showDraftsDrawer()) {
        <!-- overlay -->
        <div class="drawer-overlay" (click)="closeDraftsDrawer()"></div>
        <!-- panel -->
        <div class="drawer-panel">
          <div class="drawer-header">
            <span class="drawer-title">📋 My Drafts</span>
            <button class="drawer-close" (click)="closeDraftsDrawer()">✕</button>
          </div>
          <div class="drawer-body">
            @if (drafts().length === 0) {
              <div class="dp-empty">
                <div class="dp-empty-icon">📭</div>
                <div>No drafts saved yet.</div>
                <div class="dp-empty-hint">Use "Save Draft" to store your picks.</div>
              </div>
            } @else {
              @for (group of draftsByTier(); track group.tier) {
                @if (group.items.length > 0) {
                  <div class="dp-tier-group">
                    <div class="dp-tier-label">{{ group.medal }} {{ group.tier }}</div>
                    @for (draft of group.items; track draft.id) {
                      <div class="dp-draft-row"
                           [class.dp-draft-active]="activeDraftId() === draft.id"
                           [class.dp-draft-submitted]="draft.isSubmittedFinal">
                        <div class="dp-draft-info">
                          <div class="dp-draft-name-row">
                            <span class="dp-draft-name">{{ draft.name }}</span>
                            @if (draft.isSubmittedFinal) {
                              <span class="dp-submitted-badge">🏆 Final</span>
                            }
                            @if (activeDraftId() === draft.id) {
                              <span class="dp-active-badge">● Active</span>
                            }
                          </div>
                          <span class="dp-draft-date">{{ draft.updatedAt | date:'MMM d, h:mm a' }}</span>
                        </div>
                        <div class="dp-draft-actions">
                          <button class="dp-btn dp-btn-load"
                                  [disabled]="loadingDraftId() === draft.id"
                                  (click)="loadDraft(draft)">
                            {{ loadingDraftId() === draft.id ? '…' : '📂 Load' }}
                          </button>
                          <button class="dp-btn dp-btn-submit"
                                  [disabled]="bracketService.isLocked() || submittingDraftId() === draft.id"
                                  (click)="submitDraft(draft)">
                            {{ submittingDraftId() === draft.id ? '…' : '🏆 Submit' }}
                          </button>
                          <button class="dp-btn dp-btn-delete"
                                  (click)="deleteDraft(draft)">
                            🗑
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                }
              }
            }
          </div>
        </div>
      }

      <!-- ── Submit Confirm Modal ──────────────────────────── -->
      @if (showSubmitModal()) {
        <div class="draft-modal-overlay" (click)="closeSubmitModal()">
          <div class="draft-modal submit-modal" (click)="$event.stopPropagation()">
            <div class="sm-icon">{{ submitModalData().icon }}</div>
            <h3 class="dm-title">{{ submitModalData().title }}</h3>
            <p class="sm-body">{{ submitModalData().body }}</p>
            <div class="dm-actions">
              <button class="dm-btn-cancel" (click)="closeSubmitModal()">Cancel</button>
              <button class="sm-btn-confirm"
                      [disabled]="saving()"
                      (click)="confirmSubmit()">
                {{ saving() ? 'Submitting…' : submitModalData().confirmLabel }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ── Save Draft Modal ───────────────────────────────── -->
      @if (showDraftModal()) {
        <div class="draft-modal-overlay" (click)="closeDraftModal()">
          <div class="draft-modal" (click)="$event.stopPropagation()">
            <h3 class="dm-title">💾 Save Draft</h3>
            <p class="dm-sub">Tier: <strong>{{ bracketService.tier() }}</strong></p>
            <input class="dm-input"
                   type="text"
                   placeholder="Draft name (e.g. My Aggressive Pick)"
                   [(ngModel)]="draftNameValue"
                   maxlength="60"
                   (keydown.enter)="saveDraft()">
            <div class="dm-actions">
              <button class="dm-btn-cancel" (click)="closeDraftModal()">Cancel</button>
              <button class="dm-btn-save"
                      [disabled]="!draftNameValue.trim() || savingDraft()"
                      (click)="saveDraft()">
                {{ savingDraft() ? 'Saving…' : 'Save' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ── Auth Modal (guest tries to save/submit) ───────────── -->
      @if (showAuthModal()) {
        <app-auth-modal
          (loggedIn)="onAuthSuccess()"
          (closed)="showAuthModal.set(false)">
        </app-auth-modal>
      }

    }
  `,
  styles: [`
    /* ── Page header ────────────────────────────────────────────── */
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      gap: 12px;
      flex-wrap: wrap;
    }
    .header-left {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    }
    .tier-pills { display: flex; gap: 6px; }
    .tier-pill {
      border: 2px solid #e0e0e0;
      background: white;
      color: #1a237e;
    }
    .tier-pill:hover:not(:disabled):not(.tier-pill-active) {
      border-color: #90caf9;
      background: #e3f2fd;
    }
    .tier-pill.tier-pill-active {
      border-color: #1a237e;
      background: linear-gradient(135deg, #e8eaf6, #c5cae9);
      box-shadow: 0 2px 6px rgba(26,35,126,0.15);
    }
.header-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    }

    /* Shared base for all header buttons */
    .hdr-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 9px 18px;
      border: none;
      border-radius: 22px;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.18s ease;
      white-space: nowrap;
    }
    .hdr-btn:disabled {
      opacity: 0.55;
      cursor: default;
      transform: none !important;
      box-shadow: none !important;
    }

    /* Rules button */
    .rules-btn {
      background: transparent; text-decoration: none;
      color: rgba(255,255,255,0.65); border: 1.5px dashed rgba(255,255,255,0.25);
      box-shadow: none;
    }
    .rules-btn:hover { color: white; border-color: rgba(255,255,255,0.55); background: rgba(255,255,255,0.06); }

    /* My Drafts button — outlined style */
    .drafts-btn {
      background: white;
      color: #1a237e;
      border: 2px solid #1a237e;
      box-shadow: none;
      position: relative;
    }
    .drafts-btn:hover {
      background: #e8eaf6;
      transform: translateY(-1px);
    }
    .drafts-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #1a237e;
      color: white;
      font-size: 0.65rem;
      font-weight: 800;
      margin-left: 2px;
    }

    /* Save Draft button — blue filled */
    .save-btn {
      background: linear-gradient(135deg, #1a237e, #283593);
      color: white;
      box-shadow: 0 3px 10px rgba(26,35,126,0.35);
    }
    .save-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, #283593, #3949ab);
      box-shadow: 0 5px 16px rgba(26,35,126,0.45);
      transform: translateY(-1px);
    }

    /* Submitted banner */
    .submitted-banner {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 16px; margin-bottom: 14px;
      background: #e8f5e9; border: 1px solid #a5d6a7;
      border-radius: 10px; cursor: pointer;
      transition: background 0.15s;
    }
    .submitted-banner:hover { background: #c8e6c9; }
    .sb-icon { font-size: 1rem; }
    .sb-text { font-size: 0.82rem; font-weight: 600; color: #1b5e20; flex: 1; }
    .sb-link { font-size: 0.78rem; font-weight: 700; color: #1b5e20; white-space: nowrap; }

    /* Final Submit button — green filled */
    .submit-btn {
      background: linear-gradient(135deg, #1b5e20, #2e7d32);
      color: white;
      box-shadow: 0 3px 10px rgba(27,94,32,0.35);
    }
    .submit-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, #2e7d32, #388e3c);
      box-shadow: 0 5px 16px rgba(27,94,32,0.45);
      transform: translateY(-1px);
    }

    /* ── Step navigator ──────────────────────────────────────────── */
    .step-nav {
      display: flex;
      align-items: center;
      background: white;
      border-radius: 16px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
      padding: 14px 16px;
      margin-bottom: 20px;
      gap: 0;
    }

    .snav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      padding: 8px 10px;
      border: none;
      border-radius: 12px;
      background: transparent;
      cursor: pointer;
      transition: background 0.16s ease;
      min-width: 0;
      text-align: left;
    }
    .snav-item:hover:not(.sn-active) { background: #f5f5f5; }

    .sn-circle {
      width: 36px; height: 36px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.9rem; font-weight: 700; flex-shrink: 0;
      transition: all 0.2s ease;
      background: #e8eaf6; color: #7986cb;
    }
    .sn-active .sn-circle {
      background: linear-gradient(135deg, #1a237e, #3949ab);
      color: white; box-shadow: 0 3px 10px rgba(26,35,126,0.40);
    }
    .sn-done .sn-circle {
      background: linear-gradient(135deg, #2e7d32, #43a047);
      color: white; box-shadow: 0 3px 8px rgba(46,125,50,0.30);
    }
    .sn-done.sn-active .sn-circle {
      background: linear-gradient(135deg, #1b5e20, #2e7d32);
    }

    .sn-text {
      display: flex; flex-direction: column; gap: 1px;
      min-width: 0; overflow: hidden;
    }
    .sn-label {
      font-size: 0.82rem; font-weight: 700; color: #555;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .sn-sub {
      font-size: 0.68rem; color: #aaa;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .sn-active .sn-label { color: #1a237e; }
    .sn-done   .sn-label { color: #2e7d32; }
    .sn-active .sn-sub   { color: #5c6bc0; }
    .sn-done   .sn-sub   { color: #66bb6a; }

    .sn-connector {
      flex-shrink: 0; width: 20px; height: 2px; border-radius: 1px;
      background: #e0e0e0; margin: 0 2px; transition: background 0.3s ease;
    }
    .sn-conn-done { background: #66bb6a; }

    /* ── Step content ────────────────────────────────────────────── */
    @keyframes slideInRight {
      from { opacity: 0; transform: translateX(28px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes slideInLeft {
      from { opacity: 0; transform: translateX(-28px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    .step-dir-right { animation: slideInRight 0.22s cubic-bezier(0.22, 1, 0.36, 1); }
    .step-dir-left  { animation: slideInLeft  0.22s cubic-bezier(0.22, 1, 0.36, 1); }

    .step-actions {
      display: flex; justify-content: flex-end; gap: 10px;
      margin-top: 20px; padding-top: 16px;
      border-top: 1px solid #f0f0f0; flex-wrap: wrap;
    }

    .action-next, .action-back {
      display: inline-flex; align-items: center;
      padding: 9px 20px; border-radius: 22px;
      font-size: 0.88rem; font-weight: 700; cursor: pointer;
      transition: all 0.16s ease; border: 2px solid transparent;
      white-space: nowrap;
    }
    .action-next {
      background: #1a237e; color: white;
      box-shadow: 0 3px 10px rgba(26,35,126,0.30);
    }
    .action-next:hover {
      background: #283593;
      box-shadow: 0 5px 14px rgba(26,35,126,0.40);
      transform: translateY(-1px);
    }
    .action-back {
      background: white; color: #555; border-color: #e0e0e0;
    }
    .action-back:hover {
      border-color: #1a237e; color: #1a237e; background: #e8eaf6;
    }

    @media (max-width: 480px) {
      .hdr-btn { padding: 8px 12px; font-size: 0.78rem; }
      .header-actions { gap: 6px; }
    }
    @media (max-width: 360px) {
      .sn-sub { display: none; }
      .sn-label { font-size: 0.72rem; }
      .snav-item { padding: 6px 6px; gap: 6px; }
      .sn-circle { width: 30px; height: 30px; font-size: 0.8rem; }
      .sn-connector { width: 10px; }
    }

    /* ── Drafts drawer ───────────────────────────────────────────── */
    @keyframes drawerSlideIn {
      from { transform: translateX(100%); }
      to   { transform: translateX(0); }
    }
    @keyframes overlayFadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    .drawer-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.40);
      z-index: 900;
      animation: overlayFadeIn 0.22s ease;
    }

    .drawer-panel {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      width: 360px;
      max-width: 100vw;
      background: white;
      box-shadow: -6px 0 32px rgba(0, 0, 0, 0.18);
      z-index: 901;
      display: flex;
      flex-direction: column;
      animation: drawerSlideIn 0.28s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 20px;
      border-bottom: 1px solid #eee;
      background: #f5f5f5;
      flex-shrink: 0;
    }
    .drawer-title {
      font-size: 1rem;
      font-weight: 800;
      color: #1a237e;
    }
    .drawer-close {
      width: 32px; height: 32px; border-radius: 50%;
      border: none; background: #e0e0e0; color: #555;
      font-size: 0.85rem; font-weight: 700; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s;
    }
    .drawer-close:hover { background: #bdbdbd; }

    .drawer-body {
      flex: 1;
      overflow-y: auto;
      padding-bottom: 20px;
    }

    /* ── Drafts list inside drawer ───────────────────────────────── */
    .dp-empty {
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 48px 24px; gap: 8px;
      text-align: center; color: #aaa; font-size: 0.85rem;
    }
    .dp-empty-icon { font-size: 2.4rem; }
    .dp-empty-hint { font-size: 0.75rem; color: #ccc; }

    .dp-tier-group { border-bottom: 1px solid #f0f0f0; }
    .dp-tier-group:last-child { border-bottom: none; }
    .dp-tier-label {
      padding: 10px 20px; font-size: 0.72rem; font-weight: 700;
      color: #888; text-transform: uppercase; letter-spacing: 0.08em;
      background: #fafafa; border-bottom: 1px solid #f0f0f0;
    }
    .dp-draft-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 20px; gap: 12px; border-top: 1px solid #f8f8f8;
    }
    .dp-draft-submitted {
      background: #fffde7;
      border-left: 3px solid #f9a825;
    }
    .dp-draft-active {
      background: #f0f9f0;
      border-left: 3px solid #2e7d32;
    }
    /* When both active and submitted */
    .dp-draft-submitted.dp-draft-active {
      background: linear-gradient(to right, #f0f9f0, #fffde7);
      border-left: 3px solid #2e7d32;
    }
    .dp-draft-info { flex: 1; min-width: 0; }
    .dp-draft-name-row {
      display: flex; align-items: center; gap: 6px;
      min-width: 0;
    }
    .dp-draft-name {
      font-size: 0.88rem; font-weight: 600;
      color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      min-width: 0;
    }
    .dp-submitted-badge {
      flex-shrink: 0;
      font-size: 0.65rem; font-weight: 700;
      color: #f57f17; background: #fff8e1;
      border-radius: 8px; padding: 2px 7px;
      white-space: nowrap;
    }
    .dp-active-badge {
      flex-shrink: 0;
      font-size: 0.65rem; font-weight: 700;
      color: #2e7d32; background: #e8f5e9;
      border-radius: 8px; padding: 2px 7px;
      white-space: nowrap;
    }
    .dp-draft-date { font-size: 0.72rem; color: #aaa; }
    .dp-draft-actions { display: flex; gap: 5px; flex-shrink: 0; }
    .dp-btn {
      padding: 5px 10px; border-radius: 7px; border: none;
      font-size: 0.72rem; font-weight: 600; cursor: pointer;
      transition: opacity 0.15s, transform 0.1s;
    }
    .dp-btn:disabled { opacity: 0.45; cursor: default; }
    .dp-btn:not(:disabled):hover { opacity: 0.85; transform: translateY(-1px); }
    .dp-btn-load   { background: #e3f2fd; color: #1565c0; }
    .dp-btn-submit { background: #e8f5e9; color: #2e7d32; }
    .dp-btn-delete { background: #fce4ec; color: #c62828; }

    /* ── Save Draft Modal ────────────────────────────────────────── */
    .draft-modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.45);
      z-index: 999; display: flex; align-items: center; justify-content: center;
    }
    .draft-modal {
      background: white; border-radius: 16px;
      padding: 24px 20px; width: 380px; max-width: 94vw;
      box-shadow: 0 20px 60px rgba(0,0,0,0.25);
      box-sizing: border-box;
    }
    .dm-title { font-size: 1.2rem; font-weight: 800; color: #1a237e; margin: 0 0 4px; }
    .dm-sub { font-size: 0.85rem; color: #777; margin: 0 0 16px; }
    .dm-input {
      width: 100%; box-sizing: border-box;
      padding: 10px 14px; font-size: 0.95rem;
      border: 2px solid #e0e0e0; border-radius: 10px; outline: none;
      transition: border-color 0.15s;
    }
    .dm-input:focus { border-color: #1a237e; }
    .dm-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }
    .dm-btn-cancel {
      padding: 9px 20px; border-radius: 8px; border: 2px solid #e0e0e0;
      background: white; font-weight: 600; color: #666; cursor: pointer;
    }
    .dm-btn-save {
      padding: 9px 24px; border-radius: 8px; border: none;
      background: #1a237e; color: white; font-weight: 700; cursor: pointer;
      transition: opacity 0.15s;
    }
    .dm-btn-save:disabled { opacity: 0.5; cursor: default; }

    /* ── Submit Confirm Modal ────────────────────────────────────── */
    .submit-modal { text-align: center; }
    .sm-icon { font-size: 2.5rem; margin-bottom: 8px; }
    .sm-body { font-size: 0.92rem; color: #555; margin: 0 0 20px; line-height: 1.5; }
    .sm-btn-confirm {
      padding: 9px 24px; border-radius: 8px; border: none;
      background: #1a237e; color: white; font-weight: 700; cursor: pointer;
      transition: opacity 0.15s;
    }
    .sm-btn-confirm:disabled { opacity: 0.5; cursor: default; }
  `],
})
export class BracketComponent implements OnInit {
  readonly bracketService = inject(BracketService);
  readonly tiers = [
    { value: 'Bronze' as const, medal: '🥉' },
    { value: 'Silver' as const, medal: '🥈' },
    { value: 'Gold'   as const, medal: '🥇' },
  ];
  private readonly draftService = inject(DraftService);
  private readonly tournamentService = inject(TournamentService);
  private readonly auth = inject(AuthService);
  private readonly guestBracket = inject(GuestBracketService);
  private readonly snack = inject(MatSnackBar);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  groups  = signal<TournamentGroup[]>([]);
  config  = signal<TournamentConfig | null>(null);
  loading = signal(true);
  saving  = signal(false);

  // Submit confirm modal
  showSubmitModal = signal(false);
  submitModalData = signal<{ icon: string; title: string; body: string; confirmLabel: string }>({
    icon: '', title: '', body: '', confirmLabel: 'Submit',
  });

  // Draft state
  drafts = signal<BracketDraftMeta[]>([]);
  showDraftModal    = signal(false);
  showDraftsDrawer  = signal(false);
  draftNameValue = '';
  savingDraft = signal(false);
  submittingDraftId = signal<number | null>(null);
  loadingDraftId    = signal<number | null>(null);
  activeDraftId     = signal<number | null>(null);   // which draft is currently loaded
  isFinalSubmitted  = signal(false);
  showAuthModal     = signal(false);

  // Action to replay after guest logs in ('saveDraft' | 'submit' | 'drafts' | null)
  private pendingAction = signal<'saveDraft' | 'submit' | 'drafts' | null>(null);

  draftsByTier = computed(() => {
    const all = this.drafts();
    const tiers: ('Bronze' | 'Silver' | 'Gold')[] = ['Bronze', 'Silver', 'Gold'];
    return tiers.map(t => ({
      tier: t,
      medal: t === 'Bronze' ? '🥉' : t === 'Silver' ? '🥈' : '🥇',
      items: all.filter(d => d.tier === t),
    }));
  });

  activeStep  = signal(0);
  stepVisible = signal(true);
  stepDir     = signal<'right' | 'left'>('right');

  groupsDone = computed(() =>
    this.bracketService.groupPicks().filter(g => g.firstTeamId && g.secondTeamId).length
  );
  knockoutPicked = computed(() =>
    this.bracketService.knockoutPicks().filter(p => p.pickedTeamId !== null).length
  );
  allKnockoutDone = computed(() => this.knockoutPicked() === 31);

  goTo(i: number): void {
    if (i === this.activeStep() || i < 0 || i > 2) return;
    this.stepDir.set(i > this.activeStep() ? 'right' : 'left');
    this.stepVisible.set(false);
    setTimeout(() => {
      this.activeStep.set(i);
      this.stepVisible.set(true);
    }, 20);
  }

  ngOnInit(): void {
    const tierParam = this.route.snapshot.queryParams['tier'] as string | undefined;

    forkJoin({
      groups: this.tournamentService.getGroups(),
      slots:  this.tournamentService.getKnockoutSlots(),
      config: this.tournamentService.getConfig(),
    }).subscribe({
      next: ({ groups, slots, config }) => {
        this.groups.set(groups);
        this.config.set(config);
        this.bracketService.loadTeams(groups);
        this.bracketService.initSlots(slots);

        if (this.auth.isLoggedIn()) {
          // Restore any guest picks saved before login
          if (this.guestBracket.hasSaved()) {
            this.guestBracket.restore();
            this.guestBracket.clear();
            this.snack.open('Your picks have been restored! 🎉', undefined, { duration: 4000 });
          } else {
            this.bracketService.loadBracket().subscribe({
              next: () => {
                if (tierParam && ['Bronze', 'Silver', 'Gold'].includes(tierParam)) {
                  this.bracketService.setTier(tierParam as 'Bronze' | 'Silver' | 'Gold');
                }
              },
              error: () => {
                if (tierParam && ['Bronze', 'Silver', 'Gold'].includes(tierParam)) {
                  this.bracketService.setTier(tierParam as 'Bronze' | 'Silver' | 'Gold');
                }
              },
            });
          }
          this.loadDrafts();
        } else {
          // Guest — show bracket freely, set tier if provided
          if (tierParam && ['Bronze', 'Silver', 'Gold'].includes(tierParam)) {
            this.bracketService.setTier(tierParam as 'Bronze' | 'Silver' | 'Gold');
          }
        }

        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /** Show auth modal for guests — returns true if guest (caller should return) */
  private requireLogin(action: 'saveDraft' | 'submit' | 'drafts'): boolean {
    if (this.auth.isLoggedIn()) return false;
    this.pendingAction.set(action);
    this.showAuthModal.set(true);
    return true;
  }

  /** Called after guest successfully logs in via modal */
  onAuthSuccess(): void {
    this.showAuthModal.set(false);
    const action = this.pendingAction();
    this.pendingAction.set(null);

    // Restore guest picks into the bracket service
    if (this.guestBracket.hasSaved()) {
      this.guestBracket.restore();
      this.guestBracket.clear();
    }

    // Load server bracket and drafts now that user is logged in
    this.bracketService.loadBracket().subscribe();
    this.loadDrafts();

    // Replay the action they originally wanted
    if (action === 'saveDraft') this.openSaveDraftModal();
    else if (action === 'submit') this.submitFinal();
    else if (action === 'drafts') this.openDraftsDrawer();
  }

  // ── Drawer ──────────────────────────────────────────────────────
  openDraftsDrawer(): void  {
    if (this.requireLogin('drafts')) return;
    this.showDraftsDrawer.set(true);
  }
  closeDraftsDrawer(): void { this.showDraftsDrawer.set(false); }

  // ── Drafts ──────────────────────────────────────────────────────
  loadDrafts(): void {
    this.draftService.list().subscribe(d => this.drafts.set(d));
  }

  openSaveDraftModal(): void {
    if (this.requireLogin('saveDraft')) return;
    this.draftNameValue = 'My Bracket ' + new Date().toLocaleDateString();
    this.showDraftModal.set(true);
  }

  closeDraftModal(): void {
    this.showDraftModal.set(false);
  }

  saveDraft(): void {
    const name = this.draftNameValue.trim();
    if (!name) return;
    this.savingDraft.set(true);
    const payload = {
      name,
      tier: this.bracketService.tier(),
      groupPicks: this.bracketService.groupPicks().map(gp => ({
        groupId: gp.groupId, firstTeamId: gp.firstTeamId, secondTeamId: gp.secondTeamId,
      })),
      knockoutPicks: this.bracketService.knockoutPicks().map(kp => ({
        matchId: kp.matchId, pickedTeamId: kp.pickedTeamId,
        homeScore: kp.homeScore, awayScore: kp.awayScore, lineupPlayerIds: kp.lineupPlayerIds,
      })),
      best3rdPicks: this.bracketService.best3rdPicks().map((teamId, i) => ({ rank: i + 1, teamId })),
    };
    this.draftService.save(payload).subscribe({
      next: () => {
        this.savingDraft.set(false);
        this.showDraftModal.set(false);
        this.loadDrafts();
        this.snack.open('Draft saved! ✓', undefined, { duration: 3000 });
      },
      error: (err) => {
        this.savingDraft.set(false);
        this.snack.open(err?.error?.message ?? 'Save failed.', 'OK', { duration: 5000 });
      },
    });
  }

  loadDraft(draft: BracketDraftMeta): void {
    this.loadingDraftId.set(draft.id);
    this.draftService.get(draft.id).subscribe({
      next: (full: BracketDraftFull) => {
        this.loadingDraftId.set(null);
        this.activeDraftId.set(draft.id);
        this.closeDraftsDrawer();
        if (['Bronze', 'Silver', 'Gold'].includes(full.tier))
          this.bracketService.setTier(full.tier as 'Bronze' | 'Silver' | 'Gold');
        full.groupPicks.forEach(gp => {
          const group = this.groups().find(g => g.id === gp.groupId);
          if (group) this.bracketService.setGroupPick(gp.groupId, group.name, gp.firstTeamId, gp.secondTeamId);
        });
        full.knockoutPicks.forEach(kp => {
          this.bracketService.setKnockoutPick(kp.matchId, kp.pickedTeamId);
          if (kp.homeScore !== null || kp.awayScore !== null)
            this.bracketService.setKnockoutScore(kp.matchId, kp.homeScore, kp.awayScore);
          if (kp.lineupPlayerIds?.length)
            this.bracketService.setKnockoutLineup(kp.matchId, kp.lineupPlayerIds);
        });
        full.best3rdPicks.forEach(bp => this.bracketService.setBest3rdPick(bp.rank - 1, bp.teamId));
        this.goTo(0);
        this.snack.open(`Loaded: ${full.name}`, undefined, { duration: 3000 });
      },
      error: () => {
        this.loadingDraftId.set(null);
        this.snack.open('Failed to load draft.', 'OK', { duration: 3000 });
      },
    });
  }

  deleteDraft(draft: BracketDraftMeta): void {
    this.draftService.delete(draft.id).subscribe({
      next: () => {
        if (this.activeDraftId() === draft.id) this.activeDraftId.set(null);
        this.loadDrafts();
        this.snack.open('Draft deleted.', undefined, { duration: 2500 });
      },
      error: () => this.snack.open('Delete failed.', 'OK', { duration: 3000 }),
    });
  }

  submitFinal(): void {
    if (this.requireLogin('submit')) return;
    if (this.saving()) return;
    const isEdit = !!this.bracketService.bracketId();
    const isComplete = this.bracketService.groupPicksComplete && !!this.bracketService.champion;

    if (isEdit) {
      this.submitModalData.set({
        icon: '✏️',
        title: 'Override your bracket?',
        body: isComplete
          ? 'Your bracket is complete. This will replace your previously submitted bracket. Are you sure?'
          : 'Your bracket is incomplete. This will still override your previous submission. Are you sure you want to proceed?',
        confirmLabel: 'Yes, Override',
      });
    } else if (isComplete) {
      this.submitModalData.set({
        icon: '🏆',
        title: 'Submit your bracket?',
        body: 'Your bracket is complete! Once submitted, you can still update it before the deadline.',
        confirmLabel: 'Submit',
      });
    } else {
      this.submitModalData.set({
        icon: '⚠️',
        title: 'Incomplete bracket',
        body: 'You haven\'t filled in all your picks yet. Do you still want to submit with the current selections?',
        confirmLabel: 'Submit Anyway',
      });
    }

    this.showSubmitModal.set(true);
  }

  viewSubmission(): void {
    this.router.navigate(['/bracket/view']);
  }

  closeSubmitModal(): void {
    if (this.saving()) return;
    this.showSubmitModal.set(false);
  }

  confirmSubmit(): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.bracketService.save().subscribe({
      next: () => {
        this.saving.set(false);
        this.showSubmitModal.set(false);
        this.isFinalSubmitted.set(true);
        this.guestBracket.clear(); // clear any saved guest picks
        this.router.navigate(['/bracket/view']);
      },
      error: (err) => {
        this.saving.set(false);
        this.snack.open(err?.error?.message ?? 'Submit failed.', 'OK', { duration: 5000 });
      },
    });
  }

  submitDraft(draft: BracketDraftMeta): void {
    this.submittingDraftId.set(draft.id);
    this.draftService.submit(draft.id).subscribe({
      next: (b) => {
        this.submittingDraftId.set(null);
        this.bracketService.applyFromDto(b);
        this.isFinalSubmitted.set(true);
        this.closeDraftsDrawer();
        this.snack.open(`"${draft.name}" submitted as your final prediction! 🏆`, undefined, { duration: 5000 });
      },
      error: (err) => {
        this.submittingDraftId.set(null);
        this.snack.open(err?.error?.message ?? 'Submit failed.', 'OK', { duration: 5000 });
      },
    });
  }
}
