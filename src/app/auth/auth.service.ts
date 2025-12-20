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
  private readonly TOKEN_EXPIRY_KEY = 'auth_token_expiry';
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
          
          // Store token expiration if provided (assuming 24 hours default)
          const expiresIn = response.expiresIn || 86400000; // 24 hours in milliseconds
          const expiryTime = new Date().getTime() + expiresIn;
          localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());
        }
      })
    );
  }

  /**
   * Checks if a token is stored and valid
   */
  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }
    
    // Check if token is expired
    if (this.isTokenExpired()) {
      this.clearAuthData();
      return false;
    }
    
    return true;
  }

  /**
   * Checks if the token has expired
   */
  isTokenExpired(): boolean {
    const expiryTime = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    if (!expiryTime) {
      // If no expiry time is set, assume token is valid (for backward compatibility)
      // But you might want to validate the token structure
      return false;
    }
    
    const now = new Date().getTime();
    return now > parseInt(expiryTime, 10);
  }

  /**
   * Retrieves the stored token
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Validates token format (basic validation)
   */
  isValidTokenFormat(token: string): boolean {
    // Basic JWT token format validation
    // JWT tokens have 3 parts separated by dots
    const parts = token.split('.');
    return parts.length === 3;
  }

  /**
   * Clears all authentication data
   */
  clearAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
  }

  /**
   * Clears token and navigates to login
   */
  logout(): void {
    this.clearAuthData();
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  /**
   * Check if user should be redirected after login
   */
  getReturnUrl(): string | null {
    // This can be used to get the return URL from query params
    return null;
  }
}
