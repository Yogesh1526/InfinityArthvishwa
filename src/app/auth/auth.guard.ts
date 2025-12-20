// auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { ToastService } from '../services/toast.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    // First, clear any expired tokens
    if (this.authService.isTokenExpired()) {
      this.authService.clearAuthData();
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: state.url },
        replaceUrl: true
      });
      this.toastService.showError('Your session has expired. Please login again.');
      return false;
    }

    // Check if user is logged in
    if (!this.authService.isLoggedIn()) {
      // Clear any stale data
      this.authService.clearAuthData();
      // Store the attempted URL for redirecting after login
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: state.url },
        replaceUrl: true
      });
      this.toastService.showWarning('Please login to access this page');
      return false;
    }

    return true;
  }
}
