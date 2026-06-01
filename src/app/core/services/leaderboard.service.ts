import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  name: string;
  avatarUrl: string | null;
  totalPoints: number;
  submittedAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class LeaderboardService {
  constructor(private http: HttpClient) {}

  getLeaderboard(tier?: string): Observable<LeaderboardEntry[]> {
    const params: Record<string, string> = {};
    if (tier) params['tier'] = tier;
    return this.http.get<LeaderboardEntry[]>(`${environment.apiUrl}/leaderboard`, { params });
  }
}
