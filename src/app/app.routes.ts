import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: '',
    // No guard here — shell is public; individual routes below are guarded
    loadComponent: () =>
      import('./shared/shell/shell.component').then(m => m.ShellComponent),
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () =>
          import('./features/home/home.component').then(m => m.HomeComponent),
      },
      {
        path: 'bracket',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/bracket/bracket.component').then(m => m.BracketComponent),
      },
      {
        path: 'bracket/view',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/bracket-view/bracket-view.component').then(m => m.BracketViewComponent),
      },
      {
        // Public share route — no auth required
        path: 'share/bracket/:id',
        loadComponent: () =>
          import('./features/bracket-view/bracket-view.component').then(m => m.BracketViewComponent),
      },
      {
        path: 'rules',
        loadComponent: () =>
          import('./features/rules/rules.component').then(m => m.RulesComponent),
      },
      {
        path: 'leaderboard',
        loadComponent: () =>
          import('./features/leaderboard/leaderboard.component').then(m => m.LeaderboardComponent),
      },
      {
        path: 'groups',
        canActivate: [authGuard],   // 🔒 login required
        loadComponent: () =>
          import('./features/groups/groups.component').then(m => m.GroupsComponent),
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin/admin.component').then(m => m.AdminComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
