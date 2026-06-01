import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BracketDraftMeta, BracketDraftFull, BracketDto } from '../models/tournament.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DraftService {
  private readonly api = `${environment.apiUrl}/drafts`;

  constructor(private http: HttpClient) {}

  list(): Observable<BracketDraftMeta[]> {
    return this.http.get<BracketDraftMeta[]>(this.api);
  }

  get(id: number): Observable<BracketDraftFull> {
    return this.http.get<BracketDraftFull>(`${this.api}/${id}`);
  }

  save(draft: {
    id?: number;
    name: string;
    tier: string;
    groupPicks: any[];
    knockoutPicks: any[];
    best3rdPicks: any[];
  }): Observable<BracketDraftMeta> {
    return this.http.post<BracketDraftMeta>(this.api, draft);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }

  submit(id: number): Observable<BracketDto> {
    return this.http.post<BracketDto>(`${this.api}/${id}/submit`, {});
  }
}
