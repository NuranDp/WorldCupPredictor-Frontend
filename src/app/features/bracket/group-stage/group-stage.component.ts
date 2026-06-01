import { Component, Input, inject, computed, signal } from '@angular/core';
import { BracketService } from '../../../core/services/bracket.service';
import { TournamentGroup, GroupPick, Team } from '../../../core/models/tournament.models';

@Component({
  selector: 'app-group-stage',
  standalone: true,
  imports: [],
  template: `
    <!-- ── Progress ──────────────────────────────────────────────── -->
    <div class="progress-row">
      <div class="progress-track">
        <div class="progress-fill" [style.width.%]="progressPct()"></div>
      </div>
      <span class="progress-label">{{ completedGroups() }}/{{ groups.length }} groups</span>
    </div>

    <!-- ── Group tabs ──────────────────────────────────────────── -->
    <div class="tabs-scroll">
      @for (g of groups; track g.id; let i = $index) {
        <button class="g-tab"
                [class.g-tab-active]="i === activeIdx()"
                [class.g-tab-done]="isGroupComplete(g.id)"
                (click)="selectGroup(i)">
          <span class="g-tab-letter">{{ g.name }}</span>
          @if (isGroupComplete(g.id)) { <span class="g-tab-check">✓</span> }
        </button>
      }
    </div>

    <!-- ── Group panel ─────────────────────────────────────────── -->
    @let g = activeGroup();
    @if (animating() && g) {
      @let pick = getPick(g.id);
      <div class="group-panel" [class]="'dir-' + panelDir()">

        <!-- Panel header -->
        <div class="gp-header" [class.gp-header-done]="isGroupComplete(g.id)">
          <div class="gp-header-left">
            <span class="gp-super">GROUP</span>
            <span class="gp-name">{{ g.name }}</span>
          </div>
          <div class="gp-header-right">
            @if (isGroupComplete(g.id)) {
              <span class="gp-status-done">✓ Complete</span>
            } @else {
              <span class="gp-status-hint">Pick 1st &amp; 2nd</span>
            }
            <span class="gp-team-count">{{ g.teams.length }} teams</span>
            @if (!bracketService.isLocked()) {
              <button class="rank-pick-btn" (click)="pickByRanking(g)" tabindex="-1">
                ★ Pick by ranking
              </button>
            }
          </div>
        </div>

        <!-- Teams -->
        <div class="teams-list">
          @for (team of g.teams; track team.id; let idx = $index) {
            @let is1st = pick?.firstTeamId === team.id;
            @let is2nd = pick?.secondTeamId === team.id;
            <div class="team-row"
                 [class.row-1st]="is1st"
                 [class.row-2nd]="is2nd">

              <div class="team-rank-badge">
                @if (is1st) { <span class="rank-1">1</span> }
                @else if (is2nd) { <span class="rank-2">2</span> }
                @else { <span class="rank-empty">{{ idx + 1 }}</span> }
              </div>

              <img [src]="team.flagUrl" [alt]="team.name" class="team-flag">

              <span class="team-name">{{ team.name }}</span>

              <div class="team-picks">
                <button class="pick-btn pb-1st"
                        [class.pb-active]="is1st"
                        [disabled]="is2nd || bracketService.isLocked()"
                        (click)="onPick(g, team.id, 'first')">
                  1<sup>st</sup>
                </button>
                <button class="pick-btn pb-2nd"
                        [class.pb-active]="is2nd"
                        [disabled]="is1st || bracketService.isLocked()"
                        (click)="onPick(g, team.id, 'second')">
                  2<sup>nd</sup>
                </button>
              </div>
            </div>
          }
        </div>

        <!-- Selected summary -->
        @if (pick?.firstTeamId || pick?.secondTeamId) {
          <div class="pick-summary">
            @if (pick?.firstTeamId) {
              @let t1 = bracketService.getTeam(pick!.firstTeamId!);
              @if (t1) {
                <div class="ps-chip ps-chip-1">
                  <span class="ps-pos">1st</span>
                  <img [src]="t1.flagUrl" class="ps-flag">
                  <span class="ps-name">{{ t1.name }}</span>
                </div>
              }
            }
            @if (pick?.secondTeamId) {
              @let t2 = bracketService.getTeam(pick!.secondTeamId!);
              @if (t2) {
                <div class="ps-chip ps-chip-2">
                  <span class="ps-pos">2nd</span>
                  <img [src]="t2.flagUrl" class="ps-flag">
                  <span class="ps-name">{{ t2.name }}</span>
                </div>
              }
            }
          </div>
        }

        <!-- Nav -->
        <div class="panel-nav">
          <button class="nav-btn" [disabled]="activeIdx() === 0" (click)="prev()">
            ← {{ prevLabel() }}
          </button>
          <div class="nav-dots">
            @for (grp of groups; track grp.id; let i = $index) {
              <span class="dot"
                    [class.dot-active]="i === activeIdx()"
                    [class.dot-done]="isGroupComplete(grp.id)"
                    (click)="selectGroup(i)">
              </span>
            }
          </div>
          <button class="nav-btn nav-next" [disabled]="activeIdx() === groups.length - 1" (click)="next()">
            {{ nextLabel() }} →
          </button>
        </div>

      </div>
    }

    <!-- ── Best 3rd Place ─────────────────────────────────────── -->
    <div class="third-section" [class.third-complete]="bracketService.best3rdCount === 8">

      <div class="third-header">
        <div>
          <div class="third-super">BEST 3RD PLACE</div>
          <div class="third-title">Qualifiers</div>
        </div>
        <div class="third-header-right">
          @if (!bracketService.isLocked() && nonQualifiedTeams().length > 0) {
            <button class="third-rank-btn" tabindex="-1" (click)="pickBest3rdByRanking()">
              ★ Pick by ranking
            </button>
          }
          <div class="third-counter">
            <span class="tc-num">{{ bracketService.best3rdCount }}</span>
            <span class="tc-denom">/8</span>
            @if (bracketService.best3rdCount === 8) { <span class="tc-done">✓</span> }
          </div>
        </div>
      </div>

      @if (nonQualifiedTeams().length === 0) {
        <div class="third-empty">
          <span class="te-icon">🔒</span>
          Complete all group picks to unlock 3rd-place selection.
        </div>
      } @else {
        <div class="third-teams">
          @for (entry of nonQualifiedByGroup(); track entry.groupName) {
            <div class="third-group">
              <div class="third-group-label">Group {{ entry.groupName }}</div>
              @for (team of entry.teams; track team.id) {
                <div class="third-row"
                     [class.third-sel]="bracketService.isBest3rdSelected(team.id)"
                     [class.third-dim]="!bracketService.isBest3rdSelected(team.id) && (isGroupTakenByOther(entry.teams, team.id) || bracketService.best3rdCount >= 8)">
                  @if (bracketService.isBest3rdSelected(team.id)) {
                    <span class="third-num"># {{ bracketService.best3rdPicks().indexOf(team.id) + 1 }}</span>
                  }
                  <img [src]="team.flagUrl" [alt]="team.name" class="team-flag">
                  <span class="team-name">{{ team.name }}</span>
                  <button class="third-btn"
                          [class.third-btn-sel]="bracketService.isBest3rdSelected(team.id)"
                          [disabled]="(!bracketService.isBest3rdSelected(team.id) && isGroupTakenByOther(entry.teams, team.id)) || (bracketService.best3rdCount >= 8 && !bracketService.isBest3rdSelected(team.id)) || bracketService.isLocked()"
                          (click)="toggleThird(team.id)">
                    @if (bracketService.isBest3rdSelected(team.id)) { ✕ Remove }
                    @else { + Select }
                  </button>
                </div>
              }
            </div>
          }
        </div>

        @if (bracketService.best3rdCount > 0) {
          <div class="third-order">
            <div class="to-label">Selected order — determines R32 seeding</div>
            <div class="to-chips">
              @for (teamId of bracketService.best3rdPicks(); track $index) {
                @if (teamId !== null) {
                  @let t = bracketService.getTeam(teamId);
                  @if (t) {
                    <div class="to-chip">
                      <span class="to-num">{{ $index + 1 }}</span>
                      <img [src]="t.flagUrl" class="ps-flag">
                      <span class="to-name">{{ t.name }}</span>
                      <button class="to-remove" [disabled]="bracketService.isLocked()" (click)="removeThird($index)">✕</button>
                    </div>
                  }
                }
              }
            </div>
            <div class="to-note">Pairings: 1v2 → M13 · 3v4 → M14 · 5v6 → M15 · 7v8 → M16</div>
          </div>
        }
      }

    </div>
  `,
  styles: [`
    /* ── Progress ───────────────────────────────────────────────── */
    .progress-row {
      display: flex; align-items: center; gap: 12px; margin-bottom: 14px;
    }
    .progress-track {
      flex: 1; height: 7px; background: #e8eaf6; border-radius: 4px; overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #1a237e, #42a5f5);
      border-radius: 4px;
      transition: width 0.4s ease;
    }
    .progress-label { font-size: 0.78rem; color: #888; white-space: nowrap; font-weight: 600; }

    /* ── Group tabs ──────────────────────────────────────────────── */
    .tabs-scroll {
      display: flex; gap: 6px; overflow-x: auto;
      padding: 2px 2px 10px; scrollbar-width: none;
    }
    .tabs-scroll::-webkit-scrollbar { display: none; }

    .g-tab {
      display: inline-flex; align-items: center; justify-content: center;
      gap: 3px; min-width: 44px; height: 44px; padding: 0 12px;
      border-radius: 22px; border: 2px solid #e0e0e0;
      background: white; color: #666;
      font-weight: 700; font-size: 0.88rem;
      cursor: pointer; transition: all 0.18s ease;
      white-space: nowrap; flex-shrink: 0;
    }
    .g-tab:hover:not(.g-tab-active) {
      border-color: #90caf9; background: #e3f2fd; color: #1565c0;
      transform: translateY(-1px);
    }
    .g-tab.g-tab-active {
      background: #1a237e; border-color: #1a237e; color: white;
      box-shadow: 0 4px 12px rgba(26,35,126,0.30); transform: translateY(-2px);
    }
    .g-tab.g-tab-done { background: #2e7d32; border-color: #2e7d32; color: white; }
    .g-tab.g-tab-done.g-tab-active { background: #1b5e20; border-color: #1b5e20; box-shadow: 0 4px 12px rgba(27,94,32,0.30); }
    .g-tab-check { font-size: 0.6rem; }

    /* ── Group panel ─────────────────────────────────────────────── */
    @keyframes slideInR { from { opacity:0; transform:translateX(28px); } to { opacity:1; transform:translateX(0); } }
    @keyframes slideInL { from { opacity:0; transform:translateX(-28px); } to { opacity:1; transform:translateX(0); } }
    .group-panel { background: white; border-radius: 18px; box-shadow: 0 4px 20px rgba(0,0,0,0.10); overflow: hidden; margin-bottom: 8px; }
    .dir-right { animation: slideInR 0.22s cubic-bezier(0.22,1,0.36,1); }
    .dir-left  { animation: slideInL 0.22s cubic-bezier(0.22,1,0.36,1); }

    /* Header */
    .gp-header {
      background: linear-gradient(135deg, #1a237e 0%, #3949ab 100%);
      color: white; padding: 18px 20px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .gp-header-done { background: linear-gradient(135deg, #1b5e20 0%, #388e3c 100%); }
    .gp-super { display: block; font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; opacity: 0.65; }
    .gp-name { display: block; font-size: 2rem; font-weight: 900; letter-spacing: 0.04em; line-height: 1; }
    .gp-header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    .gp-status-done {
      background: rgba(255,255,255,0.2); border-radius: 12px;
      padding: 3px 10px; font-size: 0.75rem; font-weight: 700;
    }
    .gp-status-hint { font-size: 0.75rem; opacity: 0.65; }
    .gp-team-count { font-size: 0.68rem; opacity: 0.5; }
    .rank-pick-btn {
      margin-top: 2px;
      padding: 2px 8px; border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.35);
      background: transparent; color: rgba(255,255,255,0.6);
      font-size: 0.62rem; font-weight: 600; cursor: pointer;
      transition: color 0.15s, border-color 0.15s;
    }
    .rank-pick-btn:hover { color: white; border-color: rgba(255,255,255,0.7); }

    /* Team rows */
    .teams-list { padding: 6px 0; }

    .team-row {
      display: flex; align-items: center; gap: 10px;
      padding: 11px 18px;
      border-bottom: 1px solid #f5f5f5;
      transition: background 0.15s;
    }
    .team-row:last-child { border-bottom: none; }
    .team-row.row-1st { background: linear-gradient(to right, #f1f8e9, #f9fbe7); }
    .team-row.row-2nd { background: linear-gradient(to right, #e3f2fd, #e8f4fd); }

    .team-rank-badge {
      width: 24px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
    }
    .rank-1, .rank-2 {
      width: 22px; height: 22px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.7rem; font-weight: 800; color: white;
    }
    .rank-1 { background: #2e7d32; box-shadow: 0 2px 6px rgba(46,125,50,0.4); }
    .rank-2 { background: #1565c0; box-shadow: 0 2px 6px rgba(21,101,192,0.4); }
    .rank-empty { font-size: 0.72rem; color: #ccc; font-weight: 500; }

    .team-flag {
      width: 34px; height: 22px; object-fit: cover;
      border-radius: 4px; flex-shrink: 0;
      box-shadow: 0 1px 4px rgba(0,0,0,0.18);
    }
    .team-name {
      flex: 1; font-size: 0.92rem; font-weight: 500;
      min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }

    .team-picks { display: flex; gap: 5px; flex-shrink: 0; }

    .pick-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 46px; height: 32px;
      border-radius: 8px; border: 2px solid #e0e0e0;
      background: white; color: #aaa;
      font-size: 0.72rem; font-weight: 700;
      cursor: pointer; transition: all 0.15s ease;
    }
    .pick-btn sup { font-size: 0.55rem; vertical-align: super; }
    .pick-btn:hover:not(:disabled):not(.pb-active) {
      transform: scale(1.08); box-shadow: 0 2px 6px rgba(0,0,0,0.12);
    }
    .pick-btn:disabled:not(.pb-active) { opacity: 0.2; cursor: default; }

    .pb-1st.pb-active {
      background: #2e7d32; border-color: #2e7d32; color: white;
      box-shadow: 0 2px 8px rgba(46,125,50,0.45);
    }
    .pb-1st:hover:not(:disabled):not(.pb-active) {
      border-color: #4caf50; background: #f1f8e9; color: #2e7d32;
    }
    .pb-2nd.pb-active {
      background: #1565c0; border-color: #1565c0; color: white;
      box-shadow: 0 2px 8px rgba(21,101,192,0.45);
    }
    .pb-2nd:hover:not(:disabled):not(.pb-active) {
      border-color: #42a5f5; background: #e3f2fd; color: #1565c0;
    }

    /* Pick summary chips */
    .pick-summary {
      display: flex; gap: 8px; flex-wrap: wrap;
      padding: 12px 18px;
      border-top: 1px solid #f5f5f5;
      background: #fafafa;
    }
    .ps-chip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 5px 10px; border-radius: 20px; font-size: 0.78rem; font-weight: 600;
    }
    .ps-chip-1 { background: #e8f5e9; color: #2e7d32; border: 1.5px solid #a5d6a7; }
    .ps-chip-2 { background: #e3f2fd; color: #1565c0; border: 1.5px solid #90caf9; }
    .ps-pos { font-weight: 800; font-size: 0.68rem; }
    .ps-flag { width: 18px; height: 12px; object-fit: cover; border-radius: 2px; }
    .ps-name { max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* Panel nav */
    .panel-nav {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 18px; border-top: 1px solid #f0f0f0; background: #fafafa;
    }
    .nav-btn {
      background: white; border: 2px solid #e0e0e0; border-radius: 20px;
      padding: 7px 16px; font-size: 0.8rem; font-weight: 600; color: #666;
      cursor: pointer; transition: all 0.15s; white-space: nowrap;
    }
    .nav-btn:hover:not(:disabled) { border-color: #1a237e; color: #1a237e; background: #e8eaf6; }
    .nav-btn:disabled { opacity: 0.25; cursor: default; }
    .nav-dots { display: flex; gap: 5px; align-items: center; }
    .dot {
      width: 8px; height: 8px; border-radius: 50%; background: #e0e0e0;
      cursor: pointer; transition: all 0.18s;
    }
    .dot:hover { background: #90caf9; transform: scale(1.3); }
    .dot.dot-active { background: #1a237e; width: 22px; border-radius: 4px; }
    .dot.dot-done:not(.dot-active) { background: #4caf50; }

    /* ── Best 3rd Place ──────────────────────────────────────────── */
    @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
    .third-section {
      background: white; border-radius: 18px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.10);
      overflow: hidden; margin-top: 20px;
      animation: fadeUp 0.3s cubic-bezier(0.22,1,0.36,1);
    }

    .third-header {
      background: linear-gradient(135deg, #4a148c 0%, #7b1fa2 50%, #e91e63 100%);
      color: white; padding: 18px 20px;
      display: flex; align-items: center; justify-content: space-between;
    }
    .third-complete .third-header { background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%); }
    .third-super { font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; opacity: 0.7; }
    .third-title { font-size: 1.6rem; font-weight: 900; letter-spacing: 0.03em; line-height: 1.1; }
    .third-header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
    .third-rank-btn {
      padding: 2px 8px; border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.35);
      background: transparent; color: rgba(255,255,255,0.6);
      font-size: 0.62rem; font-weight: 600; cursor: pointer;
      transition: color 0.15s, border-color 0.15s;
    }
    .third-rank-btn:hover { color: white; border-color: rgba(255,255,255,0.7); }
    .third-counter { display: flex; align-items: baseline; gap: 2px; }
    .tc-num { font-size: 2.4rem; font-weight: 900; line-height: 1; }
    .tc-denom { font-size: 1.1rem; opacity: 0.55; }
    .tc-done { font-size: 1.2rem; margin-left: 6px; }

    .third-empty {
      display: flex; align-items: center; gap: 10px;
      padding: 28px 20px; color: #bbb; font-size: 0.85rem; font-style: italic;
    }
    .te-icon { font-size: 1.4rem; }

    .third-teams { }
    .third-group { }
    .third-group-label {
      padding: 10px 20px 4px;
      font-size: 0.68rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.1em;
      color: #bbb; background: #fafafa;
    }
    .third-row {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 20px; border-bottom: 1px solid #f5f5f5; transition: background 0.15s;
    }
    .third-row:last-child { border-bottom: none; }
    .third-row.third-sel { background: #fce4ec; }
    .third-row.third-dim { opacity: 0.3; pointer-events: none; }

    .third-num {
      font-size: 0.68rem; font-weight: 700; background: #e91e63; color: white;
      border-radius: 10px; padding: 2px 7px; flex-shrink: 0;
      animation: badgePop 0.22s cubic-bezier(0.34,1.56,0.64,1);
    }
    @keyframes badgePop { from { opacity:0; transform:scale(0.4); } to { opacity:1; transform:scale(1); } }

    .third-btn {
      margin-left: auto; flex-shrink: 0;
      display: inline-flex; align-items: center; gap: 4px;
      padding: 5px 13px; border-radius: 20px;
      border: 2px solid #e0e0e0; background: white;
      color: #aaa; font-size: 0.72rem; font-weight: 700;
      cursor: pointer; transition: all 0.15s;
    }
    .third-btn:hover:not(:disabled):not(.third-btn-sel) {
      border-color: #e91e63; background: #fce4ec; color: #c2185b;
      transform: scale(1.05);
    }
    .third-btn.third-btn-sel {
      background: #e91e63; border-color: #e91e63; color: white;
      box-shadow: 0 2px 8px rgba(233,30,99,0.35);
    }
    .third-btn:disabled { opacity: 0.2; cursor: default; }

    /* Selected order */
    .third-order {
      border-top: 1px solid #fce4ec;
      background: #fff5f8; padding: 14px 20px;
    }
    .to-label { font-size: 0.75rem; color: #aaa; margin: 0 0 10px; font-weight: 500; }
    .to-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
    .to-chip {
      display: flex; align-items: center; gap: 5px;
      padding: 4px 8px 4px 4px; background: white;
      border: 1.5px solid #f48fb1; border-radius: 16px; font-size: 0.78rem;
      animation: chipIn 0.2s cubic-bezier(0.22,1,0.36,1);
    }
    @keyframes chipIn { from { opacity:0; transform:scale(0.75) translateY(4px); } to { opacity:1; transform:scale(1) translateY(0); } }
    .to-num {
      width: 20px; height: 20px; background: #e91e63; color: white;
      border-radius: 50%; font-size: 0.62rem; font-weight: 700;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .to-name { font-size: 0.78rem; max-width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .to-remove {
      border: none; background: none; color: #e0e0e0;
      cursor: pointer; font-size: 0.68rem; padding: 0 2px; transition: color 0.12s;
    }
    .to-remove:hover:not(:disabled) { color: #e91e63; }
    .to-note { font-size: 0.68rem; color: #e0b4c6; margin: 0; }

    /* ── Mobile fixes ───────────────────────────────────────────── */
    @media (max-width: 480px) {
      .g-tab { min-width: 36px; height: 36px; padding: 0 8px; font-size: 0.78rem; }
      .gp-name { font-size: 1.5rem; }
      .gp-header { padding: 14px 14px; }
      .team-row { padding: 10px 12px; gap: 8px; }
      .pick-btn { width: 38px; height: 30px; font-size: 0.68rem; }
      .third-header { flex-direction: column; align-items: flex-start; gap: 8px; }
      .third-header-right { flex-direction: row; align-items: center; width: 100%; justify-content: space-between; }
      .tc-num { font-size: 1.6rem; }
      .third-title { font-size: 1.3rem; }
    }
  `],
})
export class GroupStageComponent {
  @Input() groups: TournamentGroup[] = [];
  readonly bracketService = inject(BracketService);

