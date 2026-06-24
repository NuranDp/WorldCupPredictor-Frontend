import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SwPush } from '@angular/service-worker';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private readonly http = inject(HttpClient);
  private readonly swPush = inject(SwPush);
  private readonly apiUrl = `${environment.apiUrl}/push`;

  isSubscribed = signal(false);
  isLoading = signal(false);

  get isSupported(): boolean {
    return this.swPush.isEnabled;
  }

  async checkSubscription(): Promise<void> {
    if (!this.isSupported) return;
    const sub = await this.swPush.subscription.pipe().toPromise();
    this.isSubscribed.set(sub !== null);
  }

  async subscribe(): Promise<void> {
    if (!this.isSupported || this.isLoading()) return;
    this.isLoading.set(true);
    try {
      const { publicKey } = await firstValueFrom(
        this.http.get<{ publicKey: string }>(`${this.apiUrl}/vapid-public-key`)
      );

      const sub = await this.swPush.requestSubscription({ serverPublicKey: publicKey });

      const p256dh = this.arrayBufferToBase64(sub.getKey('p256dh'));
      const auth = this.arrayBufferToBase64(sub.getKey('auth'));

      await firstValueFrom(
        this.http.post(`${this.apiUrl}/subscribe`, {
          endpoint: sub.endpoint,
          p256dh,
          auth,
        })
      );

      this.isSubscribed.set(true);
    } catch (err) {
      console.warn('Push subscribe failed:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  async unsubscribe(): Promise<void> {
    if (!this.isSupported || this.isLoading()) return;
    this.isLoading.set(true);
    try {
      const sub = await firstValueFrom(this.swPush.subscription);
      if (sub) {
        await firstValueFrom(
          this.http.post(`${this.apiUrl}/unsubscribe`, { endpoint: sub.endpoint })
        );
        await sub.unsubscribe();
      }
      this.isSubscribed.set(false);
    } catch (err) {
      console.warn('Push unsubscribe failed:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  async toggle(): Promise<void> {
    if (this.isSubscribed()) {
      await this.unsubscribe();
    } else {
      await this.subscribe();
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer | null): string {
    if (!buffer) return '';
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}
