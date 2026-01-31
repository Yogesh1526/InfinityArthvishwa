import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormArray,
  FormControl,
  AbstractControl
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UserManagementService, User, UserCreateDto, UserUpdateDto, UserRoleDto } from '../../../services/user-management.service';
import { RolePermissionService, Role } from '../../../services/role-permission.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-user-form',
  templateUrl: './user-form.component.html',
  styleUrls: ['./user-form.component.css']
})
export class UserFormComponent implements OnInit {
  userForm: FormGroup;
  isEditMode = false;
  userId: number | null = null;
  allRoles: Role[] = [];
  filteredRoles: Role[] = [];
  isLoading = false;
  isSaving = false;
  searchTerm = '';
  changePassword = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private userService: UserManagementService,
    private roleService: RolePermissionService,
    private toastService: ToastService
  ) {
    this.userForm = this.fb.group({
      userName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      name: ['', [Validators.maxLength(100)]],
      email: ['', [Validators.email, Validators.maxLength(100)]],
      status: ['Active', Validators.required],
      password: ['', []],
      confirmPassword: ['', []],
      roleDto: this.fb.array([])
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(group: AbstractControl): { [key: string]: boolean } | null {
    const pass = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    if (!pass && !confirm) return null;
    if (pass !== confirm) return { passwordMismatch: true };
    return null;
  }

  ngOnInit(): void {
    this.loadRoles();

    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id && id !== 'create') {
        this.isEditMode = true;
        this.userId = parseInt(id, 10);
        this.setupEditValidators();
        this.loadUser(this.userId);
      } else {
        this.setupCreateValidators();
      }
    });
  }

  private setupCreateValidators(): void {
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.userForm.get('confirmPassword')?.setValidators([Validators.required]);
    this.userForm.get('password')?.updateValueAndValidity();
    this.userForm.get('confirmPassword')?.updateValueAndValidity();
  }

  private setupEditValidators(): void {
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('confirmPassword')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
    this.userForm.get('confirmPassword')?.updateValueAndValidity();
  }

  loadRoles(): void {
    this.isLoading = true;
    this.roleService.getAllRoles(0, 500).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        const content = res?.content;
        let list: Role[] = [];
        if (Array.isArray(content)) {
          list = content;
        } else if (Array.isArray(res)) {
          list = res;
        }
        this.allRoles = list.filter((r) => r.roleId != null);
        this.filteredRoles = [...this.allRoles];
      },
      error: () => {
        this.isLoading = false;
        this.allRoles = this.getMockRoles();
        this.filteredRoles = [...this.allRoles];
      }
    });
  }

  loadUser(userId: number): void {
    this.isLoading = true;
    this.userService.getUserById(userId).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        const user = response?.data || response;
        if (user) {
          this.userForm.patchValue({
            userName: user.userName,
            name: user.name || '',
            email: user.email || '',
            status: user.status || 'Active',
            password: '',
            confirmPassword: ''
          });

          const roleArray = this.userForm.get('roleDto') as FormArray;
          roleArray.clear();
          if (user.roleDto && Array.isArray(user.roleDto)) {
            user.roleDto.forEach((r: UserRoleDto) => {
              roleArray.push(this.fb.control(r.roleId));
            });
          }
          if (user.roles && Array.isArray(user.roles)) {
            user.roles.forEach((r: Role) => {
              if (r.roleId && !roleArray.controls.some((c) => c.value === r.roleId)) {
                roleArray.push(this.fb.control(r.roleId));
              }
            });
          }
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.toastService.showError('Failed to load user details');
        console.error(err);
      }
    });
  }

  get roleFormArray(): FormArray {
    return this.userForm.get('roleDto') as FormArray;
  }

  toggleRole(roleId: number): void {
    const arr = this.roleFormArray;
    const idx = arr.controls.findIndex((c) => c.value === roleId);
    if (idx >= 0) {
      arr.removeAt(idx);
    } else {
      arr.push(this.fb.control(roleId));
    }
  }

  isRoleSelected(roleId: number): boolean {
    return this.roleFormArray.controls.some((c) => c.value === roleId);
  }

  filterRoles(): void {
    if (!this.searchTerm?.trim()) {
      this.filteredRoles = [...this.allRoles];
      return;
    }
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredRoles = this.allRoles.filter((r) => {
      const name = (r.roleName || '').toLowerCase();
      return name.includes(term);
    });
  }

  onSearchChange(event: any): void {
    this.searchTerm = event.target?.value ?? '';
    this.filterRoles();
  }

  onToggleChangePassword(): void {
    this.changePassword = !this.changePassword;
    if (this.changePassword) {
      this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
      this.userForm.get('confirmPassword')?.setValidators([Validators.required]);
    } else {
      this.userForm.get('password')?.setValue('');
      this.userForm.get('confirmPassword')?.setValue('');
      this.userForm.get('password')?.clearValidators();
      this.userForm.get('confirmPassword')?.clearValidators();
    }
    this.userForm.get('password')?.updateValueAndValidity();
    this.userForm.get('confirmPassword')?.updateValueAndValidity();
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      this.toastService.showWarning('Please fill required fields correctly.');
      return;
    }

    this.isSaving = true;
    const v = this.userForm.value;
    if (this.isEditMode && this.userId) {
      const dto: UserUpdateDto = {
        userId: this.userId,
        userName: v.userName,
        name: v.name || undefined,
        email: v.email || undefined,
        status: v.status,
        roleDto: (v.roleDto || []).map((id: number) => ({ roleId: id }))
      };
      if (this.changePassword && v.password) {
        dto.password = v.password;
      }
      this.userService.updateUser(dto).subscribe({
        next: (r: any) => {
          this.isSaving = false;
          if (r?.code === 200 || r?.success) {
            this.toastService.showSuccess('User updated successfully.');
            this.router.navigate(['/users']);
          } else {
            this.toastService.showError(r?.message || 'Update failed.');
          }
        },
        error: (err) => {
          this.isSaving = false;
          this.toastService.showError(err?.error?.message || 'Failed to update user.');
        }
      });
    } else {
      const dto: UserCreateDto = {
        userName: v.userName,
        name: v.name || undefined,
        email: v.email || undefined,
        password: v.password,
        status: v.status,
        roleDto: (v.roleDto || []).map((id: number) => ({ roleId: id }))
      };
      this.userService.createUser(dto).subscribe({
        next: (r: any) => {
          this.isSaving = false;
          if (r?.code === 200 || r?.success) {
            this.toastService.showSuccess('User created successfully.');
            this.router.navigate(['/users']);
          } else {
            this.toastService.showError(r?.message || 'Create failed.');
          }
        },
        error: (err) => {
          this.isSaving = false;
          this.toastService.showError(err?.error?.message || 'Failed to create user.');
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/users']);
  }

  getSelectedRolesCount(): number {
    return this.roleFormArray.length;
  }

  private getMockRoles(): Role[] {
    return [
      { roleId: 1, roleName: 'Admin', status: 'Active' },
      { roleId: 2, roleName: 'User', status: 'Active' }
    ];
  }
}
