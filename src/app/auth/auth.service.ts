import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, BehaviorSubject } from 'rxjs';
import { environment } from '../environment';
import { decodeJwtToken, getUserInfoFromToken, getRolesFromToken, isTokenExpired as checkTokenExpired } from '../utils/jwt.util';

export interface UserInfo {
  id?: string;
  username?: string;
  email?: string;
  name?: string;
  roles?: string[];
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly TOKEN_EXPIRY_KEY = 'auth_token_expiry';
  private readonly USER_INFO_KEY = 'user_info';
  private readonly API_URL = `${environment.apiUrl}/api/auth/signin`;
  
  private userInfoSubject = new BehaviorSubject<UserInfo | null>(this.getUserInfo());
  public userInfo$ = this.userInfoSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Initialize user info from storage
    this.loadUserInfoFromStorage();
    // Also try to load from token if storage is empty
    this.loadUserInfoFromToken();
  }

  /**
   * Performs login and stores the token if successful
   */
  login(userName: string, password: string): Observable<any> {
    const body = { userName, password };

    return this.http.post<any>(this.API_URL, body).pipe(
      tap(response => {
        if (response?.token) {
          // Store token
          localStorage.setItem(this.TOKEN_KEY, response.token);
          
          // Decode token to extract user info
          const tokenPayload = decodeJwtToken(response.token);
          
          // Extract user info from token
          const userInfoFromToken = getUserInfoFromToken(response.token);
          
          // Store token expiration
          let expiryTime: number;
          if (tokenPayload?.exp) {
            // exp is in seconds, convert to milliseconds
            expiryTime = tokenPayload.exp * 1000;
          } else {
            // Fallback: use provided expiresIn or default to 24 hours
            const expiresIn = response.expiresIn || 86400000; // 24 hours in milliseconds
            expiryTime = new Date().getTime() + expiresIn;
          }
          localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());
          
          // Store user info - prioritize token data, then response data
          if (userInfoFromToken && (userInfoFromToken.roles || userInfoFromToken.username)) {
            // Use data from token
            this.setUserInfo({
              username: userInfoFromToken.username || userName,
              name: userInfoFromToken['name'] || userInfoFromToken.username || userName,
              email: userInfoFromToken.email || response.email,
              roles: userInfoFromToken.roles || []
            });
          } else if (response.user) {
            // Use data from response
            this.setUserInfo(response.user);
          } else if (response.username || response.name) {
            // Fallback: create user info from available data
            this.setUserInfo({
              username: response.username || userName,
              name: response.name || userName,
              email: response.email,
              roles: response.roles || []
            });
          } else {
            // Last resort: extract from token only
            const roles = getRolesFromToken(response.token);
            const username = userInfoFromToken?.username || userName;
            this.setUserInfo({
              username: username,
              name: username,
              email: userInfoFromToken?.email,
              roles: roles
            });
          }
        }
      })
    );
  }

  /**
   * Load user info from storage on service initialization
   */
  private loadUserInfoFromStorage(): void {
    const userInfo = this.getUserInfo();
    if (userInfo) {
      this.userInfoSubject.next(userInfo);
    }
  }

  /**
   * Store user information
   */
  setUserInfo(userInfo: UserInfo): void {
    try {
      localStorage.setItem(this.USER_INFO_KEY, JSON.stringify(userInfo));
      this.userInfoSubject.next(userInfo);
    } catch (error) {
      console.error('Error storing user info:', error);
    }
  }

  /**
   * Get user information
   */
  getUserInfo(): UserInfo | null {
    try {
      const userInfoStr = localStorage.getItem(this.USER_INFO_KEY);
      if (userInfoStr) {
        return JSON.parse(userInfoStr);
      }
    } catch (error) {
      console.error('Error retrieving user info:', error);
    }
    return null;
  }

  /**
   * Get current username
   */
  getCurrentUsername(): string | null {
    const userInfo = this.getUserInfo();
    return userInfo?.username || userInfo?.name || null;
  }

  /**
   * Checks if a token is stored and valid
   */
  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }
    
    // Check if token is expired (check both JWT exp and stored expiry)
    if (this.isTokenExpired()) {
      this.clearAuthData();
      return false;
    }
    
    // Also check JWT token expiration
    if (checkTokenExpired(token)) {
      this.clearAuthData();
      return false;
    }
    
    return true;
  }

  /**
   * Checks if the token has expired
   */
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) {
      return true;
    }

    // First check JWT token expiration
    if (checkTokenExpired(token)) {
      return true;
    }

    // Also check stored expiry time (for backward compatibility)
    const expiryTime = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    if (expiryTime) {
      const now = new Date().getTime();
      if (now > parseInt(expiryTime, 10)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Load user info from token if not already loaded
   */
  loadUserInfoFromToken(): void {
    const token = this.getToken();
    if (!token) {
      return;
    }

    // If user info is not stored, extract from token
    const storedUserInfo = this.getUserInfo();
    if (!storedUserInfo || !storedUserInfo.roles || storedUserInfo.roles.length === 0) {
      const userInfoFromToken = getUserInfoFromToken(token);
      if (userInfoFromToken && (userInfoFromToken.roles || userInfoFromToken.username)) {
        this.setUserInfo({
          username: userInfoFromToken.username || storedUserInfo?.username,
          name: userInfoFromToken['name'] || userInfoFromToken.username || storedUserInfo?.name,
          email: userInfoFromToken.email || storedUserInfo?.email,
          roles: userInfoFromToken.roles || storedUserInfo?.roles || []
        });
      }
    }
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
    localStorage.removeItem(this.USER_INFO_KEY);
    this.userInfoSubject.next(null);
  }

  /**
   * Clears token and navigates to login
   */
  logout(): void {
    this.clearAuthData();
    // Clear any lockout data on logout
    localStorage.removeItem('login_lockout');
    this.router.navigate(['/login'], { replaceUrl: true });
  }

  /**
   * Check if user has a specific role
   */
  hasRole(role: string): boolean {
    const userInfo = this.getUserInfo();
    if (!userInfo || !userInfo.roles) {
      return false;
    }
    return userInfo.roles.includes(role);
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles: string[]): boolean {
    const userInfo = this.getUserInfo();
    if (!userInfo || !userInfo.roles) {
      return false;
    }
    return roles.some(role => userInfo.roles?.includes(role));
  }

  /**
   * Check if user should be redirected after login
   */
  getReturnUrl(): string | null {
    // This can be used to get the return URL from query params
    return null;
  }
}
