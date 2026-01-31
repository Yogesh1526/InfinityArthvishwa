import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserManagementService, User } from '../../../services/user-management.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-user-view',
  templateUrl: './user-view.component.html',
  styleUrls: ['./user-view.component.css']
})
export class UserViewComponent implements OnInit {
  user: User | null = null;
  isLoading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserManagementService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadUser(parseInt(id, 10));
    }
  }

  loadUser(userId: number): void {
    this.isLoading = true;
    this.userService.getUserById(userId).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.user = res?.data || res || null;
      },
      error: () => {
        this.isLoading = false;
        this.toastService.showError('Failed to load user.');
      }
    });
  }

  getRoleNames(): string {
    if (!this.user) return '-';
    const roles = this.user.roles || [];
    if (roles.length) return roles.map((r: any) => r.roleName).join(', ');
    const n = this.user.roleDto?.length ?? 0;
    return n ? `${n} role(s)` : '-';
  }

  getDisplayStatus(user: User): string {
    if (user.status != null && user.status !== '') return user.status;
    return user.isDeleted === true ? 'Inactive' : 'Active';
  }

  getStatusClass(user: User): string {
    if (user.status != null && user.status !== '') {
      return user.status.toLowerCase() === 'active' ? 'status-active' : 'status-inactive';
    }
    return user.isDeleted === true ? 'status-inactive' : 'status-active';
  }

  editUser(): void {
    if (this.user?.userId) this.router.navigate(['/users/edit', this.user.userId]);
  }

  goBack(): void {
    this.router.navigate(['/users']);
  }
}
