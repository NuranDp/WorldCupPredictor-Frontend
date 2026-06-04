import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BracketService } from '../../core/services/bracket.service';
import { TournamentService } from '../../core/services/tournament.service';
import { AuthService } from '../../core/services/auth.service';
import { GuestBracketService } from '../../core/services/guest-bracket.service';
import { AuthModalComponent } from '../../shared/auth-modal/auth-modal.component';
import { TournamentGroup, TournamentConfig } from '../../core/models/tournament.models';
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
          <button class="hdr-btn submit-btn"
                  [disabled]="bracketService.isLocked() || saving()"
                  (click)="submitFinal()">
            @if (saving()) { Submitting… }
            @else if (bracketService.bracketId()) { 🔄 Update Submission }
            @else { 🏆 Submit Bracket }
          </button>
        </div>

      </div>

      <!-- ── Submitted banner ──────────────────────────────────── -->
      @if (bracketService.bracketId()) {
        <div class="submitted-banner">
          <span class="sb-icon">✅</span>
          <span class="sb-text">You have an active submission</span>
          <a class="sb-action-btn" routerLink="/bracket/view">
            👁 View Bracket
          </a>
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
            <span class="sn-sub">{{ knockoutPicked() }}/32 picks</span>
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

      <!-- ── Auth Modal (guest tries to submit) ───────────── -->
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

    /* Submitted banner */
    .submitted-banner {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 16px; margin-bottom: 14px;
      background: #e8f5e9; border: 1px solid #a5d6a7;
      border-radius: 10px;
    }
    .sb-icon { font-size: 1rem; }
    .sb-text { font-size: 0.82rem; font-weight: 600; color: #1b5e20; flex: 1; }
    .sb-action-btn {
      font-size: 0.78rem; font-weight: 600; white-space: nowrap;
      padding: 5px 12px; border-radius: 6px; text-decoration: none;
      background: #2e7d32; color: white;
      transition: background 0.15s;
    }
    .sb-action-btn:hover { background: #1b5e20; }

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

    @media (max-width: 600px) {
      .page-header {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
      }
      .header-left {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
      }
      app-countdown { display: block; }
      .tier-pills {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
      }
      .tier-pill { justify-content: center; }
      .rules-btn { display: none; }
      .hdr-btn { padding: 10px 12px; font-size: 0.82rem; justify-content: center; }
    }
    @media (max-width: 360px) {
      .sn-sub { display: none; }
      .sn-label { font-size: 0.72rem; }
      .snav-item { padding: 6px 6px; gap: 6px; }
      .sn-circle { width: 30px; height: 30px; font-size: 0.8rem; }
      .sn-connector { width: 10px; }
    }

    /* ── Submit Confirm Modal ────────────────────────────────────── */
    .draft-modal-overlay {
      position: fixed; inset: 0; z-index: 999;
      background: rgba(0,0,0,0.55);
      backdrop-filter: blur(2px);
      display: flex; align-items: center; justify-content: center;
    }
    .draft-modal {
      position: relative; z-index: 1000;
      background: #fff; border-radius: 16px;
      padding: 28px 28px 24px;
      width: min(420px, calc(100vw - 32px));
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .dm-title { margin: 0 0 8px; font-size: 1.1rem; font-weight: 700; color: #1a237e; }
    .dm-actions { display: flex; gap: 10px; justify-content: flex-end; }
    .dm-btn-cancel {
      padding: 9px 20px; border-radius: 8px; border: 1px solid #e0e0e0;
      background: #f5f5f5; color: #555; font-weight: 600; cursor: pointer;
      transition: background 0.15s;
    }
    .dm-btn-cancel:hover { background: #e0e0e0; }
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
  showAuthModal = signal(false);

  // Submit confirm modal
  showSubmitModal = signal(false);
  submitModalData = signal<{ icon: string; title: string; body: string; confirmLabel: string }>({
    icon: '', title: '', body: '', confirmLabel: 'Submit',
  });

  private pendingAction = signal<'submit' | null>(null);

  activeStep  = signal(0);
  stepVisible = signal(true);
  stepDir     = signal<'right' | 'left'>('right');

  groupsDone = computed(() =>
    this.bracketService.groupPicks().filter(g => g.firstTeamId && g.secondTeamId).length
  );
  knockoutPicked = computed(() =>
    this.bracketService.knockoutPicks().filter(p => p.pickedTeamId !== null).length
  );
  allKnockoutDone = computed(() => this.knockoutPicked() === 32);

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
  private requireLogin(): boolean {
    if (this.auth.isLoggedIn()) return false;
    this.pendingAction.set('submit');
    this.showAuthModal.set(true);
    return true;
  }

  /** Called after guest successfully logs in via modal */
  onAuthSuccess(): void {
    this.showAuthModal.set(false);
    this.pendingAction.set(null);
    if (this.guestBracket.hasSaved()) {
      this.guestBracket.restore();
      this.guestBracket.clear();
    }
    this.bracketService.loadBracket().subscribe();
    this.submitFinal();
  }

  submitFinal(): void {
    if (this.requireLogin()) return;
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
        this.guestBracket.clear();
      },
      error: (err) => {
        this.saving.set(false);
        this.snack.open(err?.error?.message ?? 'Submit failed.', 'OK', { duration: 5000 });
      },
    });
  }
}
