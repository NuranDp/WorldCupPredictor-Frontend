import { Component, Input, OnInit, OnDestroy, signal } from '@angular/core';
import { interval, Subscription } from 'rxjs';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  locked: boolean;
}

@Component({
  selector: 'app-countdown',
  standalone: true,
  template: `
    @if (time().locked) {
      <div class="countdown locked">
        <span class="lock-icon">🔒</span>
        <span class="lock-text">Bracket Locked</span>
      </div>
    } @else {
      <div class="countdown">
        <span class="countdown-label">Bracket locks in</span>
        <div class="segments">
          <div class="seg">
            <span class="val">{{ pad(time().days) }}</span>
            <span class="unit">days</span>
          </div>
          <span class="colon">:</span>
          <div class="seg">
            <span class="val">{{ pad(time().hours) }}</span>
            <span class="unit">hrs</span>
          </div>
          <span class="colon">:</span>
          <div class="seg">
            <span class="val">{{ pad(time().minutes) }}</span>
            <span class="unit">min</span>
          </div>
          <span class="colon">:</span>
          <div class="seg">
            <span class="val">{{ pad(time().seconds) }}</span>
            <span class="unit">sec</span>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .countdown {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, #1a237e, #283593);
      color: white;
      padding: 6px 14px;
      border-radius: 24px;
      font-size: 0.82rem;
      max-width: 100%;
    }
    .countdown.locked {
      background: linear-gradient(135deg, #b71c1c, #c62828);
      gap: 8px;
    }
    .countdown-label { opacity: 0.75; font-size: 0.75rem; white-space: nowrap; }
    .segments { display: flex; align-items: center; gap: 4px; }
    .seg { display: flex; flex-direction: column; align-items: center; min-width: 32px; }
    .val { font-size: 1.05rem; font-weight: 700; line-height: 1; }
    .unit { font-size: 0.6rem; opacity: 0.65; text-transform: uppercase; margin-top: 1px; }
    .colon { font-weight: 700; font-size: 1rem; opacity: 0.5; padding-bottom: 8px; }
    .lock-icon { font-size: 1rem; }
    .lock-text { font-weight: 600; font-size: 0.9rem; }
  `],
})
export class CountdownComponent implements OnInit, OnDestroy {
  @Input({ required: true }) lockDate!: string;

  time = signal<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0, locked: false });
  private sub?: Subscription;

  ngOnInit(): void {
    this.tick();
    this.sub = interval(1000).subscribe(() => this.tick());
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  pad(n: number): string {
    return n.toString().padStart(2, '0');
  }

  private tick(): void {
    const diff = new Date(this.lockDate).getTime() - Date.now();
    if (diff <= 0) {
      this.time.set({ days: 0, hours: 0, minutes: 0, seconds: 0, locked: true });
      return;
    }
    this.time.set({
      days:    Math.floor(diff / 86400000),
      hours:   Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
      locked:  false,
    });
  }
}
