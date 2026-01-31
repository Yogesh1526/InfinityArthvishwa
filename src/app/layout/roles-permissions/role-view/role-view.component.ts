import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RolePermissionService, Role } from '../../../services/role-permission.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-role-view',
  templateUrl: './role-view.component.html',
  styleUrls: ['./role-view.component.css']
})
export class RoleViewComponent implements OnInit {
  role: Role | null = null;
  isLoading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private roleService: RolePermissionService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadRole(parseInt(id, 10));
    }
  }

  loadRole(roleId: number): void {
    this.isLoading = true;
    this.roleService.getRoleById(roleId).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.role = res?.data || res || null;
      },
      error: () => {
        this.isLoading = false;
        this.toastService.showError('Failed to load role.');
      }
    });
  }

  getDisplayStatus(role: Role): string {
    return role.isDeleted === false ? 'Active' : 'Inactive';
  }

  getStatusClass(role: Role): string {
    return role.isDeleted === false ? 'status-active' : 'status-inactive';
  }

  getPermissionCount(): number {
    return this.role?.permissionDto?.length ?? this.role?.permissions?.length ?? 0;
  }

  editRole(): void {
    if (this.role?.roleId) this.router.navigate(['/roles/edit', this.role.roleId]);
  }

  goBack(): void {
    this.router.navigate(['/roles']);
  }
}
