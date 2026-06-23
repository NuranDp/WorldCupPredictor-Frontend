import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface GiveawayMatch {
  id: number;
  homeTeam: string | null;
  homeTeamFlag: string | null;
  awayTeam: string | null;
  awayTeamFlag: string | null;
  matchDate: string | null;
  homeScore: number | null;
  awayScore: number | null;
}

export interface GiveawayWinner {
  name: string;
  avatarUrl: string | null;
  drawnAt: string;
}

export interface GiveawayDto {
  id: number;
  prize: string;
  status: 'Open' | 'Closed' | 'Drawn';
  entryCount: number;
  isLuckyDraw: boolean;
  match: GiveawayMatch;
  winner: GiveawayWinner | null;
}

export interface MyEntry {
  homeScore: number;
  awayScore: number;
  submittedAt: string;
}

@Injectable({ providedIn: 'root' })
export class GiveawayService {
  private readonly base = `${environment.apiUrl}/giveaway`;

  constructor(private http: HttpClient) {}

  getActive(): Observable<GiveawayDto[]> {
    return this.http.get<GiveawayDto[]>(`${this.base}/active`);
  }

  enter(id: number, homeScore: number, awayScore: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${id}/enter`, { homeScore, awayScore });
  }

  getMyEntry(id: number): Observable<MyEntry | null> {
    return this.http.get<MyEntry | null>(`${this.base}/${id}/my-entry`);
  }
}
