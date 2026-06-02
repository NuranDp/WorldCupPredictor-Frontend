import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { LeaderboardService, LeaderboardEntry } from '../../core/services/leaderboard.service';
import { AuthService } from '../../core/services/auth.service';

type Tier = 'Bronze' | 'Silver' | 'Gold';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [MatCardModule, MatProgressBarModule, MatTableModule, MatIconModule],
  template: `
    <div class="page-header">
      <h2>Leaderboard</h2>
      <span class="subtitle">Predict The Champion</span>
    </div>

    <!-- â”€â”€ Tier selector â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ -->
    <div class="tier-row">
      @for (t of tiers; track t.value) {
        <button class="tier-tab" [class.tier-tab-active]="selectedTier() === t.value"
                (click)="selectTier(t.value)">
          <span class="tt-medal">{{ t.medal }}</span>
          <span class="tt-label">{{ t.value }}</span>
          <span class="tt-desc">{{ t.desc }}</span>
        </button>
      }
    </div>

    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    } @else if (entries().length === 0) {
      <div class="empty-state">
        <div class="empty-icon">ðŸŸï¸</div>
        <div class="empty-msg">No {{ selectedTier() }} brackets submitted yet.</div>
        <div class="empty-hint">Be the first to submit a {{ selectedTier() }} prediction!</div>
      </div>
    } @else {

      <!-- Podium for top 3 -->
      @if (entries().length >= 3) {
        <div class="podium">
          <!-- 2nd -->
          <div class="podium-slot silver">
            <div class="podium-avatar">{{ initials(entries()[1].name) }}</div>
            <div class="podium-name">{{ entries()[1].name }}</div>
            <div class="podium-pts">{{ entries()[1].totalPoints }} pts</div>
            <div class="podium-rank">2nd</div>
            <div class="podium-bar bar-2"></div>
          </div>
          <!-- 1st -->
          <div class="podium-slot gold">
            <div class="podium-crown">ðŸ‘‘</div>
            <div class="podium-avatar">{{ initials(entries()[0].name) }}</div>
            <div class="podium-name">{{ entries()[0].name }}</div>
            <div class="podium-pts">{{ entries()[0].totalPoints }} pts</div>
            <div class="podium-rank">1st</div>
            <div class="podium-bar bar-1"></div>
          </div>
          <!-- 3rd -->
          <div class="podium-slot bronze">
            <div class="podium-avatar">{{ initials(entries()[2].name) }}</div>
            <div class="podium-name">{{ entries()[2].name }}</div>
            <div class="podium-pts">{{ entries()[2].totalPoints }} pts</div>
            <div class="podium-rank">3rd</div>
            <div class="podium-bar bar-3"></div>
          </div>
        </div>
      }

      <!-- Full table -->
      <mat-card class="table-card">
        <mat-card-content>
          <table mat-table [dataSource]="entries()" class="lb-table">

            <ng-container matColumnDef="rank">
              <th mat-header-cell *matHeaderCellDef>Rank</th>
              <td mat-cell *matCellDef="let e">
                @if (e.rank === 1) { <span class="medal">ðŸ¥‡</span> }
                @else if (e.rank === 2) { <span class="medal">ðŸ¥ˆ</span> }
                @else if (e.rank === 3) { <span class="medal">ðŸ¥‰</span> }
                @else { <span class="rank-num">#{{ e.rank }}</span> }
              </td>
            </ng-container>

            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Player</th>
              <td mat-cell *matCellDef="let e">
                <div class="player-cell" [class.me]="e.userId === currentUserId()">
                  <div class="avatar">{{ initials(e.name) }}</div>
                  <span>{{ e.name }}
                    @if (e.userId === currentUserId()) {
                      <span class="you-badge">You</span>
                    }
                  </span>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="points">
              <th mat-header-cell *matHeaderCellDef class="pts-header">Points</th>
              <td mat-cell *matCellDef="let e" class="pts-cell">
                <span class="pts-badge" [class.leader]="e.rank === 1">{{ e.totalPoints }}</span>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols;"
                [class.my-row]="row.userId === currentUserId()"></tr>
          </table>
        </mat-card-content>
      </mat-card>

    }
  `,
  styles: [`
    .page-header { margin-bottom: 20px; }
    .page-header h2 { margin: 0; font-size: 1.6rem; font-weight: 700; }
    .subtitle { color: #888; font-size: 0.9rem; }

    /* â”€â”€ Tier selector â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    .tier-row {
      display: flex;
      gap: 10px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .tier-tab {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      flex: 1;
      min-width: 70px;
      padding: 12px 10px;
      border-radius: 14px;
      border: 2px solid #e0e0e0;
      background: white;
      cursor: pointer;
      transition: all 0.18s ease;
      text-align: center;
    }
    .tier-tab:hover:not(.tier-tab-active) {
      border-color: #90caf9;
      background: #e3f2fd;
      transform: translateY(-2px);
    }
    .tier-tab-active {
      border-color: #1a237e;
      background: #e8eaf6;
      box-shadow: 0 3px 10px rgba(26,35,126,0.20);
      transform: translateY(-2px);
    }
    .tt-medal { font-size: 1.6rem; line-height: 1; }
    .tt-label { font-size: 0.85rem; font-weight: 800; color: #1a237e; }
    .tt-desc  { font-size: 0.65rem; color: #888; }

    /* â”€â”€ Empty state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      padding: 48px 24px; gap: 8px; text-align: center;
    }
    .empty-icon { font-size: 3rem; }
    .empty-msg  { font-size: 1rem; font-weight: 600; color: #555; }
    .empty-hint { font-size: 0.82rem; color: #aaa; }

    /* â”€â”€ Podium â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    .podium {
      display: flex;
      justify-content: center;
      align-items: flex-end;
      gap: 8px;
      margin-bottom: 28px;
      padding: 16px 8px 0;
    }
    .podium-slot {
      display: flex; flex-direction: column; align-items: center;
      width: 90px;
    }
    @media (min-width: 360px) { .podium-slot { width: 100px; } }
    @media (min-width: 480px) { .podium-slot { width: 130px; } .podium { gap: 12px; padding: 24px 16px 0; } }
    .podium-crown { font-size: 1.4rem; margin-bottom: 4px; }
    .podium-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 0.85rem; color: white; margin-bottom: 6px;
    }
    @media (min-width: 360px) { .podium-avatar { width: 42px; height: 42px; font-size: 1rem; } }
    @media (min-width: 480px) { .podium-avatar { width: 52px; height: 52px; } }
    .gold   .podium-avatar { background: #f9a825; }
    .silver .podium-avatar { background: #9e9e9e; }
    .bronze .podium-avatar { background: #a1887f; }
    .podium-name { font-size: 0.75rem; font-weight: 600; text-align: center; margin-bottom: 2px; word-break: break-word; }
    @media (min-width: 480px) { .podium-name { font-size: 0.85rem; } }
    .podium-pts  { font-size: 0.72rem; color: #555; margin-bottom: 6px; }
    .podium-rank { font-size: 0.7rem; font-weight: 700; color: white; padding: 2px 8px; border-radius: 10px; }
    .gold   .podium-rank { background: #f9a825; }
    .silver .podium-rank { background: #9e9e9e; }
    .bronze .podium-rank { background: #a1887f; }
    .podium-bar { width: 100%; border-radius: 6px 6px 0 0; }
    .bar-1 { height: 64px; background: linear-gradient(180deg, #ffe082, #f9a825); }
    .bar-2 { height: 48px; background: linear-gradient(180deg, #e0e0e0, #9e9e9e); }
    .bar-3 { height: 36px; background: linear-gradient(180deg, #d7ccc8, #a1887f); }
    @media (min-width: 480px) {
      .bar-1 { height: 80px; } .bar-2 { height: 60px; } .bar-3 { height: 44px; }
    }

    /* â”€â”€ Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    .table-card { overflow: hidden; }
    .table-card mat-card-content { overflow-x: auto; padding: 0 !important; }
    .lb-table { width: 100%; min-width: 300px; }
    .medal { font-size: 1.3rem; }
    .rank-num { color: #888; font-size: 0.9rem; font-weight: 500; }
    .player-cell { display: flex; align-items: center; gap: 10px; }
    .avatar {
      width: 34px; height: 34px; border-radius: 50%;
      background: #1976d2; color: white;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.75rem; font-weight: 700; flex-shrink: 0;
    }
    .you-badge {
      font-size: 0.65rem; background: #e3f2fd; color: #1565c0;
      border-radius: 8px; padding: 1px 6px; margin-left: 4px; font-weight: 600;
    }
    .pts-header, .pts-cell { text-align: right !important; }
    .pts-badge {
      display: inline-block; padding: 3px 10px; border-radius: 12px;
      background: #f5f5f5; font-weight: 600; font-size: 0.9rem;
    }
    .pts-badge.leader { background: #fff9c4; color: #f57f17; }
    .my-row { background: #e8f5e9 !important; }
  `],
})
export class LeaderboardComponent implements OnInit {
  private readonly leaderboardService = inject(LeaderboardService);
  private readonly auth = inject(AuthService);

  entries = signal<LeaderboardEntry[]>([]);
  loading = signal(true);
  selectedTier = signal<Tier>('Gold');
  cols = ['rank', 'name', 'points'];

  readonly tiers: { value: Tier; medal: string; desc: string }[] = [
    { value: 'Gold',   medal: 'ðŸ¥‡', desc: 'Exact scoreline' },
    { value: 'Silver', medal: 'ðŸ¥ˆ', desc: 'Goal difference' },
    { value: 'Bronze', medal: 'ðŸ¥‰', desc: 'Winner only' },
  ];

  currentUserId = () => this.auth.currentUser()?.id ?? -1;

  ngOnInit(): void {
    this.loadLeaderboard();
  }

  selectTier(tier: Tier): void {
    if (tier === this.selectedTier()) return;
    this.selectedTier.set(tier);
    this.loadLeaderboard();
  }

  private loadLeaderboard(): void {
    this.loading.set(true);
    this.leaderboardService.getLeaderboard(this.selectedTier()).subscribe({
      next: data => { this.entries.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  initials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
}

