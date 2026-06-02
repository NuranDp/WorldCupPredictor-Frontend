import { Component, inject, computed, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <!-- Mobile drawer backdrop -->
    @if (drawerOpen()) {
      <div class="drawer-backdrop" (click)="closeDrawer()"></div>
    }

    <!-- Mobile side drawer -->
    <aside class="drawer" [class.drawer-open]="drawerOpen()">
      <div class="drawer-header">
        <a class="brand" routerLink="/home" (click)="closeDrawer()">
          <span class="brand-icon">âš½</span>
          <span class="brand-wc">WC</span><span class="brand-year">2026</span>
        </a>
        <button class="drawer-close" (click)="closeDrawer()" aria-label="Close menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <nav class="drawer-nav">
        <a routerLink="/home"        routerLinkActive="drawer-link-active" class="drawer-link" (click)="closeDrawer()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          Home
        </a>
        <a routerLink="/bracket"     routerLinkActive="drawer-link-active" class="drawer-link" (click)="closeDrawer()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          Bracket
        </a>
        <a routerLink="/leaderboard" routerLinkActive="drawer-link-active" class="drawer-link" (click)="closeDrawer()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          Scores
        </a>
        <a routerLink="/groups"      routerLinkActive="drawer-link-active" class="drawer-link" (click)="closeDrawer()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="17" cy="21" r="1"/><circle cx="9" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          Groups
        </a>
        <a routerLink="/rules"       routerLinkActive="drawer-link-active" class="drawer-link" (click)="closeDrawer()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          How to Play
        </a>
        <a routerLink="/contact"     routerLinkActive="drawer-link-active" class="drawer-link" (click)="closeDrawer()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Contact
        </a>
        @if (auth.isAdmin()) {
          <a routerLink="/admin" routerLinkActive="drawer-link-active" class="drawer-link drawer-link-admin" (click)="closeDrawer()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
            Admin
          </a>
        }
      </nav>

      <div class="drawer-footer">
        @if (auth.isLoggedIn()) {
          <div class="drawer-user">
            <div class="user-avatar">{{ initial() }}</div>
            <span class="drawer-user-name">{{ auth.currentUser()?.name }}</span>
          </div>
          <button class="drawer-logout" (click)="auth.logout()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign out
          </button>
        } @else {
          <a routerLink="/login"    class="guest-btn guest-login"    (click)="closeDrawer()">Log in</a>
          <a routerLink="/register" class="guest-btn guest-register" (click)="closeDrawer()">Sign up</a>
        }
      </div>
    </aside>

    <header class="app-header">
      <div class="header-inner">

        <!-- Hamburger (mobile only) -->
        <button class="hamburger" (click)="openDrawer()" aria-label="Open menu">
          <span></span><span></span><span></span>
        </button>

        <!-- Brand -->
        <a class="brand" routerLink="/home">
          <span class="brand-icon">âš½</span>
          <span class="brand-wc">WC</span><span class="brand-year">2026</span>
        </a>

        <!-- Nav links (desktop) -->
        <nav class="nav">
          <a routerLink="/home"        routerLinkActive="nav-active" class="nav-link">Home</a>
          <a routerLink="/bracket"     routerLinkActive="nav-active" class="nav-link">Bracket</a>
          <a routerLink="/leaderboard" routerLinkActive="nav-active" class="nav-link">Scores</a>
          <a routerLink="/groups"      routerLinkActive="nav-active" class="nav-link">Groups</a>
          <a routerLink="/rules"       routerLinkActive="nav-active" class="nav-link">Rules</a>
          <a routerLink="/contact"     routerLinkActive="nav-active" class="nav-link">Contact</a>
          @if (auth.isAdmin()) {
            <a routerLink="/admin" routerLinkActive="nav-active" class="nav-link nav-admin">âš™ Admin</a>
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

    /* â”€â”€ Mobile drawer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    .drawer-backdrop {
      position: fixed; inset: 0; z-index: 199;
      background: rgba(0,0,0,0.55);
      backdrop-filter: blur(2px);
      animation: fade-in 0.22s ease;
    }
    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }

    .drawer {
      position: fixed; top: 0; left: 0; bottom: 0;
      width: 272px; z-index: 200;
      background: linear-gradient(160deg, #0a1228 0%, #0f1f55 50%, #1a237e 100%);
      box-shadow: 4px 0 32px rgba(0,0,0,0.5);
      display: flex; flex-direction: column;
      transform: translateX(-100%);
      transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
      border-right: 1px solid rgba(249,168,37,0.15);
    }
    .drawer-open { transform: translateX(0); }

    .drawer-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 16px 16px 20px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
    }
    .drawer-close {
      width: 34px; height: 34px; border-radius: 50%; border: none;
      background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.7);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 0.16s;
    }
    .drawer-close:hover { background: rgba(255,255,255,0.15); color: white; }

    .drawer-nav {
      flex: 1; display: flex; flex-direction: column;
      padding: 16px 12px; gap: 4px; overflow-y: auto;
    }
    .drawer-link {
      display: flex; align-items: center; gap: 14px;
      padding: 13px 16px; border-radius: 12px;
      font-size: 0.95rem; font-weight: 600;
      color: rgba(255,255,255,0.65); text-decoration: none;
      transition: all 0.16s;
    }
    .drawer-link:hover { background: rgba(255,255,255,0.08); color: white; }
    .drawer-link-active { background: rgba(255,255,255,0.12); color: white; }
    .drawer-link-admin { color: #f9a825; }
    .drawer-link-admin:hover { background: rgba(249,168,37,0.12); color: #ffb300; }
    .drawer-link-admin.drawer-link-active { background: rgba(249,168,37,0.18); }

    .drawer-footer {
      padding: 16px 20px 28px;
      border-top: 1px solid rgba(255,255,255,0.07);
      display: flex; flex-direction: column; gap: 10px;
    }
    .drawer-user {
      display: flex; align-items: center; gap: 10px; margin-bottom: 4px;
    }
    .drawer-user-name {
      font-size: 0.88rem; font-weight: 600; color: white;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .drawer-logout {
      display: flex; align-items: center; gap: 10px;
      width: 100%; padding: 11px 16px; border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.14);
      background: transparent; color: rgba(255,255,255,0.65);
      font-size: 0.88rem; font-weight: 600; cursor: pointer;
      transition: all 0.16s;
    }
    .drawer-logout:hover { background: rgba(255,255,255,0.08); color: white; }

    /* Hamburger button */
    .hamburger {
      display: flex; flex-direction: column; justify-content: center;
      gap: 5px; width: 36px; height: 36px; padding: 6px;
      border: none; background: transparent; cursor: pointer;
      border-radius: 8px; transition: background 0.16s;
      margin-right: 4px; flex-shrink: 0;
    }
    .hamburger:hover { background: rgba(255,255,255,0.08); }
    .hamburger span {
      display: block; height: 2px; border-radius: 2px;
      background: rgba(255,255,255,0.85); transition: all 0.16s;
    }
    @media (min-width: 640px) { .hamburger { display: none; } }

    /* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
    .app-header {
      position: sticky; top: 0; z-index: 100;
      background: linear-gradient(135deg, #0d1b4b 0%, #1a237e 100%);
      box-shadow: 0 2px 20px rgba(0,0,0,0.30);
    }
    .header-inner {
      max-width: 1280px; margin: 0 auto;
      padding: 0 12px; height: 56px;
      display: flex; align-items: center; gap: 4px;
    }

    /* Everything except brand+hamburger hidden on mobile */
    .nav        { display: none; }
    .guest-area { display: none; }
    .user-area .logout-btn  { display: none; }
    .user-area .user-avatar { display: none; }

    /* Brand */
    .brand {
      display: inline-flex; align-items: center; gap: 5px;
      text-decoration: none; flex-shrink: 0; margin-right: 6px;
    }
    .brand-icon { font-size: 1.25rem; line-height: 1; }
    .brand-wc   { font-size: 1.05rem; font-weight: 900; color: white;   letter-spacing: -0.01em; }
    .brand-year { font-size: 1.05rem; font-weight: 900; color: #f9a825; letter-spacing: -0.01em; }

    /* Nav */
    .nav {
      align-items: center; gap: 2px;
      overflow-x: auto; scrollbar-width: none;
      flex-shrink: 1; min-width: 0;
    }
    .nav::-webkit-scrollbar { display: none; }

    .nav-link {
      display: inline-flex; align-items: center;
      height: 32px; padding: 0 9px; border-radius: 16px;
      font-size: 0.78rem; font-weight: 600;
      color: rgba(255,255,255,0.68); text-decoration: none;
      white-space: nowrap; transition: background 0.16s ease, color 0.16s ease;
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
      display: flex; align-items: center; gap: 8px; flex-shrink: 0;
    }
    .user-avatar {
      width: 30px; height: 30px; border-radius: 50%;
      background: linear-gradient(135deg, #f9a825, #e65100);
      color: white; font-size: 0.78rem; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; box-shadow: 0 1px 6px rgba(0,0,0,0.25);
    }
    .user-name {
      font-size: 0.82rem; font-weight: 500;
      color: rgba(255,255,255,0.80); white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis;
      max-width: 80px; display: none;
    }
    .logout-btn {
      align-items: center; justify-content: center;
      width: 30px; height: 30px;
      border: 1.5px solid rgba(255,255,255,0.20); border-radius: 50%;
      background: transparent; color: rgba(255,255,255,0.65);
      cursor: pointer; transition: all 0.16s ease;
      flex-shrink: 0; padding: 0;
    }
    .logout-btn:hover {
      border-color: rgba(255,255,255,0.50);
      background: rgba(255,255,255,0.10); color: white;
    }

    /* Guest area */
    .guest-area {
      align-items: center; gap: 8px; flex-shrink: 0;
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
    .guest-login:hover { color: white; border-color: rgba(255,255,255,0.50); background: rgba(255,255,255,0.08); }
    .guest-register {
      background: linear-gradient(135deg, #f9a825, #e65100);
      color: white; box-shadow: 0 2px 8px rgba(249,168,37,0.35);
    }
    .guest-register:hover { box-shadow: 0 4px 14px rgba(249,168,37,0.50); transform: translateY(-1px); }

    /* Page content */
    .page-content { max-width: 1280px; margin: 0 auto; padding: 16px 12px 32px; }

    /* â”€â”€ Responsive â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
    @media (min-width: 640px) {
      .nav                    { display: flex; }
      .guest-area             { display: flex; }
      .user-area .user-avatar { display: flex; }
      .user-area .logout-btn  { display: flex; }
    }
    @media (min-width: 640px) {
      .nav-link { font-size: 0.875rem; padding: 0 12px; height: 34px; }
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
  drawerOpen = signal(false);

  openDrawer()  { this.drawerOpen.set(true);  }
  closeDrawer() { this.drawerOpen.set(false); }

  initial = computed(() => {
    const name = this.auth.currentUser()?.name ?? '';
    return name.charAt(0).toUpperCase() || '?';
  });
}

