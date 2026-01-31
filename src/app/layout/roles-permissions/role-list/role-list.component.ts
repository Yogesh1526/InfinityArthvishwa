import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RolePermissionService, Role, PaginatedRoleResponse } from '../../../services/role-permission.service';
import { ToastService } from '../../../services/toast.service';
import { LoaderService } from '../../../services/loader.service';
import { PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-role-list',
  templateUrl: './role-list.component.html',
  styleUrls: ['./role-list.component.css']
})
export class RoleListComponent implements OnInit {
  roles: Role[] = [];
  displayedColumns: string[] = ['roleName', 'status', 'permissions', 'actions'];
  isLoading = false;
  
  // Pagination
  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [5, 10, 20, 50];

  constructor(
    private roleService: RolePermissionService,
    private router: Router,
    private toastService: ToastService,
    public loaderService: LoaderService
  ) {}

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.isLoading = true;
    this.roleService.getAllRoles(this.pageIndex, this.pageSize).subscribe({
      next: (response: PaginatedRoleResponse) => {
        this.isLoading = false;
        if (response.content) {
          this.roles = response.content;
          this.totalElements = response.totalElements || 0;
        } else if (Array.isArray(response)) {
          // Handle case where API returns array directly
          this.roles = response as any;
          this.totalElements = this.roles.length;
        } else {
          this.roles = [];
          this.totalElements = 0;
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.toastService.showError('Failed to load roles. Please try again.');
        console.error('Error loading roles:', err);
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadRoles();
  }

  createRole(): void {
    this.router.navigate(['/roles/create']);
  }

  editRole(role: Role): void {
    if (role.roleId) {
      this.router.navigate(['/roles/edit', role.roleId]);
    }
  }

  viewRole(role: Role): void {
    if (role.roleId) {
      this.router.navigate(['/roles/view', role.roleId]);
    }
  }

  deleteRole(role: Role): void {
    if (!role.roleId) return;
    
    if (confirm(`Are you sure you want to delete the role "${role.roleName}"?`)) {
      this.roleService.deleteRole(role.roleId).subscribe({
        next: () => {
          this.toastService.showSuccess('Role deleted successfully');
          this.loadRoles();
        },
        error: (err) => {
          this.toastService.showError('Failed to delete role. Please try again.');
          console.error('Error deleting role:', err);
        }
      });
    }
  }

  getPermissionCount(role: Role): number {
    return role.permissionDto?.length || role.permissions?.length || 0;
  }

  /** Display status from API: isDeleted false = Active, true = Inactive */
  getDisplayStatus(role: Role): string {
    return role.isDeleted === false ? 'Active' : 'Inactive';
  }

  getStatusClass(role: Role): string {
    return role.isDeleted === false ? 'status-active' : 'status-inactive';
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}