  activeIdx  = signal(0);
  animating  = signal(true);
  panelDir   = signal<'right' | 'left'>('right');

  readonly tiers: { value: 'Bronze' | 'Silver' | 'Gold'; medal: string; desc: string }[] = [
    { value: 'Bronze', medal: '🥉', desc: 'Winner only' },
    { value: 'Silver', medal: '🥈', desc: 'Winner + goal diff' },
    { value: 'Gold',   medal: '🥇', desc: 'Exact scoreline' },
  ];

  activeGroup = computed(() => this.groups[this.activeIdx()] ?? null);
  progressPct = computed(() =>
    this.groups.length ? (this.completedGroups() / this.groups.length) * 100 : 0
  );

  selectGroup(i: number): void {
    if (i === this.activeIdx() || i < 0 || i >= this.groups.length) return;
    this.panelDir.set(i > this.activeIdx() ? 'right' : 'left');
    this.animating.set(false);
    setTimeout(() => { this.activeIdx.set(i); this.animating.set(true); }, 20);
  }

  prev(): void { this.selectGroup(this.activeIdx() - 1); }
  next(): void { this.selectGroup(this.activeIdx() + 1); }

  prevLabel(): string { return this.groups[this.activeIdx() - 1]?.name ?? ''; }
  nextLabel(): string { return this.groups[this.activeIdx() + 1]?.name ?? ''; }

