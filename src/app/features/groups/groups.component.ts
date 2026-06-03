import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GroupsService, MyGroup, GroupLeaderboard } from '../../core/services/groups.service';
import { AuthService } from '../../core/services/auth.service';

type Tier = 'Bronze' | 'Silver' | 'Gold';

@Component({
  selector: 'app-groups',
  standalone: true,
  imports: [FormsModule, MatProgressSpinnerModule, RouterLink],
  template: `
    <!-- ── Page header ──────────────────────────────────────────── -->
    <div class="page-header">
      <div>
        <h2>Private Groups</h2>
        <p class="subtitle">Compete with friends in your own private leaderboard</p>
      </div>
    </div>

    <!-- ── Create & Join cards ──────────────────────────────────── -->
    <div class="action-row">

      <div class="action-card">
        <div class="ac-icon">➕</div>
        <div class="ac-title">Create a Group</div>
        <div class="ac-sub">Start a new private group and invite friends</div>
        <input class="ac-input"
               type="text"
               placeholder="Group name e.g. Office Rivals"
               [(ngModel)]="newGroupName"
               maxlength="50"
               (keydown.enter)="createGroup()" />
        <button class="ac-btn ac-btn-create"
                [disabled]="!newGroupName.trim() || creating()"
                (click)="createGroup()">
          {{ creating() ? 'Creating…' : 'Create Group' }}
        </button>
      </div>

      <div class="action-card">
        <div class="ac-icon">🔗</div>
        <div class="ac-title">Join a Group</div>
        <div class="ac-sub">Enter an invite code from a friend</div>
        <input class="ac-input ac-code"
               type="text"
               placeholder="Invite code e.g. A3F7BC"
               [(ngModel)]="joinCode"
               maxlength="6"
               (keydown.enter)="joinGroup()" />
        <button class="ac-btn ac-btn-join"
                [disabled]="joinCode.trim().length < 4 || joining()"
                (click)="joinGroup()">
          {{ joining() ? 'Joining…' : 'Join Group' }}
        </button>
      </div>

    </div>

    <!-- ── My Groups ────────────────────────────────────────────── -->
    <div class="groups-section">
      <div class="section-header">
        <span class="section-title">My Groups</span>
        <span class="section-count">{{ groups().length }}</span>
      </div>

      @if (loadingGroups()) {
        <div class="center-spin"><mat-spinner diameter="36" /></div>
      } @else if (groups().length === 0) {
        <div class="empty-state">
          <div class="es-icon">🏟️</div>
          <div class="es-msg">No groups yet</div>
          <div class="es-hint">Create a group or enter an invite code above.</div>
        </div>
      } @else {
        <div class="groups-list">
          @for (g of groups(); track g.id) {
            <div class="group-card">

              <!-- Card header -->
              <div class="gc-header">
                <div class="gc-left">
                  <div class="gc-avatar">{{ initials(g.name) }}</div>
                  <div class="gc-info">
                    <span class="gc-name">{{ g.name }}</span>
                    <span class="gc-meta">
                      <span class="gc-members">👥 {{ g.memberCount }} member{{ g.memberCount !== 1 ? 's' : '' }}</span>
                      @if (g.isOwner) { <span class="owner-badge">Owner</span> }
                      @else { <span class="member-badge">Member</span> }
                    </span>
                  </div>
                </div>
                <div class="gc-right">
                  <div class="invite-pill">
                    <span class="ip-label">CODE</span>
                    <span class="ip-code">{{ g.inviteCode }}</span>
                    <button class="ip-copy" (click)="copyCode(g.inviteCode)" title="Copy invite code">📋</button>
                  </div>
                </div>
              </div>

              <!-- Card footer actions -->
              <div class="gc-footer">
                <button class="gf-btn gf-lb"
                        [class.gf-lb-active]="expandedGroupId() === g.id"
                        (click)="toggleLeaderboard(g.id)">
                  {{ expandedGroupId() === g.id ? '▲ Hide Leaderboard' : '📊 View Leaderboard' }}
                </button>
                @if (g.isOwner) {
                  <button class="gf-btn gf-danger" (click)="deleteGroup(g)">🗑 Delete</button>
                } @else {
                  <button class="gf-btn gf-danger" (click)="leaveGroup(g)">↩ Leave</button>
                }
              </div>

              <!-- Leaderboard panel -->
              @if (expandedGroupId() === g.id) {
                <div class="lb-panel">

                  <!-- Tier tabs -->
                  <div class="lb-tier-tabs">
                    @for (t of tiers; track t.value) {
                      <button class="ltt-btn"
                              [class.ltt-active]="getGroupTier(g.id) === t.value"
                              (click)="selectGroupTier(g.id, t.value)">
                        {{ t.medal }} {{ t.value }}
                      </button>
                    }
                  </div>

                  <!-- Table or loading -->
                  @if (loadingLeaderboard()) {
                    <div class="lb-loading"><mat-spinner diameter="28" /></div>
                  } @else if (!leaderboard() || leaderboard()!.entries.length === 0) {
                    <div class="lb-empty">
                      <span>No {{ getGroupTier(g.id) }} submissions yet in this group.</span>
                    </div>
                  } @else {
                    <table class="lb-table">
                      <thead>
                        <tr>
                          <th class="th-rank">Rank</th>
                          <th class="th-player">Player</th>
                          <th class="th-pts">Points</th>
                          <th class="th-view"></th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (e of leaderboard()!.entries; track e.userId) {
                          <tr [class.lb-my-row]="e.userId === currentUserId">
                            <td class="td-rank">
                              @if (e.rank === 1) { <span>🥇</span> }
                              @else if (e.rank === 2) { <span>🥈</span> }
                              @else if (e.rank === 3) { <span>🥉</span> }
                              @else { <span class="rank-num">#{{ e.rank }}</span> }
                            </td>
                            <td class="td-player">
                              <div class="player-row">
                                <div class="player-avatar">{{ initials(e.name) }}</div>
                                <span>{{ e.name }}</span>
                                @if (e.userId === currentUserId) {
                                  <span class="you-tag">You</span>
                                }
                              </div>
                            </td>
                            <td class="td-pts">
                              <span class="pts-badge" [class.pts-leader]="e.rank === 1">
                                {{ e.totalPoints }}
                              </span>
                            </td>
                            <td class="td-view">
                              @if (e.shareToken) {
                                <a class="view-bracket-link" [routerLink]="['/share/bracket', e.shareToken]" target="_blank">View Bracket →</a>
                              }
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  }
                </div>
              }

            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    /* ── Page header ─────────────────────────────────────────────── */
    .page-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 24px;
    }
    .page-header h2 { margin: 0 0 4px; font-size: 1.6rem; font-weight: 800; color: #1a237e; }
    .subtitle { margin: 0; color: #888; font-size: 0.88rem; }

    /* ── Create / Join cards ─────────────────────────────────────── */
    .action-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 32px;
    }
    @media (max-width: 700px) { .action-row { grid-template-columns: 1fr; } }

    .action-card {
      background: white;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 2px 16px rgba(0,0,0,0.08);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .ac-icon { font-size: 1.8rem; }
    .ac-title { font-size: 1rem; font-weight: 800; color: #1a237e; }
    .ac-sub   { font-size: 0.82rem; color: #888; }
    .ac-input {
      width: 100%; box-sizing: border-box;
      padding: 11px 14px; font-size: 0.9rem;
      border: 2px solid #e0e0e0; border-radius: 10px; outline: none;
      transition: border-color 0.15s;
      margin-top: 4px;
    }
    .ac-input:focus { border-color: #1a237e; }
    .ac-code { text-transform: uppercase; letter-spacing: 0.12em; font-family: monospace; font-size: 1rem; }
    .ac-btn {
      padding: 11px 0; border: none; border-radius: 10px;
      font-size: 0.9rem; font-weight: 700; cursor: pointer;
      transition: all 0.18s; margin-top: 4px;
    }
    .ac-btn:disabled { opacity: 0.5; cursor: default; transform: none !important; }
    .ac-btn-create {
      background: linear-gradient(135deg, #1a237e, #3949ab);
      color: white; box-shadow: 0 3px 10px rgba(26,35,126,0.3);
    }
    .ac-btn-create:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(26,35,126,0.4); }
    .ac-btn-join {
      background: linear-gradient(135deg, #1b5e20, #388e3c);
      color: white; box-shadow: 0 3px 10px rgba(27,94,32,0.3);
    }
    .ac-btn-join:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(27,94,32,0.4); }

    /* ── Section header ──────────────────────────────────────────── */
    .section-header {
      display: flex; align-items: center; gap: 10px; margin-bottom: 16px;
    }
    .section-title { font-size: 1.1rem; font-weight: 800; color: #1a237e; }
    .section-count {
      background: #e8eaf6; color: #1a237e;
      font-size: 0.75rem; font-weight: 700;
      border-radius: 12px; padding: 2px 9px;
    }

    .center-spin { display: flex; justify-content: center; padding: 32px; }

    .empty-state {
      background: white; border-radius: 16px; padding: 48px 24px;
      text-align: center; box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    }
    .es-icon { font-size: 3rem; margin-bottom: 12px; }
    .es-msg  { font-size: 1rem; font-weight: 600; color: #555; margin-bottom: 4px; }
    .es-hint { font-size: 0.82rem; color: #bbb; }

    /* ── Group cards ─────────────────────────────────────────────── */
    .groups-list { display: flex; flex-direction: column; gap: 14px; }

    .group-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 2px 16px rgba(0,0,0,0.08);
      overflow: hidden;
      transition: box-shadow 0.2s;
    }
    .group-card:hover { box-shadow: 0 4px 24px rgba(0,0,0,0.12); }

    /* Card header */
    .gc-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 18px 20px; gap: 14px;
    }
    .gc-left { display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0; }
    .gc-avatar {
      width: 46px; height: 46px; border-radius: 14px;
      background: linear-gradient(135deg, #1a237e, #3949ab);
      color: white; display: flex; align-items: center; justify-content: center;
      font-size: 0.9rem; font-weight: 800; flex-shrink: 0;
    }
    .gc-info { min-width: 0; }
    .gc-name {
      display: block; font-size: 1rem; font-weight: 700; color: #222;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .gc-meta { display: flex; align-items: center; gap: 7px; margin-top: 3px; }
    .gc-members { font-size: 0.78rem; color: #888; }
    .owner-badge {
      font-size: 0.62rem; font-weight: 700; background: #e8eaf6; color: #1a237e;
      border-radius: 8px; padding: 2px 7px;
    }
    .member-badge {
      font-size: 0.62rem; font-weight: 700; background: #f5f5f5; color: #888;
      border-radius: 8px; padding: 2px 7px;
    }

    .gc-right { flex-shrink: 0; }

    .invite-pill {
      display: flex; align-items: center; gap: 5px;
      background: #e8eaf6; border-radius: 10px; padding: 6px 10px;
    }
    .ip-label { font-size: 0.6rem; font-weight: 700; color: #9fa8da; text-transform: uppercase; letter-spacing: 0.08em; }
    .ip-code  { font-family: monospace; font-size: 0.95rem; font-weight: 800; color: #1a237e; letter-spacing: 0.1em; }
    .ip-copy  {
      border: none; background: none; cursor: pointer;
      font-size: 0.85rem; line-height: 1; padding: 0 2px;
      opacity: 0.6; transition: opacity 0.15s;
    }
    .ip-copy:hover { opacity: 1; }

    /* Card footer */
    .gc-footer {
      display: flex; gap: 8px; padding: 0 20px 16px; flex-wrap: wrap;
    }
    .gf-btn {
      padding: 8px 16px; border-radius: 20px; border: 2px solid transparent;
      font-size: 0.8rem; font-weight: 700; cursor: pointer;
      transition: all 0.16s; white-space: nowrap;
    }
    .gf-lb {
      background: white; color: #1a237e; border-color: #1a237e;
    }
    .gf-lb:hover, .gf-lb-active {
      background: #1a237e; color: white;
    }
    .gf-danger {
      background: white; color: #c62828; border-color: #ef9a9a;
    }
    .gf-danger:hover { background: #fce4ec; border-color: #c62828; }

    /* ── Leaderboard panel ───────────────────────────────────────── */
    .lb-panel {
      border-top: 1px solid #f0f0f0;
      animation: lbFadeIn 0.2s ease;
    }
    @keyframes lbFadeIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }

    /* Tier tabs */
    .lb-tier-tabs {
      display: flex; gap: 0; border-bottom: 1px solid #f0f0f0;
      padding: 0 20px;
      background: #fafafa;
    }
    .ltt-btn {
      padding: 10px 16px; border: none; background: none;
      font-size: 0.82rem; font-weight: 700; color: #aaa;
      cursor: pointer; border-bottom: 2px solid transparent;
      transition: all 0.15s; margin-bottom: -1px;
    }
    .ltt-btn:hover { color: #1a237e; }
    .ltt-btn.ltt-active {
      color: #1a237e; border-bottom-color: #1a237e;
    }

    .lb-loading { display: flex; justify-content: center; padding: 24px; }
    .lb-empty {
      padding: 24px 20px; text-align: center;
      font-size: 0.84rem; color: #bbb; font-style: italic;
    }

    /* Table */
    .lb-table { width: 100%; border-collapse: collapse; }
    .lb-table th {
      padding: 8px 16px; font-size: 0.68rem; font-weight: 700;
      color: #bbb; text-transform: uppercase; letter-spacing: 0.08em;
      text-align: left; border-bottom: 1px solid #f5f5f5;
      background: #fafafa;
    }
    .lb-table td { padding: 10px 16px; border-bottom: 1px solid #f8f8f8; }
    .lb-table tr:last-child td { border-bottom: none; }
    .lb-my-row td { background: #e8f5e9 !important; }

    .th-rank { width: 50px; text-align: center; }
    .th-pts  { width: 70px; text-align: right; }
    .th-view { width: 110px; text-align: right; }
    .td-view { text-align: right; }
    .view-bracket-link {
      font-size: 0.78rem; font-weight: 600;
      color: #1a237e; text-decoration: none;
      white-space: nowrap;
    }
    .view-bracket-link:hover { text-decoration: underline; }
    .td-rank { text-align: center; font-size: 1.1rem; }
    .td-pts  { text-align: right; }
    .rank-num { font-size: 0.85rem; font-weight: 600; color: #aaa; }

    .player-row { display: flex; align-items: center; gap: 9px; }
    .player-avatar {
      width: 30px; height: 30px; border-radius: 50%;
      background: #1a237e; color: white;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.68rem; font-weight: 700; flex-shrink: 0;
    }
    .you-tag {
      font-size: 0.62rem; background: #e3f2fd; color: #1565c0;
      border-radius: 8px; padding: 1px 6px; font-weight: 600;
    }
    .pts-badge {
      display: inline-block; padding: 3px 10px; border-radius: 12px;
      background: #f5f5f5; font-size: 0.88rem; font-weight: 700; color: #333;
    }
    .pts-leader { background: #fff9c4; color: #f57f17; }

    /* ── Mobile fixes ───────────────────────────────────────────── */
    @media (max-width: 480px) {
      .gc-header { flex-wrap: wrap; gap: 10px; }
      .gc-right { width: 100%; }
      .invite-pill { justify-content: space-between; }
      .ip-label { display: none; }
      .ltt-btn { padding: 10px 10px; font-size: 0.78rem; }
      .gc-footer { padding: 0 14px 14px; }
      .gc-avatar { width: 38px; height: 38px; border-radius: 10px; }
      .th-pts { width: 54px; }
    }
  `],
})
export class GroupsComponent implements OnInit {
  private readonly groupsService = inject(GroupsService);
  private readonly auth = inject(AuthService);
  private readonly snack = inject(MatSnackBar);

