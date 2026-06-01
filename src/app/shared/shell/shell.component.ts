import { Component, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="app-header">
      <div class="header-inner">

        <!-- Brand -->
        <a class="brand" routerLink="/home">
          <span class="brand-icon">⚽</span>
          <span class="brand-wc">WC</span><span class="brand-year">2026</span>
        </a>

        <!-- Nav links -->
        <nav class="nav">
          <a routerLink="/home"        routerLinkActive="nav-active" class="nav-link">Home</a>
          <a routerLink="/bracket"     routerLinkActive="nav-active" class="nav-link">Bracket</a>
          <a routerLink="/leaderboard" routerLinkActive="nav-active" class="nav-link">Scores</a>
          <a routerLink="/groups"      routerLinkActive="nav-active" class="nav-link">Groups</a>
          @if (auth.isAdmin()) {
            <a routerLink="/admin" routerLinkActive="nav-active" class="nav-link nav-admin">⚙ Admin</a>
          }
        </nav>

        <!-- Spacer -->
        <span class="flex-spacer"></span>

        <!-- User area: logged in -->
        @if (auth.isLoggedIn()) {
          <div class="user-area">
            <div class="user-avatar">{{ initial() }}</div>
            <span class="user-name">{{ auth.currentUser()?.name }}</span>
            <button class="logout-btn" title="Sign out" (click)="auth.logout()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        } @else {
          <!-- Guest area: not logged in -->
          <div class="guest-area">
            <a routerLink="/login"    class="guest-btn guest-login">Log in</a>
            <a routerLink="/register" class="guest-btn guest-register">Sign up</a>
          </div>
        }

      </div>
    </header>

    <div class="page-content">
      <router-outlet />
    </div>
  `,
  styles: [`
    :host { display: block; }

    /* ── Header ─────────────────────────────────────────────────── */
    .app-header {
      position: sticky;
      top: 0;
      z-index: 100;
      background: linear-gradient(135deg, #0d1b4b 0%, #1a237e 100%);
      box-shadow: 0 2px 20px rgba(0,0,0,0.30);
    }
    .header-inner {
      max-width: 1280px;
      margin: 0 auto;
      padding: 0 12px;
      height: 56px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    /* Brand */
    .brand {
      display: inline-flex;
      align-items: baseline;
      gap: 5px;
      text-decoration: none;
      flex-shrink: 0;
      margin-right: 6px;
    }
    .brand-icon { font-size: 1.25rem; align-self: center; }
    .brand-wc   { font-size: 1.05rem; font-weight: 900; color: white;   letter-spacing: -0.01em; }
    .brand-year { font-size: 1.05rem; font-weight: 900; color: #f9a825; letter-spacing: -0.01em; }

    /* Nav */
    .nav {
      display: flex;
      align-items: center;
      gap: 2px;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .nav::-webkit-scrollbar { display: none; }

    .nav-link {
      display: inline-flex;
      align-items: center;
      height: 34px;
      padding: 0 12px;
      border-radius: 17px;
      font-size: 0.875rem;
      font-weight: 600;
      color: rgba(255,255,255,0.68);
      text-decoration: none;
      white-space: nowrap;
      transition: background 0.16s ease, color 0.16s ease;
    }
    .nav-link:hover         { color: white; background: rgba(255,255,255,0.10); }
    .nav-link.nav-active    { color: white; background: rgba(255,255,255,0.18); }
    .nav-admin              { color: #f9a825 !important; }
    .nav-admin:hover        { background: rgba(249,168,37,0.14) !important; }
    .nav-admin.nav-active   { background: rgba(249,168,37,0.22) !important; }

    /* Spacer */
    .flex-spacer { flex: 1 1 auto; min-width: 4px; }

    /* User area */
    .user-area {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .user-avatar {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: linear-gradient(135deg, #f9a825, #e65100);
      color: white;
      font-size: 0.78rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 1px 6px rgba(0,0,0,0.25);
    }
    .user-name {
      font-size: 0.82rem;
      font-weight: 500;
      color: rgba(255,255,255,0.80);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 80px;
      display: none;
    }
    .logout-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border: 1.5px solid rgba(255,255,255,0.20);
      border-radius: 50%;
      background: transparent;
      color: rgba(255,255,255,0.65);
      cursor: pointer;
      transition: all 0.16s ease;
      flex-shrink: 0;
      padding: 0;
    }
    .logout-btn:hover {
      border-color: rgba(255,255,255,0.50);
      background: rgba(255,255,255,0.10);
      color: white;
    }

    /* Guest area */
    .guest-area {
      display: flex; align-items: center; gap: 8px; flex-shrink: 0;
    }
    .guest-btn {
      display: inline-flex; align-items: center;
      height: 32px; padding: 0 14px; border-radius: 16px;
      font-size: 0.82rem; font-weight: 700; text-decoration: none;
      transition: all 0.16s ease; white-space: nowrap;
    }
    .guest-login {
      color: rgba(255,255,255,0.78);
      border: 1.5px solid rgba(255,255,255,0.22);
    }
    .guest-login:hover {
      color: white; border-color: rgba(255,255,255,0.50);
      background: rgba(255,255,255,0.08);
    }
    .guest-register {
      background: linear-gradient(135deg, #f9a825, #e65100);
      color: white;
      box-shadow: 0 2px 8px rgba(249,168,37,0.35);
    }
    .guest-register:hover {
      box-shadow: 0 4px 14px rgba(249,168,37,0.50);
      transform: translateY(-1px);
    }

    /* Page content */
    .page-content {
      max-width: 1280px;
      margin: 0 auto;
      padding: 16px 12px 32px;
    }

    /* ── Responsive ─────────────────────────────────────────────── */
    @media (max-width: 360px) {
      .nav-link { padding: 0 8px; font-size: 0.78rem; }
      .guest-btn { padding: 0 10px; font-size: 0.76rem; }
      .brand-icon { font-size: 1rem; }
    }
    @media (min-width: 520px) {
      .header-inner { padding: 0 20px; gap: 6px; }
      .brand        { margin-right: 10px; }
      .brand-wc, .brand-year { font-size: 1.12rem; }
      .user-name    { display: block; }
    }
    @media (min-width: 768px) {
      .header-inner { padding: 0 32px; }
      .brand        { margin-right: 16px; }
      .nav-link     { font-size: 0.92rem; padding: 0 14px; }
      .user-name    { max-width: 140px; font-size: 0.88rem; }
      .page-content { padding: 24px 32px 40px; }
    }
  `],
})
export class ShellComponent {
  readonly auth = inject(AuthService);

  initial = computed(() => {
    const name = this.auth.currentUser()?.name ?? '';
    return name.charAt(0).toUpperCase() || '?';
  });
}