  getPick(groupId: number): GroupPick | undefined {
    return this.bracketService.groupPicks().find(p => p.groupId === groupId);
  }

  isGroupComplete(groupId: number): boolean {
    const p = this.getPick(groupId);
    return !!p?.firstTeamId && !!p?.secondTeamId;
  }

  completedGroups(): number {
    return this.groups.filter(g => this.isGroupComplete(g.id)).length;
  }

  onPick(group: TournamentGroup, teamId: number, position: 'first' | 'second'): void {
    const pick   = this.getPick(group.id);
    const first  = position === 'first'  ? teamId : (pick?.firstTeamId  ?? null);
    const second = position === 'second' ? teamId : (pick?.secondTeamId ?? null);
    this.bracketService.setGroupPick(group.id, group.name, first, second);
    if (first && second && this.activeIdx() < this.groups.length - 1) {
      setTimeout(() => this.next(), 350);
    }
  }

  pickByRanking(group: TournamentGroup): void {
    const sorted = [...group.teams].sort((a, b) => a.fifaRanking - b.fifaRanking);
    const first  = sorted[0]?.id ?? null;
    const second = sorted[1]?.id ?? null;
    this.bracketService.setGroupPick(group.id, group.name, first, second);
    if (first && second && this.activeIdx() < this.groups.length - 1) {
      setTimeout(() => this.next(), 350);
    }
  }

