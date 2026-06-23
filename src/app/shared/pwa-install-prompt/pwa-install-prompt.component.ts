import { Component, OnInit, signal } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-pwa-install-prompt',
  standalone: true,
  imports: [NgIf],
  template: `
    <!-- Android / Desktop Chrome prompt -->
    @if (showAndroid()) {
      <div class="pwa-banner">
        <span class="pwa-icon">🏆</span>
        <div class="pwa-text">
          <strong>Install Predict The Champion</strong>
          <span>Play faster from your home screen</span>
        </div>
        <button class="pwa-install-btn" (click)="install()">Install</button>
        <button class="pwa-close-btn" (click)="dismiss()">✕</button>
      </div>
    }

    <!-- iOS Safari prompt -->
    @if (showIos()) {
      <div class="pwa-banner pwa-banner-ios">
        <span class="pwa-icon">🏆</span>
        <div class="pwa-text">
          <strong>Install Predict The Champion</strong>
          <span>Tap <strong>Share</strong> then <strong>Add to Home Screen</strong></span>
        </div>
        <button class="pwa-close-btn" (click)="dismissIos()">✕</button>
      </div>
    }
  `,
  styles: [`
    .pwa-banner {
      position: fixed; bottom: 16px; left: 16px; right: 16px; z-index: 9999;
      background: #1a237e;
      color: white;
      border-radius: 16px;
      padding: 14px 16px;
      display: flex; align-items: center; gap: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      animation: pwa-slide-up 0.3s ease;
    }
    @keyframes pwa-slide-up {
      from { transform: translateY(100px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    .pwa-icon { font-size: 1.8rem; flex-shrink: 0; }
    .pwa-text { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .pwa-text strong { font-size: 0.9rem; }
    .pwa-text span { font-size: 0.78rem; color: rgba(255,255,255,0.75); }
    .pwa-text span strong { font-size: inherit; color: #f5c518; }
    .pwa-install-btn {
      flex-shrink: 0;
      background: linear-gradient(135deg, #f5c518, #e6a800);
      color: #1a1a1a; border: none;
      padding: 8px 16px; border-radius: 10px;
      font-weight: 800; font-size: 0.85rem; cursor: pointer;
    }
    .pwa-close-btn {
      flex-shrink: 0;
      background: rgba(255,255,255,0.1); border: none;
      color: white; width: 28px; height: 28px;
      border-radius: 50%; cursor: pointer; font-size: 0.8rem;
    }
  `],
})
export class PwaInstallPromptComponent implements OnInit {
  showAndroid = signal(false);
  showIos = signal(false);

  private deferredPrompt: any = null;

  ngOnInit(): void {
    if (this.isIos() && !this.isInStandaloneMode() && !sessionStorage.getItem('pwa-ios-dismissed')) {
      this.showIos.set(true);
      return;
    }

    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e;
      if (!sessionStorage.getItem('pwa-dismissed')) {
        this.showAndroid.set(true);
      }
    });
  }

  install(): void {
    this.showAndroid.set(false);
    this.deferredPrompt?.prompt();
    this.deferredPrompt?.userChoice.then(() => { this.deferredPrompt = null; });
  }

  dismiss(): void {
    this.showAndroid.set(false);
    sessionStorage.setItem('pwa-dismissed', '1');
  }

  dismissIos(): void {
    this.showIos.set(false);
    sessionStorage.setItem('pwa-ios-dismissed', '1');
  }

  private isIos(): boolean {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
  }

  private isInStandaloneMode(): boolean {
    return ('standalone' in window.navigator) && (window.navigator as any).standalone;
  }
}
