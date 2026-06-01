import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { AuthResponse, UserDto } from '../models/auth.models';
import { environment } from '../../../environments/environment';
import { BracketService } from './bracket.service';

const ACCESS_TOKEN_KEY = 'wcp_access';
const REFRESH_TOKEN_KEY = 'wcp_refresh';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  currentUser = signal<UserDto | null>(this.loadUserFromToken());

  constructor(private http: HttpClient, private router: Router, private bracketService: BracketService) {}

  register(name: string, email: string, password: string, phoneNumber: string | null): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/register`, { name, email, password, phoneNumber })
      .pipe(tap(res => this.persist(res)));
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/login`, { email, password })
      .pipe(tap(res => this.persist(res)));
  }

  googleLogin(credential: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/google`, { credential })
      .pipe(tap(res => this.persist(res)));
  }

  refresh(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY) ?? '';
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/refresh`, { refreshToken })
      .pipe(tap(res => this.persist(res)));
  }

  logout(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    this.bracketService.reset();
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.getAccessToken() && this.currentUser() !== null;
  }

  isAdmin(): boolean {
    return this.currentUser()?.isAdmin ?? false;
  }

  private persist(res: AuthResponse): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, res.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, res.refreshToken);
    this.currentUser.set(res.user);
  }

  private loadUserFromToken(): UserDto | null {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) return null;
      return {
        id: parseInt(payload.sub, 10),
        name: payload.name,
        email: payload.email,
        avatarUrl: null,
        isAdmin: payload.isAdmin === 'true',
      };
    } catch {
      return null;
    }
  }
}
