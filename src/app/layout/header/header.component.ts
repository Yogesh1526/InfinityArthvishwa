import { Component, EventEmitter, Output, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, UserInfo } from '../../auth/auth.service';
import { ToastService } from '../../services/toast.service';
import { RoleGuard } from '../../auth/role.guard';
import { getRolesFromToken } from '../../utils/jwt.util';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Output() toggleSidebar = new EventEmitter<void>();

  userInfo: UserInfo | null = null;
  username: string = 'User';
  showUserMenu = false;
  private destroy$ = new Subject<void>();

  isAdmin = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private toastService: ToastService,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    // First check if token is expired - if so, redirect to login immediately
    if (this.authService.isTokenExpired()) {
      this.authService.clearAuthData();
      this.router.navigate(['/login'], { replaceUrl: true });
      return;
    }

    // Check if user is logged in
    if (!this.authService.isLoggedIn()) {
      this.authService.clearAuthData();
      this.router.navigate(['/login'], { replaceUrl: true });
      return;
    }

    // Load user info from token first (in case it's not in storage)
    this.authService.loadUserInfoFromToken();

    // Subscribe to user info changes
    this.authService.userInfo$
      .pipe(takeUntil(this.destroy$))
      .subscribe(userInfo => {
        // Check token expiration on each user info update
        if (this.authService.isTokenExpired()) {
          this.authService.clearAuthData();
          this.router.navigate(['/login'], { replaceUrl: true });
          return;
        }
        
        this.userInfo = userInfo;
        this.username = userInfo?.name || userInfo?.username || 'User';
        this.checkAdminRole();
      });

    // Load initial user info
    const currentUserInfo = this.authService.getUserInfo();
    if (currentUserInfo) {
      this.userInfo = currentUserInfo;
      this.username = currentUserInfo.name || currentUserInfo.username || 'User';
    } else {
      // If no user info in storage, try to load from token
      this.authService.loadUserInfoFromToken();
      const tokenUserInfo = this.authService.getUserInfo();
      if (tokenUserInfo) {
        this.userInfo = tokenUserInfo;
        this.username = tokenUserInfo.name || tokenUserInfo.username || 'User';
      }
    }
    
    this.checkAdminRole();
  }

  checkAdminRole(): void {
    // First check from stored user info
    this.isAdmin = RoleGuard.hasAdminRole(this.authService);
    
    // If not admin from stored info, check token directly
    if (!this.isAdmin) {
      const token = this.authService.getToken();
      if (token) {
        const roles = getRolesFromToken(token);
        const ADMIN_ROLES = ['ADMIN', 'admin', 'Admin', 'SUPERADMIN', 'superadmin', 'SuperAdmin'];
        this.isAdmin = roles.some((role: string) => 
          ADMIN_ROLES.includes(role) || role.toLowerCase().includes('admin')
        );
        
        // If we found roles in token but not in storage, update storage
        if (this.isAdmin && roles.length > 0) {
          const currentUserInfo = this.authService.getUserInfo();
          if (!currentUserInfo || !currentUserInfo.roles || currentUserInfo.roles.length === 0) {
            this.authService.setUserInfo({
              ...currentUserInfo,
              roles: roles
            });
          }
        }
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Listen for clicks outside the component to close user menu
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.showUserMenu && !this.elementRef.nativeElement.contains(event.target)) {
      this.closeUserMenu();
    }
  }

  navigateTo(path: string): void {
    this.router.navigate([`/${path}`]);
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  logout(): void {
    this.showUserMenu = false;
    this.toastService.showInfo('Logging out...');
    setTimeout(() => {
      this.authService.logout();
      this.toastService.showSuccess('Logged out successfully');
    }, 300);
  }

  viewProfile(): void {
    this.showUserMenu = false;
    // Navigate to profile page if exists, otherwise show info
    this.toastService.showInfo('Profile feature coming soon');
  }

  closeUserMenu(): void {
    this.showUserMenu = false;
  }

  /**
   * Get user role safely
   */
  getUserRole(): string {
    if (this.userInfo?.roles && this.userInfo.roles.length > 0) {
      return this.userInfo.roles[0];
    }
    return '';
  }

  /**
   * Check if user has email
   */
  hasUserEmail(): boolean {
    return !!this.userInfo?.email;
  }

  /**
   * Get user email safely
   */
  getUserEmail(): string {
    return this.userInfo?.email || '';
  }

  /**
   * Check if user has roles
   */
  hasUserRoles(): boolean {
    return !!(this.userInfo?.roles && this.userInfo.roles.length > 0);
  }
}
