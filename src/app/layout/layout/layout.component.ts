import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.css']
})
export class LayoutComponent implements OnInit {
  isCollapsed = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Check token expiration on component initialization
    // This ensures that if token expires while user is on a protected route,
    // they are immediately redirected to login
    if (this.authService.isTokenExpired()) {
      this.authService.clearAuthData();
      this.router.navigate(['/login'], { replaceUrl: true });
      return;
    }

    // Also check if user is logged in
    if (!this.authService.isLoggedIn()) {
      this.authService.clearAuthData();
      this.router.navigate(['/login'], { replaceUrl: true });
    }
  }

  toggleContentMargin(collapsed: boolean) {
    this.isCollapsed = collapsed;
  }
}
