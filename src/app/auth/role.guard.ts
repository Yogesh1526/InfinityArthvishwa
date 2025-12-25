import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from './auth.service';
import { ToastService } from '../services/toast.service';
import { getRolesFromToken } from '../utils/jwt.util';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  private readonly ADMIN_ROLES = ['ADMIN', 'admin', 'Admin', 'SUPERADMIN', 'superadmin', 'SuperAdmin'];

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    // First check if user is logged in
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: state.url },
        replaceUrl: true
      });
      this.toastService.showError('Please login to access this page');
      return false;
    }

    // Get user info to check roles
    let userInfo = this.authService.getUserInfo();
    let roles: string[] = [];
    
    // Try to get roles from stored user info
    if (userInfo && userInfo.roles && Array.isArray(userInfo.roles)) {
      roles = userInfo.roles;
    } else {
      // If no roles in storage, try to get from token
      const token = this.authService.getToken();
      if (token) {
        roles = getRolesFromToken(token);
        // Update user info with roles from token
        if (roles.length > 0) {
          this.authService.setUserInfo({
            ...userInfo,
            roles: roles
          });
        }
      }
    }

    if (roles.length === 0) {
      this.toastService.showError('Access denied. Admin privileges required.');
      this.router.navigate(['/dashboard']);
      return false;
    }

    // Check if user has admin or superadmin role
    const hasAdminRole = roles.some(role => 
      this.ADMIN_ROLES.includes(role) || 
      role.toLowerCase().includes('admin')
    );

    if (!hasAdminRole) {
      this.toastService.showError('Access denied. This section is only available for administrators.');
      this.router.navigate(['/dashboard']);
      return false;
    }

    return true;
  }

  /**
   * Check if current user has admin role
   */
  static hasAdminRole(authService: AuthService): boolean {
    const ADMIN_ROLES = ['ADMIN', 'admin', 'Admin', 'SUPERADMIN', 'superadmin', 'SuperAdmin'];
    
    // First try to get roles from stored user info
    const userInfo = authService.getUserInfo();
    if (userInfo && userInfo.roles && Array.isArray(userInfo.roles) && userInfo.roles.length > 0) {
      return userInfo.roles.some(role => 
        ADMIN_ROLES.includes(role) || 
        role.toLowerCase().includes('admin')
      );
    }
    
    // If no roles in storage, try to get from token
    const token = authService.getToken();
    if (token) {
      const roles = getRolesFromToken(token);
      if (roles.length > 0) {
        // Update user info with roles from token for future use
        authService.setUserInfo({
          ...userInfo,
          roles: roles
        });
        return roles.some(role => 
          ADMIN_ROLES.includes(role) || 
          role.toLowerCase().includes('admin')
        );
      }
    }
    
    return false;
  }
}