  nonQualifiedTeams = computed<Team[]>(() => {
    const qualified = new Set<number>();
    this.bracketService.groupPicks().forEach(p => {
      if (p.firstTeamId)  qualified.add(p.firstTeamId);
      if (p.secondTeamId) qualified.add(p.secondTeamId);
    });
    return this.groups.flatMap(g => g.teams).filter(t => !qualified.has(t.id));
  });

  nonQualifiedByGroup = computed(() => {
    void this.bracketService.best3rdPicks();
    const qualifiedIds = new Set<number>();
    this.bracketService.groupPicks().forEach(p => {
      if (p.firstTeamId)  qualifiedIds.add(p.firstTeamId);
      if (p.secondTeamId) qualifiedIds.add(p.secondTeamId);
    });
    return this.groups
      .map(g => ({ groupName: g.name, teams: g.teams.filter(t => !qualifiedIds.has(t.id)) }))
      .filter(e => e.teams.length > 0);
  });

  isGroupTakenByOther(groupTeams: Team[], teamId: number): boolean {
    return groupTeams.some(t => t.id !== teamId && this.bracketService.isBest3rdSelected(t.id));
  }

  toggleThird(teamId: number): void { this.bracketService.toggleBest3rdTeam(teamId); }

  pickBest3rdByRanking(): void {
    // One best-ranked candidate per group, then take the top 8 across all groups
    const bestPerGroup = this.nonQualifiedByGroup()
      .map(entry => [...entry.teams].sort((a, b) => a.fifaRanking - b.fifaRanking)[0])
      .filter(Boolean)
      .sort((a, b) => a.fifaRanking - b.fifaRanking)
      .slice(0, 8);
    for (let i = 0; i < 8; i++) {
      this.bracketService.setBest3rdPick(i, bestPerGroup[i]?.id ?? null);
    }
  }
  removeThird(index: number): void  { this.bracketService.setBest3rdPick(index, null); }
}
