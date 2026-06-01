import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminMatchResult {
  homeScore: number | null;
  awayScore: number | null;
  winnerTeamId: number | null;
}

export interface AdminGroupStandings {
  firstTeamId: number | null;
  secondTeamId: number | null;
}

export interface AdminMatch {
  id: number;
  slotNumber: number;
  round: string;
  homeTeamName: string | null;
  awayTeamName: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly base = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  recalculate(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/recalculate`, {});
  }

  syncResults(): Observable<{ updated: number }> {
    return this.http.post<{ updated: number }>(`${this.base}/sync-results`, {});
  }

  lockBrackets(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/lock-brackets`, {});
  }

  setMatchResult(matchId: number, req: AdminMatchResult): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/match/${matchId}/result`, req);
  }

  setGroupStandings(groupId: number, req: AdminGroupStandings): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/group/${groupId}/standings`, req);
  }

  setBest3rdQualifiers(teamIds: number[]): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/best3rd`, { teamIds });
  }

  getAdminMatches(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/matches`);
  }

  getAdminGroups(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/groups`);
  }

  getBest3rdQualifiers(): Observable<{ teamIds: number[] }> {
    return this.http.get<{ teamIds: number[] }>(`${this.base}/best3rd`);
  }
}
