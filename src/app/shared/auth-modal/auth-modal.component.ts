import {
  Component, inject, output, signal, OnInit, AfterViewInit, NgZone
} from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIf } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

declare const google: any;

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, NgIf, MatProgressSpinnerModule],
  template: `
    <!-- Backdrop -->
    <div class="modal-backdrop" (click)="onClose()"></div>

    <!-- Modal -->
    <div class="modal-box" (click)="$event.stopPropagation()">
      <button class="modal-close" (click)="onClose()">✕</button>

      <div class="modal-header">
        <span class="trophy">🏆</span>
        <h2>Sign in to save your picks</h2>
        <p>Your bracket selections will be preserved after login.</p>
      </div>

      <!-- Tab toggle -->
      <div class="tab-row">
        <button class="tab-btn" [class.active]="mode() === 'login'"    (click)="mode.set('login')">Sign In</button>
        <button class="tab-btn" [class.active]="mode() === 'register'" (click)="mode.set('register')">Create Account</button>
      </div>

      <!-- Google -->
      <div id="auth-modal-google-btn" class="google-btn-wrapper"></div>

      <div class="divider"><span>or</span></div>

      <!-- Login form -->
      @if (mode() === 'login') {
        <form [formGroup]="loginForm" (ngSubmit)="submitLogin()">
          <input class="field" type="email"    formControlName="email"    placeholder="Email" autocomplete="email" />
          <div class="password-wrap">
            <input class="field" [type]="showPw() ? 'text' : 'password'" formControlName="password" placeholder="Password" autocomplete="current-password" />
            <button type="button" class="pw-toggle" (click)="showPw.set(!showPw())">
              {{ showPw() ? '🙈' : '👁️' }}
            </button>
          </div>
          @if (errorMsg()) { <div class="error-banner">{{ errorMsg() }}</div> }
          <button class="submit-btn" type="submit" [disabled]="loading()">
            @if (loading()) { <span class="spinner"></span> } @else { Sign In }
          </button>
        </form>
      }

      <!-- Register form -->
      @if (mode() === 'register') {
        <form [formGroup]="registerForm" (ngSubmit)="submitRegister()">
          <input class="field" type="text"  formControlName="name"     placeholder="Full name" autocomplete="name" />
          <input class="field" type="email" formControlName="email"    placeholder="Email" autocomplete="email" />
          <div class="password-wrap">
            <input class="field" [type]="showPw() ? 'text' : 'password'" formControlName="password" placeholder="Password" autocomplete="new-password" />
            <button type="button" class="pw-toggle" (click)="showPw.set(!showPw())">
              {{ showPw() ? '🙈' : '👁️' }}
            </button>
          </div>
          @if (errorMsg()) { <div class="error-banner">{{ errorMsg() }}</div> }
          <button class="submit-btn" type="submit" [disabled]="loading()">
            @if (loading()) { <span class="spinner"></span> } @else { Create Account }
          </button>
        </form>
      }
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed; inset: 0; z-index: 999;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(2px);
    }
    .modal-box {
      position: fixed; z-index: 1000;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      background: #fff;
      border-radius: 16px;
      padding: 28px 28px 24px;
      width: min(420px, calc(100vw - 32px));
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .modal-close {
      position: absolute; top: 14px; right: 16px;
      background: none; border: none; font-size: 18px;
      cursor: pointer; color: #888; line-height: 1;
    }
    .modal-close:hover { color: #333; }
    .modal-header { text-align: center; margin-bottom: 16px; }
    .trophy { font-size: 36px; display: block; }
    .modal-header h2 { margin: 8px 0 4px; font-size: 18px; font-weight: 700; color: #1a237e; }
    .modal-header p  { margin: 0; font-size: 13px; color: #666; }
    .tab-row { display: flex; gap: 8px; margin-bottom: 16px; }
    .tab-btn {
      flex: 1; padding: 8px; border-radius: 8px; border: 1px solid #e0e0e0;
      background: #f5f5f5; cursor: pointer; font-size: 14px; font-weight: 500; color: #555;
    }
    .tab-btn.active { background: #1a237e; color: #fff; border-color: #1a237e; }
    .google-btn-wrapper { display: flex; justify-content: center; margin-bottom: 8px; }
    .divider {
      display: flex; align-items: center; gap: 12px;
      margin: 12px 0; color: #aaa; font-size: 13px;
    }
    .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #e0e0e0; }
    .field {
      width: 100%; padding: 10px 12px; margin-bottom: 10px;
      border: 1px solid #ddd; border-radius: 8px; font-size: 14px;
      box-sizing: border-box; outline: none;
    }
    .field:focus { border-color: #1a237e; }
    .password-wrap { position: relative; }
    .password-wrap .field { padding-right: 40px; }
    .pw-toggle {
      position: absolute; right: 10px; top: 50%; transform: translateY(-60%);
      background: none; border: none; cursor: pointer; font-size: 16px; padding: 0;
    }
    .error-banner {
      color: #c62828; background: #ffebee; border-radius: 6px;
      padding: 8px 12px; font-size: 13px; margin-bottom: 10px;
    }
    .submit-btn {
      width: 100%; padding: 11px; background: #1a237e; color: #fff;
      border: none; border-radius: 8px; font-size: 15px; font-weight: 600;
      cursor: pointer; margin-top: 4px; display: flex; align-items: center; justify-content: center;
    }
    .submit-btn:hover:not(:disabled) { background: #283593; }
    .submit-btn:disabled { opacity: 0.6; cursor: default; }
    .spinner {
      width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.4);
      border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite;
      display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class AuthModalComponent implements OnInit, AfterViewInit {
  private readonly auth = inject(AuthService);
  private readonly fb   = inject(FormBuilder);
  private readonly zone = inject(NgZone);

  /** Emitted when login/register succeeds */
  readonly loggedIn = output<void>();
  /** Emitted when user closes the modal */
  readonly closed   = output<void>();

  mode    = signal<'login' | 'register'>('login');
  loading = signal(false);
  errorMsg = signal('');
  showPw  = signal(false);

  loginForm = this.fb.nonNullable.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  registerForm = this.fb.nonNullable.group({
    name:     ['', Validators.required],
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  ngOnInit(): void {
    if (typeof google !== 'undefined') this.initGoogle();
    else {
      const script = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      script?.addEventListener('load', () => this.zone.run(() => this.initGoogle()));
    }
  }

  ngAfterViewInit(): void {
    if (typeof google !== 'undefined') this.renderGoogle();
  }

  private initGoogle(): void {
    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (res: any) => this.zone.run(() => this.handleGoogle(res)),
    });
    this.renderGoogle();
  }

  private renderGoogle(): void {
    const container = document.getElementById('auth-modal-google-btn');
    if (!container) return;
    const width = Math.min(container.offsetWidth || 340, 360);
    google.accounts.id.renderButton(container, { theme: 'outline', size: 'large', width, text: 'signin_with' });
  }

  private handleGoogle(response: any): void {
    this.loading.set(true);
    this.errorMsg.set('');
    this.auth.googleLogin(response.credential).subscribe({
      next: () => { this.loading.set(false); this.loggedIn.emit(); },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err.error?.message ?? 'Google sign-in failed.');
      },
    });
  }

  submitLogin(): void {
    if (this.loginForm.invalid) return;
    this.loading.set(true);
    this.errorMsg.set('');
    const { email, password } = this.loginForm.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => { this.loading.set(false); this.loggedIn.emit(); },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err.error?.message ?? 'Sign in failed.');
      },
    });
  }

  submitRegister(): void {
    if (this.registerForm.invalid) return;
    this.loading.set(true);
    this.errorMsg.set('');
    const { name, email, password } = this.registerForm.getRawValue();
    this.auth.register(name, email, password, null).subscribe({
      next: () => { this.loading.set(false); this.loggedIn.emit(); },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err.error?.message ?? 'Registration failed.');
      },
    });
  }

  onClose(): void {
    this.closed.emit();
  }
}
