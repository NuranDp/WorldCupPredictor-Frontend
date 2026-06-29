import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TournamentConfig, TournamentGroup, MatchSlot } from '../models/tournament.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TournamentService {
  constructor(private http: HttpClient) {}

  getConfig(): Observable<TournamentConfig> {
    return this.http.get<TournamentConfig>(`${environment.apiUrl}/tournament/config`);
  }

  getGroups(): Observable<TournamentGroup[]> {
    return this.http.get<TournamentGroup[]>(`${environment.apiUrl}/teams`);
  }

  getKnockoutSlots(): Observable<MatchSlot[]> {
    return this.http.get<MatchSlot[]>(`${environment.apiUrl}/matches`);
  }

  getActualBest3rd(): Observable<{ teamIds: number[] }> {
    return this.http.get<{ teamIds: number[] }>(`${environment.apiUrl}/tournament/actual-best3rd`);
  }
}
