import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { AdminService, GiveawayEntry } from '../../core/services/admin.service';

interface AdminGiveaway {
  id: number;
  prize: string;
  status: string;
  entryCount: number;
  isLuckyDraw: boolean;
  isActive: boolean;
  createdAt: string;
  match: {
    id: number;
    homeTeam: string | null;
    homeTeamFlag: string | null;
    awayTeam: string | null;
    awayTeamFlag: string | null;
    matchDate: string | null;
    status: string;
  };
  winnerName: string | null;
}

interface AdminGroup {
  id: number;
  name: string;
  actualFirstTeamId: number | null;
  actualSecondTeamId: number | null;
  teams: { id: number; name: string; flagUrl: string }[];
}

interface AdminMatch {
  id: number;
  slotNumber: number | null;
  round: string;
  homeTeamId: number | null;
  homeTeamName: string | null;
  awayTeamId: number | null;
  awayTeamName: string | null;
  winnerTeamId: number | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
}

interface GroupStageMatch {
  id: number;
  groupName: string;
  homeTeamId: number | null;
  homeTeamName: string;
  homeTeamFlag: string;
  awayTeamId: number | null;
  awayTeamName: string;
  awayTeamFlag: string;
  matchDate: string | null;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
}

interface GiveawayMatchOption {
  id: number;
  label: string;
  homeTeamId: number | null;
  homeTeamName: string | null;
  awayTeamId: number | null;
  awayTeamName: string | null;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule, MatButtonModule, MatSelectModule, MatFormFieldModule,
    MatInputModule, MatChipsModule, MatIconModule, MatProgressSpinnerModule,
    MatDividerModule, MatBadgeModule, MatTabsModule, MatTooltipModule,
  ],
  template: `
    <div class="admin-header">
      <h2>⚙️ Admin Dashboard</h2>
      <p class="subtitle">Manage tournament results, standings, and settings</p>
    </div>

    @if (loading()) {
      <div class="center-spin"><mat-spinner diameter="48" /></div>
    } @else {
      <mat-tab-group animationDuration="200ms" class="admin-tabs" [selectedIndex]="selectedTabIndex()" (selectedIndexChange)="onTabChange($event)">

        <!-- ═══ TAB 1: QUICK ACTIONS ═══════════════════════════════════════ -->
        <mat-tab label="Quick Actions">
          <div class="tab-content">
            <div class="actions-grid">

              <mat-card class="action-card">
                <mat-card-header>
                  <mat-card-title>🔄 Sync ESPN Results</mat-card-title>
                  <mat-card-subtitle>Pull latest match scores from ESPN (free)</mat-card-subtitle>
                </mat-card-header>
                <mat-card-actions>
                  <button mat-raised-button color="primary"
                          [disabled]="busy['sync'] || busy['syncAll']"
                          (click)="syncEspn()">
                    {{ busy['sync'] ? 'Syncing…' : 'Sync Last 3 Days' }}
                  </button>
                  <button mat-stroked-button color="primary"
                          [disabled]="busy['sync'] || busy['syncAll']"
                          (click)="syncEspnAll()"
                          style="margin-left:8px">
                    {{ busy['syncAll'] ? 'Syncing…' : 'Sync Full History' }}
                  </button>
                </mat-card-actions>
              </mat-card>

              <mat-card class="action-card">
                <mat-card-header>
                  <mat-card-title>📊 Recalculate Scores</mat-card-title>
                  <mat-card-subtitle>Recompute all user bracket scores</mat-card-subtitle>
                </mat-card-header>
                <mat-card-actions>
                  <button mat-raised-button color="accent"
                          [disabled]="busy['calc']"
                          (click)="recalculate()">
                    {{ busy['calc'] ? 'Calculating…' : 'Recalculate' }}
                  </button>
                </mat-card-actions>
              </mat-card>

              <mat-card class="action-card danger-card">
                <mat-card-header>
                  <mat-card-title>🔒 Lock All Brackets</mat-card-title>
                  <mat-card-subtitle>Prevent further edits to all user brackets</mat-card-subtitle>
                </mat-card-header>
                <mat-card-actions>
                  <button mat-raised-button color="warn"
                          [disabled]="busy['lock']"
                          (click)="lockBrackets()">
                    {{ busy['lock'] ? 'Locking…' : 'Lock Brackets' }}
                  </button>
                </mat-card-actions>
              </mat-card>

            </div>
          </div>
        </mat-tab>

        <!-- ═══ TAB 2: GROUP STANDINGS ══════════════════════════════════════ -->
        <mat-tab label="Group Standings">
          <div class="tab-content">
            <p class="section-hint">Set the actual 1st and 2nd place finishers for each group.</p>
            <div class="groups-grid">
              @for (g of groups(); track g.id) {
                <mat-card class="group-card">
                  <mat-card-header>
                    <mat-card-title>Group {{ g.name }}</mat-card-title>
                    @if (g.actualFirstTeamId && g.actualSecondTeamId) {
                      <span class="done-badge">✓ Set</span>
                    }
                  </mat-card-header>
                  <mat-card-content>
                    <div class="standing-row">
                      <span class="standing-label">🥇 1st Place</span>
                      <mat-form-field appearance="outline" class="standing-select">
                        <mat-select [(ngModel)]="g.actualFirstTeamId" placeholder="Select team">
                          <mat-option [value]="null">— not set —</mat-option>
                          @for (t of g.teams; track t.id) {
                            <mat-option [value]="t.id">
                              <img [src]="t.flagUrl" class="opt-flag" />
                              {{ t.name }}
                            </mat-option>
                          }
                        </mat-select>
                      </mat-form-field>
                    </div>
                    <div class="standing-row">
                      <span class="standing-label">🥈 2nd Place</span>
                      <mat-form-field appearance="outline" class="standing-select">
                        <mat-select [(ngModel)]="g.actualSecondTeamId" placeholder="Select team">
                          <mat-option [value]="null">— not set —</mat-option>
                          @for (t of g.teams; track t.id) {
                            <mat-option [value]="t.id">
                              <img [src]="t.flagUrl" class="opt-flag" />
                              {{ t.name }}
                            </mat-option>
                          }
                        </mat-select>
                      </mat-form-field>
                    </div>
                  </mat-card-content>
                  <mat-card-actions align="end">
                    <button mat-raised-button color="primary"
                            [disabled]="busy['group_' + g.id]"
                            (click)="saveGroupStandings(g)">
                      {{ busy['group_' + g.id] ? 'Saving…' : 'Save' }}
                    </button>
                  </mat-card-actions>
                </mat-card>
              }
            </div>
          </div>
        </mat-tab>

        <!-- ═══ TAB 3: BEST 3RD QUALIFIERS ══════════════════════════════════ -->
        <mat-tab label="Best 3rd Qualifiers">
          <div class="tab-content">
            <p class="section-hint">
              Select exactly 8 teams that qualified as best 3rd-place finishers.
              <strong>{{ selectedBest3rd().length }}/8 selected.</strong>
            </p>

            <div class="best3rd-groups">
              @for (g of groups(); track g.id) {
                <div class="b3-group">
                  <div class="b3-group-label">Group {{ g.name }}</div>
                  <div class="b3-teams">
                    @for (t of g.teams; track t.id) {
                      @if (t.id !== g.actualFirstTeamId && t.id !== g.actualSecondTeamId) {
                        <button class="b3-chip"
                                [class.b3-chip-selected]="isBest3rdSelected(t.id)"
                                [disabled]="selectedBest3rd().length >= 8 && !isBest3rdSelected(t.id)"
                                (click)="toggleBest3rd(t.id)">
                          <img [src]="t.flagUrl" class="chip-flag" />
                          {{ t.name }}
                          @if (isBest3rdSelected(t.id)) {
                            <span class="chip-rank">
                              #{{ selectedBest3rd().indexOf(t.id) + 1 }}
                            </span>
                          }
                        </button>
                      }
                    }
                  </div>
                </div>
              }
            </div>

            <div class="best3rd-footer">
              @if (selectedBest3rd().length > 0) {
                <div class="selected-order">
                  <strong>Selected order:</strong>
                  @for (teamId of selectedBest3rd(); track teamId; let i = $index) {
                    <span class="order-chip">
                      <span class="order-num">{{ i + 1 }}</span>
                      <img [src]="teamFlagUrl(teamId)" class="chip-flag" />
                      {{ teamName(teamId) }}
                    </span>
                  }
                </div>
              }
              <button mat-raised-button color="primary"
                      [disabled]="selectedBest3rd().length !== 8 || busy['best3rd']"
                      (click)="saveBest3rd()">
                {{ busy['best3rd'] ? 'Saving…' : 'Save Best 3rd Qualifiers' }}
              </button>
            </div>
          </div>
        </mat-tab>

        <!-- ═══ TAB 4: MATCH RESULTS ═════════════════════════════════════════ -->
        <mat-tab label="Match Results">
          <div class="tab-content">
            <p class="section-hint">Enter scores for completed knockout matches.</p>

            @for (roundName of roundOrder; track roundName) {
              @if ((matchesByRound()[roundName] || []).length > 0) {
                <div class="round-section">
                  <div class="round-header">{{ roundLabel(roundName) }}</div>
                  <div class="match-cards">
                    @for (m of matchesByRound()[roundName]; track m.id) {
                      <mat-card class="match-card"
                                [class.match-completed]="m.status === 'Completed'">
                        <mat-card-header>
                          <mat-card-title class="match-title">
                            <span class="slot-badge">Slot {{ m.slotNumber }}</span>
                            @if (m.status === 'Completed') {
                              <span class="status-completed">✓ Completed</span>
                            }
                          </mat-card-title>
                        </mat-card-header>
                        <mat-card-content>
                          <div class="score-row">
                            <div class="team-col">
                              @if (m.homeTeamName) {
                                <strong>{{ m.homeTeamName }}</strong>
                              } @else {
                                <span class="tbd">TBD</span>
                              }
                            </div>
                            <div class="score-col">
                              <mat-form-field appearance="outline" class="score-input">
                                <input matInput type="number" min="0" max="20"
                                       [(ngModel)]="m.homeScore" placeholder="0" />
                              </mat-form-field>
                              <span class="vs">—</span>
                              <mat-form-field appearance="outline" class="score-input">
                                <input matInput type="number" min="0" max="20"
                                       [(ngModel)]="m.awayScore" placeholder="0" />
                              </mat-form-field>
                            </div>
                            <div class="team-col right">
                              @if (m.awayTeamName) {
                                <strong>{{ m.awayTeamName }}</strong>
                              } @else {
                                <span class="tbd">TBD</span>
                              }
                            </div>
                          </div>
                          <div class="winner-row">
                            <mat-form-field appearance="outline" class="winner-select">
                              <mat-label>Winner (ties/pens)</mat-label>
                              <mat-select [(ngModel)]="m.winnerTeamId">
                                <mat-option [value]="null">— auto from score —</mat-option>
                                @if (m.homeTeamId) {
                                  <mat-option [value]="m.homeTeamId">
                                    {{ m.homeTeamName }}
                                  </mat-option>
                                }
                                @if (m.awayTeamId) {
                                  <mat-option [value]="m.awayTeamId">
                                    {{ m.awayTeamName }}
                                  </mat-option>
                                }
                              </mat-select>
                            </mat-form-field>
                            <button mat-raised-button color="primary"
                                    [disabled]="busy['match_' + m.id]"
                                    (click)="saveMatchResult(m)">
                              {{ busy['match_' + m.id] ? 'Saving…' : 'Save' }}
                            </button>
                          </div>
                        </mat-card-content>
                      </mat-card>
                    }
                  </div>
                </div>
              }
            }

            @if (!matches().length) {
              <div class="no-matches">
                No knockout matches loaded yet.
              </div>
            }
          </div>
        </mat-tab>

        <!-- ═══ TAB 5: GROUP STAGE SCHEDULE ════════════════════════════════════ -->
        <mat-tab label="Group Schedule">
          <div class="tab-content">
            <p class="section-hint">All 72 group stage matches — kickoff times shown in your local timezone.</p>

            @for (groupName of groupOrder; track groupName) {
              @if ((groupStageByGroup()[groupName] || []).length > 0) {
                <div class="gs-group-section">
                  <div class="gs-group-header">Group {{ groupName }}</div>
                  <div class="gs-match-list">
                    @for (m of groupStageByGroup()[groupName]; track m.id) {
                      <div class="gs-match-row" [class.gs-completed]="m.status === 'Completed'">
                        <div class="gs-time">
                          @if (m.matchDate) {
                            <span class="gs-date">{{ formatMatchDate(m.matchDate) }}</span>
                            <span class="gs-kickoff">{{ formatMatchTime(m.matchDate) }}</span>
                          } @else {
                            <span class="gs-tbd">TBD</span>
                          }
                        </div>
                        <div class="gs-teams">
                          <span class="gs-team">
                            <img [src]="m.homeTeamFlag" class="gs-flag" />
                            {{ m.homeTeamName }}
                          </span>
                          <span class="gs-score">
                            @if (m.status === 'Completed') {
                              <strong>{{ m.homeScore }} – {{ m.awayScore }}</strong>
                            } @else {
                              <span class="gs-vs">vs</span>
                            }
                          </span>
                          <span class="gs-team gs-team-away">
                            {{ m.awayTeamName }}
                            <img [src]="m.awayTeamFlag" class="gs-flag" />
                          </span>
                        </div>
                        <div class="gs-status">
                          @if (m.status === 'Completed') {
                            <span class="gs-badge gs-badge-done">✓ FT</span>
                          } @else if (isMatchSoon(m.matchDate)) {
                            <span class="gs-badge gs-badge-soon">Soon</span>
                          } @else {
                            <span class="gs-badge gs-badge-sched">Scheduled</span>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            }
          </div>
        </mat-tab>

        <!-- ═══ TAB 6: GIVEAWAY ══════════════════════════════════════════════ -->
        <mat-tab label="🎁 Giveaway">
          <div class="tab-content">

            <!-- Create form (always available) -->
            <mat-card class="giveaway-create-card">
              <mat-card-header>
                <mat-card-title>Create New Draw</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <div class="giveaway-form">
                  <mat-form-field appearance="outline" class="gw-field">
                    <mat-label>Match</mat-label>
                    <mat-select [(ngModel)]="newGiveawayMatchId">
                      @for (m of giveawayMatches(); track m.id) {
                        <mat-option [value]="m.id">{{ m.label }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="gw-field">
                    <mat-label>Prize description</mat-label>
                    <input matInput [(ngModel)]="newGiveawayPrize" placeholder="e.g. Nike jersey + signed ball" />
                  </mat-form-field>
                </div>
              </mat-card-content>
              <mat-card-actions>
                <button mat-raised-button color="primary"
                        [disabled]="!newGiveawayMatchId || !newGiveawayPrize || busy['gw_create']"
                        (click)="createGiveaway()">
                  {{ busy['gw_create'] ? 'Creating…' : 'Create Draw' }}
                </button>
              </mat-card-actions>
            </mat-card>

            <!-- All open/closed draws -->
            @if (openDraws().length > 0) {
              <div class="open-draws-section">
                <div class="open-draws-header">Draws ({{ openDraws().length }})</div>
                @for (g of openDraws(); track g.id) {
                  <mat-card class="draw-card" [class.draw-card-active]="g.isActive">
                    <mat-card-header>
                      <mat-card-title>
                        {{ g.match.homeTeam ?? 'TBD' }} vs {{ g.match.awayTeam ?? 'TBD' }}
                        <span class="gw-status-badge" [class]="'gw-status-' + g.status.toLowerCase()">
                          {{ g.status }}
                        </span>
                        @if (g.isActive) {
                          <span class="active-public-badge">🟢 Shown publicly</span>
                        }
                      </mat-card-title>
                      <mat-card-subtitle>{{ g.prize }} · {{ g.entryCount }} entries</mat-card-subtitle>
                    </mat-card-header>

                    @if (entriesDrawId() === g.id && giveawayEntries().length > 0) {
                      <mat-card-content>
                        <div class="gw-entries-table-wrap">
                          <table class="gw-entries-table">
                            <thead>
                              <tr><th>#</th><th>User</th><th>Prediction</th><th>Submitted</th><th></th></tr>
                            </thead>
                            <tbody>
                              @for (e of giveawayEntries(); track e.id; let i = $index) {
                                <tr [class.gw-entry-correct]="e.isCorrect">
                                  <td class="gw-entry-num">{{ i + 1 }}</td>
                                  <td class="gw-entry-user">{{ e.userName }}</td>
                                  <td class="gw-entry-score">{{ e.homeScore }} – {{ e.awayScore }}</td>
                                  <td class="gw-entry-time">{{ formatEntryTime(e.submittedAt) }}</td>
                                  <td>@if (e.isCorrect) { <span class="gw-correct-badge">✓</span> }</td>
                                </tr>
                              }
                            </tbody>
                          </table>
                        </div>
                      </mat-card-content>
                    }

                    <mat-card-actions>
                      @if (g.isActive) {
                        <button mat-raised-button color="primary"
                                [disabled]="busy['gw_toggle_' + g.id]"
                                (click)="toggleGiveawayActive(g.id)"
                                matTooltip="Deactivate this draw">
                          {{ busy['gw_toggle_' + g.id] ? 'Deactivating…' : '🟢 Active' }}
                        </button>
                      } @else {
                        <button mat-stroked-button
                                [disabled]="busy['gw_toggle_' + g.id]"
                                (click)="toggleGiveawayActive(g.id)"
                                matTooltip="Activate this draw">
                          {{ busy['gw_toggle_' + g.id] ? 'Activating…' : 'Inactive' }}
                        </button>
                      }
                      @if (g.entryCount > 0) {
                        <button mat-stroked-button (click)="toggleEntries(g.id)">
                          {{ entriesDrawId() === g.id ? 'Hide Entries' : 'Entries (' + g.entryCount + ')' }}
                        </button>
                      }
                      @if (g.status === 'Open') {
                        <button mat-stroked-button color="primary"
                                [disabled]="busy['gw_notify_' + g.id]"
                                (click)="notifyGiveaway(g.id)"
                                matTooltip="Send email notification to all registered users">
                          {{ busy['gw_notify_' + g.id] ? '📧 Sending…' : '📧 Notify Users' }}
                        </button>
                        <button mat-raised-button color="warn"
                                [disabled]="busy['gw_close_' + g.id]"
                                (click)="closeGiveaway(g.id)">
                          {{ busy['gw_close_' + g.id] ? 'Closing…' : 'Close Entries' }}
                        </button>
                      }
                      @if (g.status === 'Closed') {
                        <button mat-raised-button color="primary"
                                [disabled]="busy['gw_draw_' + g.id] || busy['gw_lucky_' + g.id] || g.match.status !== 'Completed'"
                                (click)="drawGiveaway(g.id)"
                                matTooltip="Draw from correct predictions only (match must be FT)">
                          {{ busy['gw_draw_' + g.id] ? 'Drawing…' : '🎯 Correct Picks Draw' }}
                        </button>
                        <button mat-stroked-button color="primary"
                                [disabled]="busy['gw_draw_' + g.id] || busy['gw_lucky_' + g.id]"
                                (click)="luckyDraw(g.id)"
                                matTooltip="Pick a random winner from all entries">
                          {{ busy['gw_lucky_' + g.id] ? 'Drawing…' : '🍀 Lucky Draw' }}
                        </button>
                      }
                      <button mat-stroked-button color="warn"
                              [disabled]="busy['gw_delete_' + g.id]"
                              (click)="deleteGiveaway(g.id)"
                              style="margin-left: auto">
                        {{ busy['gw_delete_' + g.id] ? 'Deleting…' : 'Delete' }}
                      </button>
                    </mat-card-actions>
                  </mat-card>
                }
              </div>
            }

            <!-- Past draws history -->
            @if (pastGiveaways().length > 0) {
              <div class="past-draws-section">
                <div class="past-draws-header">Past Draws</div>
                <div class="past-draws-list">
                  @for (g of pastGiveaways(); track g.id) {
                    <div class="past-draw-item">
                      <div class="past-draw-row">
                        <div class="pd-match">{{ g.match.homeTeam ?? 'TBD' }} vs {{ g.match.awayTeam ?? 'TBD' }}</div>
                        <div class="pd-prize">{{ g.prize }}</div>
                        <div class="pd-winner">
                          🏆 <strong>{{ g.winnerName }}</strong>
                          @if (g.isLuckyDraw) { <span class="lucky-tag">Lucky</span> }
                        </div>
                        <div class="pd-entries-count">{{ g.entryCount }} entries</div>
                        <button mat-stroked-button class="pd-view-btn"
                                (click)="toggleEntries(g.id)">
                          {{ entriesDrawId() === g.id ? 'Hide' : 'View Predictions' }}
                        </button>
                      </div>

                      @if (entriesDrawId() === g.id) {
                        <div class="pd-entries-wrap">
                          @if (giveawayEntries().length === 0) {
                            <div class="pd-no-entries">No predictions recorded.</div>
                          } @else {
                            <table class="gw-entries-table">
                              <thead>
                                <tr><th>#</th><th>User</th><th>Prediction</th><th>Submitted</th><th></th></tr>
                              </thead>
                              <tbody>
                                @for (e of giveawayEntries(); track e.id; let i = $index) {
                                  <tr [class.gw-entry-correct]="e.isCorrect">
                                    <td class="gw-entry-num">{{ i + 1 }}</td>
                                    <td class="gw-entry-user">{{ e.userName }}</td>
                                    <td class="gw-entry-score">{{ e.homeScore }} – {{ e.awayScore }}</td>
                                    <td class="gw-entry-time">{{ formatEntryTime(e.submittedAt) }}</td>
                                    <td>@if (e.isCorrect) { <span class="gw-correct-badge">✓</span> }</td>
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
              </div>
            }

          </div>
        </mat-tab>

      </mat-tab-group>
    }
  `,
  styles: [`
    .admin-header { margin-bottom: 24px; }
    .admin-header h2 { margin: 0 0 4px; font-size: 1.6rem; }
    .subtitle { margin: 0; opacity: 0.65; font-size: 0.9rem; }
    .center-spin { display: flex; justify-content: center; padding: 60px; }
    .tab-content { padding: 20px 0; }
    .section-hint { margin: 0 0 16px; opacity: 0.7; font-size: 0.88rem; }

    /* Quick Actions */
    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 16px;
    }
    .action-card { padding-bottom: 8px; }
    .action-card mat-card-actions { padding: 0 16px 16px; }

    /* Group Standings */
    .groups-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }
    .group-card mat-card-header { position: relative; }
    .done-badge {
      position: absolute; right: 16px; top: 16px;
      background: #43a047; color: white;
      font-size: 0.7rem; padding: 2px 8px; border-radius: 12px; font-weight: 600;
    }
    .standing-row {
      display: flex; align-items: center; gap: 12px; margin-bottom: 8px;
    }
    .standing-label { width: 90px; font-size: 0.85rem; white-space: nowrap; }
    .standing-select { flex: 1; margin-bottom: -1.25em; }
    .opt-flag { width: 20px; height: 13px; margin-right: 6px; vertical-align: middle; border-radius: 2px; }

    /* Best 3rd */
    .best3rd-groups { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
    .b3-group { background: #f5f5f5; border-radius: 8px; padding: 12px 16px; }
    .b3-group-label { font-weight: 700; font-size: 0.85rem; margin-bottom: 8px; opacity: 0.8; }
    .b3-teams { display: flex; flex-wrap: wrap; gap: 8px; }
    .b3-chip {
      display: inline-flex; align-items: center; gap: 6px;
      background: white; border: 2px solid #ddd; border-radius: 20px;
      padding: 4px 12px; font-size: 0.82rem; cursor: pointer;
      transition: all 0.15s; white-space: nowrap;
    }
    .b3-chip:hover:not(:disabled) { border-color: #1565c0; background: #e3f2fd; }
    .b3-chip-selected { background: #1565c0 !important; color: white !important; border-color: #1565c0 !important; }
    .b3-chip:disabled:not(.b3-chip-selected) { opacity: 0.35; cursor: not-allowed; }
    .chip-flag { width: 18px; height: 12px; border-radius: 2px; }
    .chip-rank { font-weight: 700; font-size: 0.75rem; background: rgba(255,255,255,0.3); border-radius: 10px; padding: 0 5px; }
    .best3rd-footer { display: flex; flex-direction: column; gap: 12px; }
    .selected-order { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; font-size: 0.85rem; }
    .order-chip {
      display: inline-flex; align-items: center; gap: 4px;
      background: #e8f5e9; border: 1px solid #a5d6a7; border-radius: 16px;
      padding: 2px 8px; font-size: 0.8rem;
    }
    .order-num {
      background: #2e7d32; color: white;
      border-radius: 50%; width: 16px; height: 16px;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 0.65rem; font-weight: 700; flex-shrink: 0;
    }

    /* Match Results */
    .round-section { margin-bottom: 28px; }
    .round-header {
      font-size: 1rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.05em; color: #1565c0;
      border-bottom: 2px solid #1565c0;
      padding-bottom: 6px; margin-bottom: 12px;
    }
    .match-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 12px; }
    .match-card { }
    .match-card.match-completed { border-left: 4px solid #43a047; }
    .match-title { display: flex; align-items: center; gap: 10px; font-size: 0.85rem; }
    .slot-badge {
      background: #e3f2fd; color: #1565c0;
      border-radius: 4px; padding: 1px 6px; font-size: 0.75rem; font-weight: 600;
    }
    .status-completed { color: #43a047; font-size: 0.75rem; font-weight: 600; }
    .score-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .team-col { flex: 1; font-size: 0.85rem; }
    .team-col.right { text-align: right; }
    .tbd { opacity: 0.4; font-style: italic; }
    .score-col { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
    .score-input { width: 56px; }
    .score-input ::ng-deep .mat-mdc-text-field-wrapper { padding: 0 8px; }
    .score-input ::ng-deep input { text-align: center; }
    .vs { font-weight: 700; opacity: 0.4; }
    .winner-row { display: flex; align-items: center; gap: 8px; }
    .winner-select { flex: 1; margin-bottom: -1.25em; }
    .no-matches { text-align: center; padding: 40px; opacity: 0.5; }
    .admin-tabs { margin-top: 0; }

    /* Group Schedule */
    .gs-group-section { margin-bottom: 24px; }
    .gs-group-header {
      font-size: 0.95rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.06em; color: #6a1b9a;
      border-bottom: 2px solid #6a1b9a;
      padding-bottom: 5px; margin-bottom: 8px;
    }
    .gs-match-list { display: flex; flex-direction: column; gap: 4px; }
    .gs-match-row {
      display: flex; align-items: center; gap: 12px;
      padding: 8px 12px; border-radius: 6px;
      background: #f9f9f9; border: 1px solid #eee;
      font-size: 0.85rem;
    }
    .gs-match-row.gs-completed { background: #f1f8e9; border-color: #c8e6c9; }
    .gs-time { width: 110px; flex-shrink: 0; }
    .gs-date { display: block; font-size: 0.75rem; opacity: 0.6; }
    .gs-kickoff { font-weight: 600; font-size: 0.85rem; }
    .gs-tbd { opacity: 0.4; font-style: italic; }
    .gs-teams { flex: 1; display: flex; align-items: center; gap: 8px; }
    .gs-team { display: flex; align-items: center; gap: 5px; flex: 1; }
    .gs-team-away { justify-content: flex-end; flex-direction: row-reverse; }
    .gs-flag { width: 22px; height: 14px; border-radius: 2px; object-fit: cover; border: 1px solid #ddd; }
    .gs-score { width: 60px; text-align: center; flex-shrink: 0; font-size: 1rem; }
    .gs-vs { opacity: 0.35; font-size: 0.75rem; }
    .gs-status { width: 80px; text-align: right; flex-shrink: 0; }
    .gs-badge {
      font-size: 0.7rem; padding: 2px 7px; border-radius: 10px;
      font-weight: 600; display: inline-block;
    }
    .gs-badge-done { background: #c8e6c9; color: #2e7d32; }
    .gs-badge-soon { background: #fff3e0; color: #e65100; }
    .gs-badge-sched { background: #e3f2fd; color: #1565c0; }

    /* Giveaway tab */
    .giveaway-create-card { max-width: 520px; margin-bottom: 8px; }
    .giveaway-form { display: flex; flex-direction: column; gap: 4px; padding-top: 8px; }
    .gw-field { width: 100%; }
    .gw-status-badge {
      font-size: 0.72rem; font-weight: 700;
      padding: 2px 8px; border-radius: 10px;
      margin-left: 8px; vertical-align: middle;
    }
    .gw-status-open   { background: #e8f5e9; color: #2e7d32; }
    .gw-status-closed { background: #fce4ec; color: #c62828; }
    .gw-status-drawn  { background: #e3f2fd; color: #1565c0; }
    .gw-info-rows { display: flex; flex-direction: column; gap: 8px; padding-top: 8px; }
    .gw-info-row { display: flex; gap: 12px; align-items: center; }
    .gw-label { width: 60px; font-size: 0.82rem; opacity: 0.6; }
    .gw-value { font-weight: 600; }
    .gw-winner-chip {
      background: #fff8e1; border: 1px solid #ffe082;
      border-radius: 8px; padding: 8px 12px;
      font-size: 0.9rem; margin-top: 4px;
    }
    .lucky-tag {
      display: inline-block; font-size: 0.7rem; font-weight: 700;
      background: #e8f5e9; color: #2e7d32;
      padding: 1px 6px; border-radius: 8px; margin-left: 6px;
    }
    /* Open draws list */
    .open-draws-section { margin-top: 24px; }
    .open-draws-header {
      font-size: 0.85rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.06em; color: #444;
      border-bottom: 2px solid #eee; padding-bottom: 6px; margin-bottom: 12px;
    }
    .draw-card { max-width: 620px; margin-bottom: 12px; }
    .draw-card-active { border-left: 4px solid #43a047; }
    .active-public-badge {
      font-size: 0.7rem; font-weight: 700;
      background: #e8f5e9; color: #2e7d32;
      padding: 2px 8px; border-radius: 10px; margin-left: 8px; vertical-align: middle;
    }
    .draw-card mat-card-actions {
      display: flex; gap: 8px; padding: 8px 16px 16px; align-items: center; flex-wrap: wrap;
    }

    /* Past draws */
    .past-draws-section { margin-top: 28px; max-width: 720px; }
    .past-draws-header {
      font-size: 0.85rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.06em; color: #666;
      border-bottom: 2px solid #eee; padding-bottom: 6px; margin-bottom: 10px;
    }
    .past-draws-list { display: flex; flex-direction: column; gap: 8px; }
    .past-draw-item {
      border: 1px solid #eee; border-radius: 8px; overflow: hidden; background: #fafafa;
    }
    .past-draw-row {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 14px; font-size: 0.85rem;
    }
    .pd-match { flex: 1.2; font-weight: 600; color: #333; }
    .pd-prize { flex: 1; color: #666; }
    .pd-winner { flex: 1; }
    .pd-entries-count { color: #aaa; font-size: 0.78rem; white-space: nowrap; }
    .pd-view-btn { font-size: 0.75rem; height: 30px; line-height: 30px; flex-shrink: 0; }
    .pd-entries-wrap {
      border-top: 1px solid #eee; background: white;
      max-height: 320px; overflow-y: auto;
    }
    .pd-no-entries { padding: 16px; text-align: center; color: #aaa; font-size: 0.85rem; }
    .gw-entries-section { margin-top: 16px; border-top: 1px solid #eee; padding-top: 12px; }
    .gw-entries-header { font-size: 0.82rem; font-weight: 700; color: #666; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
    .gw-entries-table-wrap { max-height: 320px; overflow-y: auto; border: 1px solid #eee; border-radius: 6px; }
    .gw-entries-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    .gw-entries-table th { background: #f9f9f9; padding: 6px 10px; text-align: left; font-weight: 600; color: #888; border-bottom: 1px solid #eee; position: sticky; top: 0; }
    .gw-entries-table td { padding: 7px 10px; border-bottom: 1px solid #f5f5f5; }
    .gw-entries-table tr:last-child td { border-bottom: none; }
    .gw-entry-correct { background: #f1f8e9; }
    .gw-entry-num { color: #bbb; width: 32px; }
    .gw-entry-user { font-weight: 600; color: #333; }
    .gw-entry-score { font-weight: 700; color: #1565c0; font-size: 0.9rem; }
    .gw-entry-time { color: #aaa; font-size: 0.78rem; }
    .gw-correct-badge { background: #43a047; color: white; font-size: 0.7rem; font-weight: 700; padding: 1px 6px; border-radius: 10px; }
  `],
})
export class AdminComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly snack = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  selectedTabIndex = signal(0);
  loading = signal(true);
  groups = signal<AdminGroup[]>([]);
  matches = signal<AdminMatch[]>([]);
  groupStageMatches = signal<GroupStageMatch[]>([]);
  selectedBest3rd = signal<number[]>([]);
  giveaways = signal<AdminGiveaway[]>([]);
  giveawayEntries = signal<GiveawayEntry[]>([]);
  entriesDrawId = signal<number | null>(null);

  openDraws = computed(() => this.giveaways().filter(g => g.status !== 'Drawn'));
  pastGiveaways = computed(() => this.giveaways().filter(g => g.status === 'Drawn'));

  newGiveawayMatchId: number | null = null;
  newGiveawayPrize = '';

  busy: Record<string, boolean> = {};

  readonly roundOrder = ['RoundOf32', 'RoundOf16', 'QuarterFinal', 'SemiFinal', 'ThirdPlace', 'Final'];
  readonly groupOrder = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  readonly tabNames = ['quick-actions', 'group-standings', 'best-3rd-qualifiers', 'match-results', 'group-schedule', 'giveaway'];

  giveawayMatches = computed((): GiveawayMatchOption[] => {
    const groupOptions = this.groupStageMatches()
      .filter(m => m.status !== 'Completed')
      .map(m => ({
        id: m.id,
        label: `${m.homeTeamName} vs ${m.awayTeamName} (Group ${m.groupName})`,
        homeTeamId: m.homeTeamId,
        homeTeamName: m.homeTeamName,
        awayTeamId: m.awayTeamId,
        awayTeamName: m.awayTeamName,
      }));
    const knockoutOptions = this.matches()
      .filter(m => m.status !== 'Completed')
      .map(m => ({
        id: m.id,
        label: `${m.homeTeamName ?? 'TBD'} vs ${m.awayTeamName ?? 'TBD'} (${this.roundLabel(m.round)})`,
        homeTeamId: m.homeTeamId,
        homeTeamName: m.homeTeamName,
        awayTeamId: m.awayTeamId,
        awayTeamName: m.awayTeamName,
      }));
    return [...groupOptions, ...knockoutOptions];
  });

  matchesByRound = computed(() => {
    const result: Partial<Record<string, AdminMatch[]>> = {};
    for (const m of this.matches()) {
      if (!result[m.round]) result[m.round] = [];
      result[m.round]!.push(m);
    }
    return result;
  });

  private allTeams = computed(() =>
    this.groups().flatMap(g => g.teams)
  );

  groupStageByGroup = computed(() => {
    const result: Record<string, GroupStageMatch[]> = {};
    for (const m of this.groupStageMatches()) {
      if (!result[m.groupName]) result[m.groupName] = [];
      result[m.groupName].push(m);
    }
    return result;
  });

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const tabName = params['tab'];
      const tabIndex = this.tabNames.indexOf(tabName);
      if (tabIndex >= 0) {
        this.selectedTabIndex.set(tabIndex);
      }
    });

    forkJoin({
      groups: this.adminService.getAdminGroups(),
      matches: this.adminService.getAdminMatches(),
      groupStageMatches: this.adminService.getGroupStageMatches(),
      best3rd: this.adminService.getBest3rdQualifiers(),
      giveaways: this.adminService.getGiveaways().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ groups, matches, groupStageMatches, best3rd, giveaways }) => {
        this.groups.set(groups);
        this.matches.set(matches);
        this.groupStageMatches.set(groupStageMatches);
        this.selectedBest3rd.set(best3rd.teamIds ?? []);
        this.giveaways.set(giveaways ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  formatMatchDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  formatMatchTime(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  isMatchSoon(dateStr: string | null): boolean {
    if (!dateStr) return false;
    const diff = new Date(dateStr).getTime() - Date.now();
    return diff > 0 && diff < 2 * 60 * 60 * 1000;
  }

  roundLabel(round: string): string {
    const map: Record<string, string> = {
      RoundOf32: 'Round of 32',
      RoundOf16: 'Round of 16',
      QuarterFinal: 'Quarter Finals',
      SemiFinal: 'Semi Finals',
      ThirdPlace: '3rd Place Match',
      Final: 'Final',
    };
    return map[round] ?? round;
  }

  teamName(id: number): string {
    return this.allTeams().find(t => t.id === id)?.name ?? `Team ${id}`;
  }

  teamFlagUrl(id: number): string {
    return this.allTeams().find(t => t.id === id)?.flagUrl ?? '';
  }

  isBest3rdSelected(teamId: number): boolean {
    return this.selectedBest3rd().includes(teamId);
  }

  toggleBest3rd(teamId: number): void {
    const current = this.selectedBest3rd();
    if (current.includes(teamId)) {
      this.selectedBest3rd.set(current.filter(id => id !== teamId));
    } else if (current.length < 8) {
      this.selectedBest3rd.set([...current, teamId]);
    }
  }

  syncEspn(): void {
    this.busy['sync'] = true;
    this.adminService.syncResults(3).subscribe({
      next: (r) => {
        this.busy['sync'] = false;
        this.snack.open(`ESPN sync complete — ${r.updated} match(es) updated`, undefined, { duration: 4000 });
      },
      error: (e) => {
        this.busy['sync'] = false;
        this.snack.open(e?.error?.message ?? 'Sync failed', 'OK', { duration: 5000 });
      },
    });
  }

  syncEspnAll(): void {
    this.busy['syncAll'] = true;
    this.adminService.syncResults(45).subscribe({
      next: (r) => {
        this.busy['syncAll'] = false;
        this.snack.open(`Full history sync complete — ${r.updated} match(es) updated`, undefined, { duration: 5000 });
      },
      error: (e) => {
        this.busy['syncAll'] = false;
        this.snack.open(e?.error?.message ?? 'Sync failed', 'OK', { duration: 5000 });
      },
    });
  }

  recalculate(): void {
    this.busy['calc'] = true;
    this.adminService.recalculate().subscribe({
      next: () => {
        this.busy['calc'] = false;
        this.snack.open('Scores recalculated for all users', undefined, { duration: 4000 });
      },
      error: () => {
        this.busy['calc'] = false;
        this.snack.open('Recalculation failed', 'OK', { duration: 5000 });
      },
    });
  }

  lockBrackets(): void {
    if (!confirm('Lock ALL brackets? Users will no longer be able to edit their picks.')) return;
    this.busy['lock'] = true;
    this.adminService.lockBrackets().subscribe({
      next: () => {
        this.busy['lock'] = false;
        this.snack.open('All brackets locked', undefined, { duration: 4000 });
      },
      error: () => {
        this.busy['lock'] = false;
        this.snack.open('Lock failed', 'OK', { duration: 5000 });
      },
    });
  }

  saveGroupStandings(g: AdminGroup): void {
    const key = `group_${g.id}`;
    this.busy[key] = true;
    this.adminService.setGroupStandings(g.id, {
      firstTeamId: g.actualFirstTeamId,
      secondTeamId: g.actualSecondTeamId,
    }).subscribe({
      next: () => {
        this.busy[key] = false;
        this.snack.open(`Group ${g.name} standings saved`, undefined, { duration: 3000 });
      },
      error: (e) => {
        this.busy[key] = false;
        this.snack.open(e?.error?.message ?? 'Save failed', 'OK', { duration: 5000 });
      },
    });
  }

  saveBest3rd(): void {
    this.busy['best3rd'] = true;
    this.adminService.setBest3rdQualifiers(this.selectedBest3rd()).subscribe({
      next: () => {
        this.busy['best3rd'] = false;
        this.snack.open('Best 3rd qualifiers saved', undefined, { duration: 3000 });
      },
      error: (e) => {
        this.busy['best3rd'] = false;
        this.snack.open(e?.error?.message ?? 'Save failed', 'OK', { duration: 5000 });
      },
    });
  }

  createGiveaway(): void {
    if (!this.newGiveawayMatchId || !this.newGiveawayPrize) return;
    this.busy['gw_create'] = true;
    this.adminService.createGiveaway(this.newGiveawayMatchId, this.newGiveawayPrize).subscribe({
      next: () => {
        this.busy['gw_create'] = false;
        this.newGiveawayMatchId = null;
        this.newGiveawayPrize = '';
        this.snack.open('Giveaway created!', undefined, { duration: 3000 });
        this.refreshGiveaways();
      },
      error: (e) => {
        this.busy['gw_create'] = false;
        this.snack.open(e?.error?.message ?? 'Failed to create giveaway', 'OK', { duration: 5000 });
      },
    });
  }

  toggleGiveawayActive(id: number): void {
    this.busy[`gw_toggle_${id}`] = true;
    this.adminService.toggleGiveawayActive(id).subscribe({
      next: (r) => {
        this.busy[`gw_toggle_${id}`] = false;
        this.snack.open(r.message, undefined, { duration: 3000 });
        this.refreshGiveaways();
      },
      error: (e) => {
        this.busy[`gw_toggle_${id}`] = false;
        this.snack.open(e?.error?.message ?? 'Failed to toggle', 'OK', { duration: 5000 });
      },
    });
  }

  toggleEntries(id: number): void {
    if (this.entriesDrawId() === id) {
      this.entriesDrawId.set(null);
    } else {
      this.entriesDrawId.set(id);
      this.adminService.getGiveawayEntries(id).subscribe({
        next: (entries) => this.giveawayEntries.set(entries),
      });
    }
  }

  closeGiveaway(id: number): void {
    this.busy[`gw_close_${id}`] = true;
    this.adminService.closeGiveaway(id).subscribe({
      next: () => {
        this.busy[`gw_close_${id}`] = false;
        this.snack.open('Entries closed.', undefined, { duration: 3000 });
        this.refreshGiveaways();
      },
      error: (e) => {
        this.busy[`gw_close_${id}`] = false;
        this.snack.open(e?.error?.message ?? 'Failed to close giveaway', 'OK', { duration: 5000 });
      },
    });
  }

  drawGiveaway(id: number): void {
    this.busy[`gw_draw_${id}`] = true;
    this.adminService.drawGiveaway(id, false).subscribe({
      next: (r) => {
        this.busy[`gw_draw_${id}`] = false;
        this.snack.open(r.message, undefined, { duration: 6000 });
        this.refreshGiveaways();
      },
      error: (e) => {
        this.busy[`gw_draw_${id}`] = false;
        this.snack.open(e?.error?.message ?? 'Draw failed', 'OK', { duration: 5000 });
      },
    });
  }

  luckyDraw(id: number): void {
    if (!confirm('Pick a random lucky winner from ALL entries?')) return;
    this.busy[`gw_lucky_${id}`] = true;
    this.adminService.drawGiveaway(id, true).subscribe({
      next: (r) => {
        this.busy[`gw_lucky_${id}`] = false;
        this.snack.open(r.message, undefined, { duration: 6000 });
        this.refreshGiveaways();
      },
      error: (e) => {
        this.busy[`gw_lucky_${id}`] = false;
        this.snack.open(e?.error?.message ?? 'Lucky draw failed', 'OK', { duration: 5000 });
      },
    });
  }

  deleteGiveaway(id: number): void {
    if (!confirm('Delete this giveaway and all its entries?')) return;
    this.busy[`gw_delete_${id}`] = true;
    this.adminService.deleteGiveaway(id).subscribe({
      next: () => {
        this.busy[`gw_delete_${id}`] = false;
        this.snack.open('Giveaway deleted.', undefined, { duration: 3000 });
        this.refreshGiveaways();
      },
      error: (e) => {
        this.busy[`gw_delete_${id}`] = false;
        this.snack.open(e?.error?.message ?? 'Delete failed', 'OK', { duration: 5000 });
      },
    });
  }

  notifyGiveaway(id: number): void {
    this.busy[`gw_notify_${id}`] = true;
    this.adminService.notifyGiveawayUsers(id).subscribe({
      next: (res) => {
        this.busy[`gw_notify_${id}`] = false;
        this.snack.open(res.message, undefined, { duration: 4000 });
      },
      error: (e) => {
        this.busy[`gw_notify_${id}`] = false;
        this.snack.open(e?.error?.message ?? 'Failed to send notifications', 'OK', { duration: 5000 });
      },
    });
  }

  private refreshGiveaways(): void {
    this.adminService.getGiveaways().subscribe({
      next: (list) => {
        this.giveaways.set(list ?? []);
        this.giveawayEntries.set([]);
        this.entriesDrawId.set(null);
      },
    });
  }

  loadEntries(id: number): void {
    this.adminService.getGiveawayEntries(id).subscribe({
      next: (entries) => this.giveawayEntries.set(entries),
    });
  }

  onTabChange(index: number): void {
    this.selectedTabIndex.set(index);
    const tabName = this.tabNames[index];
    this.router.navigate([], { relativeTo: this.route, queryParams: { tab: tabName }, queryParamsHandling: 'merge' });
  }

  formatEntryTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  saveMatchResult(m: AdminMatch): void {
    const key = `match_${m.id}`;
    this.busy[key] = true;
    this.adminService.setMatchResult(m.id, {
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      winnerTeamId: m.winnerTeamId,
    }).subscribe({
      next: () => {
        this.busy[key] = false;
        m.status = 'Completed';
        this.snack.open(`Slot ${m.slotNumber} result saved`, undefined, { duration: 3000 });
      },
      error: (e) => {
        this.busy[key] = false;
        this.snack.open(e?.error?.message ?? 'Save failed', 'OK', { duration: 5000 });
      },
    });
  }
}
