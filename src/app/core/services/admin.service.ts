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

export interface GiveawayEntry {
  id: number;
  userName: string;
  homeScore: number;
  awayScore: number;
  submittedAt: string;
  isCorrect: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly base = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  recalculate(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/recalculate`, {});
  }

  syncResults(days = 3): Observable<{ updated: number }> {
    return this.http.post<{ updated: number }>(`${this.base}/sync-results?days=${days}`, {});
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

  getGroupStageMatches(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/group-matches`);
  }

  getAdminGroups(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/groups`);
  }

  getBest3rdQualifiers(): Observable<{ teamIds: number[] }> {
    return this.http.get<{ teamIds: number[] }>(`${this.base}/best3rd`);
  }

  getGiveaways(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/giveaway`);
  }

  getGiveaway(): Observable<any[]> {
    return this.getGiveaways();
  }

  createGiveaway(matchId: number, prize: string): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.base}/giveaway`, { matchId, prize });
  }

  activateGiveaway(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/giveaway/${id}/activate`, {});
  }

  closeGiveaway(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/giveaway/${id}/close`, {});
  }

  drawGiveaway(id: number, lucky = false): Observable<{ winnerName: string; isLuckyDraw: boolean; message: string }> {
    return this.http.post<{ winnerName: string; isLuckyDraw: boolean; message: string }>(`${this.base}/giveaway/${id}/draw?lucky=${lucky}`, {});
  }

  deleteGiveaway(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/giveaway/${id}`);
  }

  getGiveawayEntries(id: number): Observable<GiveawayEntry[]> {
    return this.http.get<GiveawayEntry[]>(`${this.base}/giveaway/${id}/entries`);
  }
}
