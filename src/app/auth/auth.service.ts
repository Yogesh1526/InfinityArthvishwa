import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly API_URL = `${environment.apiUrl}/api/auth/signin`;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  /**
   * Performs login and stores the token if successful
   */
  login(userName: string, password: string): Observable<any> {
    const body = { userName, password };

    return this.http.post<any>(this.API_URL, body).pipe(
      tap(response => {
        if (response?.token) {
          localStorage.setItem(this.TOKEN_KEY, response.token);
        }
      })
    );
  }

  /**
   * Checks if a token is stored
   */
  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  /**
   * Retrieves the stored token
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Clears token and navigates to login
   */
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.router.navigate(['/login']);
  }
}
