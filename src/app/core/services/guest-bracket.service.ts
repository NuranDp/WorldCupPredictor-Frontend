import { Injectable, inject } from '@angular/core';
import { BracketService } from './bracket.service';

const STORAGE_KEY = 'ptc_guest_bracket';

interface GuestBracketSnapshot {
  tier: string;
  groupPicks: unknown[];
  knockoutPicks: unknown[];
  best3rdPicks: (number | null)[];
}

@Injectable({ providedIn: 'root' })
export class GuestBracketService {
  private readonly bracketService = inject(BracketService);

  /** Save current picks to localStorage */
  save(): void {
    const snapshot: GuestBracketSnapshot = {
      tier:          this.bracketService.tier(),
      groupPicks:    this.bracketService.groupPicks(),
      knockoutPicks: this.bracketService.knockoutPicks(),
      best3rdPicks:  this.bracketService.best3rdPicks(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }

  /** Restore picks from localStorage into the bracket service */
  restore(): boolean {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;

    try {
      const snapshot: GuestBracketSnapshot = JSON.parse(raw);
      if (snapshot.groupPicks?.length)    this.bracketService.groupPicks.set(snapshot.groupPicks as any);
      if (snapshot.knockoutPicks?.length) this.bracketService.knockoutPicks.set(snapshot.knockoutPicks as any);
      if (snapshot.best3rdPicks)          this.bracketService.best3rdPicks.set(snapshot.best3rdPicks);
      if (snapshot.tier)                  this.bracketService.tier.set(snapshot.tier as any);
      return true;
    } catch {
      return false;
    }
  }

  /** Clear after successful submit */
  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  hasSaved(): boolean {
    return !!localStorage.getItem(STORAGE_KEY);
  }
}
