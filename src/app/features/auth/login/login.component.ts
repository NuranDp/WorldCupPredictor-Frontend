import { Component, inject, OnInit, AfterViewInit, NgZone, ElementRef } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { NgIf } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

declare const google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    NgIf,
  ],
  template: `
    <div class="auth-container">
      <mat-card class="auth-card">
        <mat-card-header>
          <div class="logo-section">
            <span class="trophy">ðŸ†</span>
            <h1 class="app-title">Predict The</h1>
            <p class="app-subtitle">Champion</p>
          </div>
        </mat-card-header>

        <mat-card-content>
          <div id="google-signin-btn" class="google-btn-wrapper"></div>

          <div class="divider"><span>or</span></div>

          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="email" />
              <mat-icon matSuffix>email</mat-icon>
              <mat-error *ngIf="form.get('email')?.hasError('required')">Email is required</mat-error>
              <mat-error *ngIf="form.get('email')?.hasError('email')">Enter a valid email</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input matInput [type]="showPassword ? 'text' : 'password'" formControlName="password" autocomplete="current-password" />
              <button mat-icon-button matSuffix type="button" (click)="showPassword = !showPassword">
                <mat-icon>{{ showPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-error *ngIf="form.get('password')?.hasError('required')">Password is required</mat-error>
            </mat-form-field>

            <div *ngIf="errorMsg" class="error-banner">{{ errorMsg }}</div>

            <button
              mat-raised-button
              color="primary"
              class="full-width submit-btn"
              type="submit"
              [disabled]="loading">
              <mat-spinner *ngIf="loading" diameter="20" class="btn-spinner"></mat-spinner>
              <span *ngIf="!loading">Sign in</span>
            </button>
          </form>

          <p class="switch-link">
            Don't have an account? <a routerLink="/register">Create one</a>
          </p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .auth-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #1a237e 0%, #0d47a1 50%, #01579b 100%);
      padding: 16px;
    }
    .auth-card {
      width: 100%;
      max-width: 420px;
      padding: 24px 16px 16px;
      border-radius: 16px;
      box-sizing: border-box;
    }
    .logo-section {
      text-align: center;
      width: 100%;
      margin-bottom: 16px;
    }
    .trophy { font-size: 44px; display: block; }
    .app-title { margin: 8px 0 0; font-size: 20px; font-weight: 700; color: #1a237e; }
    .app-subtitle { margin: 4px 0 16px; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 2px; }
    .google-btn-wrapper {
      display: flex;
      justify-content: center;
      margin-bottom: 8px;
    }
    .divider {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 16px 0;
      color: #aaa;
      font-size: 13px;
    }
    .divider::before, .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: #e0e0e0;
    }
    .full-width { width: 100%; }
    .submit-btn { margin-top: 8px; height: 44px; font-size: 15px; }
    .btn-spinner { display: inline-block; }
    .error-banner {
      color: #c62828;
      background: #ffebee;
      border-radius: 4px;
      padding: 10px 12px;
      font-size: 13px;
      margin-bottom: 8px;
    }
    .switch-link {
      text-align: center;
      margin-top: 16px;
      font-size: 14px;
      color: #555;
    }
    .switch-link a { color: #1565c0; font-weight: 500; text-decoration: none; }
    .switch-link a:hover { text-decoration: underline; }
  `],
})
export class LoginComponent implements OnInit, AfterViewInit {
  private auth  = inject(AuthService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private zone = inject(NgZone);
  private el = inject(ElementRef);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  loading = false;
  errorMsg = '';
  showPassword = false;

  private get returnUrl(): string {
    return this.route.snapshot.queryParams['returnUrl'] ?? '/';
  }

  constructor() {
    if (this.auth.isLoggedIn()) this.router.navigateByUrl(this.returnUrl);
  }

  ngOnInit(): void {
    if (typeof google !== 'undefined') {
      this.initGoogleSignIn();
    } else {
      const script = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      if (script) script.addEventListener('load', () => this.zone.run(() => this.initGoogleSignIn()));
    }
  }

  ngAfterViewInit(): void {
    // re-render button after view is ready so width is accurate
    if (typeof google !== 'undefined') this.renderGoogleButton();
  }

  private initGoogleSignIn(): void {
    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response: any) => this.zone.run(() => this.handleGoogleResponse(response)),
    });
    this.renderGoogleButton();
  }

  private renderGoogleButton(): void {
    const container = document.getElementById('google-signin-btn');
    if (!container) return;
    const width = Math.min(container.offsetWidth || 340, 400);
    google.accounts.id.renderButton(container, { theme: 'outline', size: 'large', width, text: 'signin_with' });
  }

  private handleGoogleResponse(response: any): void {
    this.loading = true;
    this.errorMsg = '';
    this.auth.googleLogin(response.credential).subscribe({
      next: () => this.router.navigateByUrl(this.returnUrl),
      error: (err) => {
        this.loading = false;
        this.errorMsg = err.error?.message ?? 'Google sign-in failed. Please try again.';
      },
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.errorMsg = '';

    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => this.router.navigateByUrl(this.returnUrl),
      error: (err) => {
        this.loading = false;
        this.errorMsg = err.error?.message ?? 'Sign in failed. Please try again.';
      },
    });
  }
}

