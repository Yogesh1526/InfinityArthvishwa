import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { ToastService } from '../services/toast.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly TOKEN_KEY = 'auth_token';

  constructor(
    private router: Router,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // ✅ Skip adding token for the signin endpoint (public endpoint)
    if (req.url.endsWith('/api/auth/signin')) {
      return next.handle(req);
    }

    const token = this.authService.getToken();

    // ✅ For all other API requests, validate token if it exists
    if (token) {
      // ✅ Validate token format before sending
      if (!this.authService.isValidTokenFormat(token)) {
        this.authService.logout();
        this.toastService.showError('Invalid authentication token. Please login again.');
        return throwError(() => new Error('Invalid token format'));
      }

      // ✅ Check if token is expired
      if (this.authService.isTokenExpired()) {
        this.authService.logout();
        this.toastService.showError('Your session has expired. Please login again.');
        return throwError(() => new Error('Token expired'));
      }

      // ✅ Add token to all protected requests
      const clonedRequest = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });

      return this.handleRequest(clonedRequest, next);
    }

    // If no token, let the request proceed (backend will handle 401)
    // But this should rarely happen as AuthGuard should prevent reaching here
    return this.handleRequest(req, next);
  }

  private handleRequest(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle 401 Unauthorized - token expired or invalid
        if (error.status === 401) {
          this.authService.logout();
          this.toastService.showError('Session expired. Please login again.');
        } else if (error.status === 403) {
          this.toastService.showError('You do not have permission to access this resource.');
        } else if (error.status === 0) {
          // Network error
          this.toastService.showError('Network error. Please check your connection.');
        } else if (error.status >= 500) {
          this.toastService.showError('Server error. Please try again later.');
        }

        return throwError(() => error);
      })
    );
  }
}