  groups = signal<MyGroup[]>([]);
  loadingGroups      = signal(true);
  loadingLeaderboard = signal(false);
  creating = signal(false);
  joining  = signal(false);
  expandedGroupId = signal<number | null>(null);
  leaderboard = signal<GroupLeaderboard | null>(null);

  /** Tracks selected tier per group id */
  private groupTiers: Record<number, Tier> = {};

  newGroupName = '';
  joinCode = '';

  readonly tiers: { value: Tier; medal: string }[] = [
    { value: 'Gold',   medal: '🥇' },
    { value: 'Silver', medal: '🥈' },
    { value: 'Bronze', medal: '🥉' },
  ];

  get currentUserId(): number {
    return this.auth.currentUser()?.id ?? -1;
  }

  ngOnInit(): void {
    this.loadGroups();
  }

  getGroupTier(groupId: number): Tier {
    return this.groupTiers[groupId] ?? 'Gold';
  }

  selectGroupTier(groupId: number, tier: Tier): void {
    if (this.groupTiers[groupId] === tier) return;
    this.groupTiers[groupId] = tier;
    this.fetchLeaderboard(groupId, tier);
  }

  loadGroups(): void {
    this.loadingGroups.set(true);
    this.groupsService.getMyGroups().subscribe({
      next: (gs) => { this.groups.set(gs); this.loadingGroups.set(false); },
      error: () => this.loadingGroups.set(false),
    });
  }

