import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RolePermissionService, Role, Permission, PermissionDto } from '../../../services/role-permission.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-role-form',
  templateUrl: './role-form.component.html',
  styleUrls: ['./role-form.component.css']
})
export class RoleFormComponent implements OnInit {
  roleForm: FormGroup;
  isEditMode = false;
  roleId: number | null = null;
  allPermissions: Permission[] = [];
  filteredPermissions: Permission[] = [];
  isLoading = false;
  isSaving = false;
  searchTerm = '';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private roleService: RolePermissionService,
    private toastService: ToastService
  ) {
    this.roleForm = this.fb.group({
      roleName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      isDefault: ['N', Validators.required],
      status: ['Active', Validators.required],
      permissionDto: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.loadPermissions();
    
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id && id !== 'create') {
        this.isEditMode = true;
        this.roleId = parseInt(id, 10);
        this.loadRole(this.roleId);
      }
    });

    // Filter permissions will be triggered by search input
  }

  loadPermissions(): void {
    this.isLoading = true;
    this.roleService.getAllPermissions().subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response?.data) {
          this.allPermissions = Array.isArray(response.data) ? response.data : [response.data];
        } else if (Array.isArray(response)) {
          this.allPermissions = response;
        } else {
          this.allPermissions = [];
        }
        this.filteredPermissions = [...this.allPermissions];
      },
      error: (err) => {
        this.isLoading = false;
        this.toastService.showError('Failed to load permissions');
        console.error('Error loading permissions:', err);
        // Use mock data for development
        this.allPermissions = this.getMockPermissions();
        this.filteredPermissions = [...this.allPermissions];
      }
    });
  }

  loadRole(roleId: number): void {
    this.isLoading = true;
    this.roleService.getRoleById(roleId).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        const role = response?.data || response;
        if (role) {
          this.roleForm.patchValue({
            roleName: role.roleName,
            isDefault: role.isDefault || 'N',
            status: role.status || 'Active'
          });

          // Load selected permissions
          const permissionArray = this.roleForm.get('permissionDto') as FormArray;
          permissionArray.clear();
          
          if (role.permissionDto && Array.isArray(role.permissionDto)) {
            role.permissionDto.forEach((perm: PermissionDto) => {
              permissionArray.push(this.fb.control(perm.permissionId));
            });
          }
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.toastService.showError('Failed to load role details');
        console.error('Error loading role:', err);
      }
    });
  }

  get permissionFormArray(): FormArray {
    return this.roleForm.get('permissionDto') as FormArray;
  }

  togglePermission(permissionId: number): void {
    const permissionArray = this.permissionFormArray;
    const index = permissionArray.controls.findIndex(
      control => control.value === permissionId
    );

    if (index >= 0) {
      permissionArray.removeAt(index);
    } else {
      permissionArray.push(this.fb.control(permissionId));
    }
  }

  isPermissionSelected(permissionId: number): boolean {
    return this.permissionFormArray.controls.some(
      control => control.value === permissionId
    );
  }

  filterPermissions(): void {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.filteredPermissions = [...this.allPermissions];
      return;
    }

    const term = this.searchTerm.toLowerCase().trim();
    this.filteredPermissions = this.allPermissions.filter(permission => {
      const name = (permission.permissionName || '').toLowerCase();
      const module = (permission.module || '').toLowerCase();
      const description = (permission.description || '').toLowerCase();
      return name.includes(term) || module.includes(term) || description.includes(term);
    });
  }

  onSearchChange(event: any): void {
    this.searchTerm = event.target.value || '';
    this.filterPermissions();
  }

  onSubmit(): void {
    if (this.roleForm.invalid) {
      this.roleForm.markAllAsTouched();
      this.toastService.showWarning('Please fill in all required fields correctly');
      return;
    }

    this.isSaving = true;
    const formValue = this.roleForm.value;
    
    const roleData: Role = {
      roleName: formValue.roleName,
      isDefault: formValue.isDefault,
      status: formValue.status,
      permissionDto: formValue.permissionDto.map((id: number) => ({ permissionId: id }))
    };

    if (this.isEditMode && this.roleId) {
      roleData.roleId = this.roleId;
      this.updateRole(roleData);
    } else {
      this.createRole(roleData);
    }
  }

  createRole(role: Role): void {
    this.roleService.createRole(role).subscribe({
      next: (response: any) => {
        this.isSaving = false;
        if (response?.code === 200 || response?.success) {
          this.toastService.showSuccess('Role created successfully!');
          this.router.navigate(['/roles']);
        } else {
          this.toastService.showError(response?.message || 'Failed to create role');
        }
      },
      error: (err) => {
        this.isSaving = false;
        const errorMsg = err?.error?.message || 'Failed to create role. Please try again.';
        this.toastService.showError(errorMsg);
        console.error('Error creating role:', err);
      }
    });
  }

  updateRole(role: Role): void {
    this.roleService.updateRole(role).subscribe({
      next: (response: any) => {
        this.isSaving = false;
        if (response?.code === 200 || response?.success) {
          this.toastService.showSuccess('Role updated successfully!');
          this.router.navigate(['/roles']);
        } else {
          this.toastService.showError(response?.message || 'Failed to update role');
        }
      },
      error: (err) => {
        this.isSaving = false;
        const errorMsg = err?.error?.message || 'Failed to update role. Please try again.';
        this.toastService.showError(errorMsg);
        console.error('Error updating role:', err);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/roles']);
  }

  getMockPermissions(): Permission[] {
    // Mock permissions for development/testing
    return [
      { permissionId: 1, permissionName: 'View Dashboard', module: 'Dashboard' },
      { permissionId: 2, permissionName: 'Manage Customers', module: 'Customers' },
      { permissionId: 3, permissionName: 'View Loans', module: 'Loans' },
      { permissionId: 4, permissionName: 'Create Loans', module: 'Loans' },
      { permissionId: 5, permissionName: 'Approve Loans', module: 'Loans' },
      { permissionId: 6, permissionName: 'Manage Roles', module: 'Admin' },
      { permissionId: 7, permissionName: 'Manage Users', module: 'Admin' },
      { permissionId: 8, permissionName: 'View Reports', module: 'Reports' }
    ];
  }

  getSelectedPermissionsCount(): number {
    return this.permissionFormArray.length;
  }
}

