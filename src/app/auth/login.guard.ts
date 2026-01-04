import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * LoginGuard prevents logged-in users from accessing the login page
 * Redirects them to dashboard if they're already authenticated
 */
@Injectable({
  providedIn: 'root'
})
export class LoginGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    // If user is already logged in, redirect to dashboard
    if (this.authService.isLoggedIn() && !this.authService.isTokenExpired()) {
      this.router.navigate(['/dashboard']);
      return false;
    }
    return true;
  }
}