  createGroup(): void {
    const name = this.newGroupName.trim();
    if (!name) return;
    this.creating.set(true);
    this.groupsService.createGroup(name).subscribe({
      next: (g) => {
        this.creating.set(false);
        this.newGroupName = '';
        this.groups.update(gs => [g as MyGroup, ...gs]);
        this.snack.open(`Group "${g.name}" created! Code: ${g.inviteCode}`, undefined, { duration: 5000 });
      },
      error: (e) => {
        this.creating.set(false);
        this.snack.open(e?.error?.message ?? 'Create failed', 'OK', { duration: 5000 });
      },
    });
  }

  joinGroup(): void {
    const code = this.joinCode.trim().toUpperCase();
    if (!code) return;
    this.joining.set(true);
    this.groupsService.joinGroup(code).subscribe({
      next: (g) => {
        this.joining.set(false);
        this.joinCode = '';
        this.loadGroups();
        this.snack.open(`Joined "${g.name}"!`, undefined, { duration: 4000 });
      },
      error: (e) => {
        this.joining.set(false);
        this.snack.open(e?.error?.message ?? 'Invalid invite code', 'OK', { duration: 5000 });
      },
    });
  }

  toggleLeaderboard(groupId: number): void {
    if (this.expandedGroupId() === groupId) {
      this.expandedGroupId.set(null);
      return;
    }
    this.expandedGroupId.set(groupId);
    this.leaderboard.set(null);
    this.fetchLeaderboard(groupId, this.getGroupTier(groupId));
  }

