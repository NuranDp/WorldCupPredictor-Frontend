import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MyGroup {
  id: number;
  name: string;
  inviteCode: string;
  createdAt: string;
  ownerId: number;
  ownerName: string;
  isOwner: boolean;
  memberCount: number;
}

export interface GroupLeaderboardEntry {
  rank: number;
  userId: number;
  name: string;
  avatarUrl: string | null;
  totalPoints: number;
  submittedAt: string | null;
}

export interface GroupLeaderboard {
  id: number;
  name: string;
  inviteCode: string;
  ownerId: number;
  entries: GroupLeaderboardEntry[];
}

@Injectable({ providedIn: 'root' })
export class GroupsService {
  private readonly base = `${environment.apiUrl}/groups`;

  constructor(private http: HttpClient) {}

  getMyGroups(): Observable<MyGroup[]> {
    return this.http.get<MyGroup[]>(this.base);
  }

  createGroup(name: string): Observable<MyGroup> {
    return this.http.post<MyGroup>(this.base, { name });
  }

  joinGroup(inviteCode: string): Observable<MyGroup> {
    return this.http.post<MyGroup>(`${this.base}/join`, { inviteCode });
  }

  getLeaderboard(groupId: number, tier?: string): Observable<GroupLeaderboard> {
    const params: Record<string, string> = {};
    if (tier) params['tier'] = tier;
    return this.http.get<GroupLeaderboard>(`${this.base}/${groupId}/leaderboard`, { params });
  }

  leaveGroup(groupId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${groupId}/leave`);
  }

  deleteGroup(groupId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${groupId}`);
  }
}
