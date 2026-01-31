import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UserManagementService } from '../services/user-management.service';
import { ToastService } from '../services/toast.service';
import {
  sanitizeInput,
  isValidUsername,
  isValidEmail,
  containsMaliciousContent
} from '../utils/security.util';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
  userName = '';
  email = '';
  name = '';
  password = '';
  confirmPassword = '';
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  errors: { userName?: string; email?: string; password?: string; confirmPassword?: string; name?: string } = {};

  constructor(
    private userService: UserManagementService,
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    if (this.router.url.includes('register')) {
      // Allow access when explicitly on register
    }
  }

  validateForm(): boolean {
    this.errors = {};
    let valid = true;

    const u = this.userName.trim();
    if (!u) {
      this.errors.userName = 'Username is required';
      valid = false;
    } else if (containsMaliciousContent(u)) {
      this.errors.userName = 'Invalid characters';
      valid = false;
    } else if (!isValidUsername(u)) {
      this.errors.userName = '3–30 characters, letters, numbers, underscores only';
      valid = false;
    }

    const e = this.email.trim();
    if (!e) {
      this.errors.email = 'Email is required';
      valid = false;
    } else if (!isValidEmail(e)) {
      this.errors.email = 'Invalid email format';
      valid = false;
    } else if (containsMaliciousContent(e)) {
      this.errors.email = 'Invalid characters';
      valid = false;
    }

    if (!this.password) {
      this.errors.password = 'Password is required';
      valid = false;
    } else if (this.password.length < 6) {
      this.errors.password = 'At least 6 characters';
      valid = false;
    } else if (containsMaliciousContent(this.password)) {
      this.errors.password = 'Invalid characters';
      valid = false;
    }

    if (this.password !== this.confirmPassword) {
      this.errors.confirmPassword = 'Passwords do not match';
      valid = false;
    }

    return valid;
  }

  onSubmit(): void {
    if (!this.validateForm()) return;

    this.isLoading = true;
    const user = sanitizeInput(this.userName.trim());
    const email = sanitizeInput(this.email.trim());
    const name = this.name.trim() ? sanitizeInput(this.name.trim()) : undefined;

    this.userService.register(user, email, this.password, name).subscribe({
      next: () => {
        this.isLoading = false;
        this.toastService.showSuccess('Registration successful. Please sign in.');
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.isLoading = false;
        const msg = err?.error?.message || 'Registration failed. Please try again.';
        this.toastService.showError(msg);
      }
    });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