  private fetchLeaderboard(groupId: number, tier: Tier): void {
    this.loadingLeaderboard.set(true);
    this.groupsService.getLeaderboard(groupId, tier).subscribe({
      next: (lb) => { this.leaderboard.set(lb); this.loadingLeaderboard.set(false); },
      error: () => this.loadingLeaderboard.set(false),
    });
  }

  leaveGroup(g: MyGroup): void {
    if (!confirm(`Leave "${g.name}"?`)) return;
    this.groupsService.leaveGroup(g.id).subscribe({
      next: () => {
        this.groups.update(gs => gs.filter(x => x.id !== g.id));
        if (this.expandedGroupId() === g.id) this.expandedGroupId.set(null);
        this.snack.open(`Left "${g.name}"`, undefined, { duration: 3000 });
      },
      error: (e) => this.snack.open(e?.error?.message ?? 'Failed', 'OK', { duration: 4000 }),
    });
  }

  deleteGroup(g: MyGroup): void {
    if (!confirm(`Delete "${g.name}"? All members will lose access.`)) return;
    this.groupsService.deleteGroup(g.id).subscribe({
      next: () => {
        this.groups.update(gs => gs.filter(x => x.id !== g.id));
        if (this.expandedGroupId() === g.id) this.expandedGroupId.set(null);
        this.snack.open(`"${g.name}" deleted`, undefined, { duration: 3000 });
      },
      error: (e) => this.snack.open(e?.error?.message ?? 'Failed', 'OK', { duration: 4000 }),
    });
  }

  copyCode(code: string): void {
    navigator.clipboard.writeText(code).then(() =>
      this.snack.open(`Code ${code} copied!`, undefined, { duration: 2500 })
    );
  }

  initials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
}
