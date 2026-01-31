import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  UserManagementService,
  User,
  PaginatedUserResponse
} from '../../../services/user-management.service';
import { ToastService } from '../../../services/toast.service';
import { LoaderService } from '../../../services/loader.service';
import { PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css']
})
export class UserListComponent implements OnInit {
  users: User[] = [];
  displayedColumns: string[] = ['userName', 'name', 'email', 'status', 'roles', 'actions'];
  isLoading = false;

  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;
  pageSizeOptions = [5, 10, 20, 50];

  constructor(
    private userService: UserManagementService,
    private router: Router,
    private toastService: ToastService,
    public loaderService: LoaderService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.userService.getAllUsers(this.pageIndex, this.pageSize).subscribe({
      next: (response: PaginatedUserResponse) => {
        this.isLoading = false;
        if (response.content) {
          this.users = response.content;
          this.totalElements = response.totalElements || 0;
        } else if (Array.isArray(response)) {
          this.users = response as any;
          this.totalElements = this.users.length;
        } else {
          this.users = [];
          this.totalElements = 0;
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.toastService.showError('Failed to load users. Please try again.');
        console.error('Error loading users:', err);
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadUsers();
  }

  createUser(): void {
    this.router.navigate(['/users/create']);
  }

  editUser(user: User): void {
    if (user.userId) {
      this.router.navigate(['/users/edit', user.userId]);
    }
  }

  viewUser(user: User): void {
    if (user.userId) {
      this.router.navigate(['/users/view', user.userId]);
    }
  }

  deleteUser(user: User): void {
    if (!user.userId) return;

    if (confirm(`Are you sure you want to delete the user "${user.userName}"?`)) {
      this.userService.deleteUser(user.userId).subscribe({
        next: () => {
          this.toastService.showSuccess('User deleted successfully');
          this.loadUsers();
        },
        error: (err) => {
          this.toastService.showError('Failed to delete user. Please try again.');
          console.error('Error deleting user:', err);
        }
      });
    }
  }

  getRoleCount(user: User): number {
    return user.roleDto?.length || user.roles?.length || 0;
  }

  getRoleNames(user: User): string {
    const roles = user.roles || [];
    if (roles.length) {
      return roles.map((r: any) => r.roleName || r.roleId).join(', ');
    }
    const roleIds = user.roleDto?.map((r) => r.roleId) || [];
    return roleIds.length ? `${roleIds.length} role(s)` : '-';
  }

  /** Display text: use status if set, else Active when isDeleted is false, Inactive otherwise */
  getDisplayStatus(user: User): string {
    if (user.status != null && user.status !== '') {
      return user.status;
    }
    return user.isDeleted === true ? 'Inactive' : 'Active';
  }

  /** CSS class for status badge from user (status string or isDeleted) */
  getStatusClass(user: User): string {
    if (user.status != null && user.status !== '') {
      return user.status.toLowerCase() === 'active' ? 'status-active' : 'status-inactive';
    }
    return user.isDeleted === true ? 'status-inactive' : 'status-active';
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
