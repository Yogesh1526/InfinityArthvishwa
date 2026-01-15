import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from './auth/auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Dhanvarshagoldloan';
  private tokenCheckInterval: any;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Monitor route changes and check authentication
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const url = event.urlAfterRedirects || event.url;
        
        // If trying to access protected route without login or with expired token, redirect
        if (url !== '/login' && url !== '/' && !url.startsWith('/login')) {
          // Check if token is expired first
          if (this.authService.isTokenExpired()) {
            this.authService.clearAuthData();
            this.router.navigate(['/login'], { replaceUrl: true });
            return;
          }
          
          // Check if user is logged in
          if (!this.authService.isLoggedIn()) {
            this.authService.clearAuthData();
            this.router.navigate(['/login'], { replaceUrl: true });
          }
        }
      });

    // Initial check on app load
    const currentUrl = this.router.url;
    if (currentUrl !== '/login' && currentUrl !== '/' && !currentUrl.startsWith('/login')) {
      // Check if token is expired first
      if (this.authService.isTokenExpired()) {
        this.authService.clearAuthData();
        this.router.navigate(['/login'], { replaceUrl: true });
        return;
      }
      
      // Check if user is logged in
      if (!this.authService.isLoggedIn()) {
        this.authService.clearAuthData();
        this.router.navigate(['/login'], { replaceUrl: true });
      }
    }

    // Set up periodic token expiration check (every 30 seconds)
    // This ensures expired tokens are caught even if user doesn't navigate
    this.tokenCheckInterval = setInterval(() => {
      const currentUrl = this.router.url;
      // Only check if user is on a protected route
      if (currentUrl !== '/login' && currentUrl !== '/' && !currentUrl.startsWith('/login')) {
        if (this.authService.isTokenExpired()) {
          this.authService.clearAuthData();
          this.router.navigate(['/login'], { replaceUrl: true });
        }
      }
    }, 30000); // Check every 30 seconds
  }

  ngOnDestroy(): void {
    // Clear interval when component is destroyed
    if (this.tokenCheckInterval) {
      clearInterval(this.tokenCheckInterval);
    }
  }
}
