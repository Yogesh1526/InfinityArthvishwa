import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from './auth/auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Dhanvarshagoldloan';

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
        
        // If trying to access protected route without login, redirect
        if (url !== '/login' && url !== '/' && !url.startsWith('/login')) {
          if (!this.authService.isLoggedIn()) {
            this.authService.clearAuthData();
            this.router.navigate(['/login'], { replaceUrl: true });
          }
        }
      });

    // Initial check on app load
    const currentUrl = this.router.url;
    if (currentUrl !== '/login' && currentUrl !== '/' && !currentUrl.startsWith('/login')) {
      if (!this.authService.isLoggedIn()) {
        this.authService.clearAuthData();
        this.router.navigate(['/login'], { replaceUrl: true });
      }
    }
  }
}
