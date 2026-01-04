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
        let errorMessage = 'An error occurred. Please try again.';
        
        // Handle different error status codes
        if (error.status === 401) {
          // Unauthorized - token expired or invalid
          errorMessage = 'Your session has expired. Please login again.';
          this.authService.logout();
        } else if (error.status === 403) {
          // Forbidden - no permission
          errorMessage = 'You do not have permission to access this resource.';
        } else if (error.status === 404) {
          // Not found
          errorMessage = error.error?.message || 'The requested resource was not found.';
        } else if (error.status === 400) {
          // Bad request
          errorMessage = error.error?.message || 'Invalid request. Please check your input.';
        } else if (error.status === 409) {
          // Conflict
          errorMessage = error.error?.message || 'A conflict occurred. The resource may already exist.';
        } else if (error.status === 422) {
          // Unprocessable entity
          errorMessage = error.error?.message || 'Validation error. Please check your input.';
        } else if (error.status === 429) {
          // Too many requests
          errorMessage = 'Too many requests. Please try again later.';
        } else if (error.status === 0) {
          // Network error
          errorMessage = 'Network error. Please check your internet connection.';
        } else if (error.status >= 500) {
          // Server errors
          errorMessage = error.error?.message || 'Server error. Please try again later.';
        } else if (error.error?.message) {
          // Use server-provided error message if available
          errorMessage = error.error.message;
        }

        // Show appropriate toast notification
        if (error.status === 401) {
          this.toastService.showError(errorMessage, 6000);
        } else if (error.status >= 500) {
          this.toastService.showError(errorMessage, 5000);
        } else if (error.status === 403) {
          this.toastService.showWarning(errorMessage, 5000);
        } else {
          this.toastService.showError(errorMessage, 4000);
        }

        return throwError(() => error);
      })
    );
  }
}
