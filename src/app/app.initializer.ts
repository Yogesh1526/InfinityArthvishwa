import { Router } from '@angular/router';
import { AuthService } from './auth/auth.service';

/**
 * App Initializer - Runs before the app starts
 * Ensures authentication is checked on app load
 */
export function appInitializer(authService: AuthService, router: Router): () => Promise<void> {
  return () => {
    return new Promise<void>((resolve) => {
      // Always clear any stale/invalid tokens first
      const token = authService.getToken();
      if (token && authService.isTokenExpired()) {
        authService.clearAuthData();
      }

      // Check if user is logged in on app startup
      if (!authService.isLoggedIn()) {
        // Clear any stale data
        authService.clearAuthData();
        // Get current URL
        const currentUrl = window.location.pathname;
        
        // If trying to access any route other than login, redirect to login
        if (currentUrl !== '/login' && currentUrl !== '/' && !currentUrl.startsWith('/login')) {
          router.navigate(['/login'], { replaceUrl: true }).then(() => {
            resolve();
          }).catch(() => {
            // If navigation fails, still resolve to prevent app from hanging
            resolve();
          });
        } else {
          resolve();
        }
      } else {
        // User is logged in, allow the app to continue
        resolve();
      }
    });
  };
}

