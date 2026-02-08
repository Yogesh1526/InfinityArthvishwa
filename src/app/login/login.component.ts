// login.component.ts
import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { ToastService } from '../services/toast.service';
import { sanitizeInput, isValidUsername, containsMaliciousContent } from '../utils/security.util';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  username = '';
  password = '';
  showPassword = false;
  loginFailed = false;
  isLoading = false;
  usernameFocused = false;
  passwordFocused = false;
  returnUrl: string = '/dashboard';
  loginAttempts = 0;
  maxLoginAttempts = 5;
  isLocked = false;
  lockoutTime: Date | null = null;
  errors: { username?: string; password?: string } = {};

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    // Get return url from route parameters or default to '/dashboard'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
    
    // If already logged in, redirect to return URL
    if (this.authService.isLoggedIn()) {
      this.router.navigate([this.returnUrl]);
    }

    // Check for lockout status
    this.checkLockoutStatus();
  }

  /**
   * Check if account is locked due to too many failed attempts
   */
  checkLockoutStatus(): void {
    const lockoutData = localStorage.getItem('login_lockout');
    if (lockoutData) {
      const { attempts, lockoutUntil } = JSON.parse(lockoutData);
      const now = new Date().getTime();
      
      if (now < lockoutUntil) {
        this.isLocked = true;
        this.loginAttempts = attempts;
        this.lockoutTime = new Date(lockoutUntil);
        const remainingMinutes = Math.ceil((lockoutUntil - now) / 60000);
        this.toastService.showWarning(`Account temporarily locked. Please try again in ${remainingMinutes} minute(s).`);
      } else {
        // Lockout expired, clear it
        localStorage.removeItem('login_lockout');
        this.isLocked = false;
        this.loginAttempts = 0;
      }
    }
  }

  /**
   * Validate form inputs
   */
  validateForm(): boolean {
    this.errors = {};
    let isValid = true;

    // Sanitize and validate username
    const sanitizedUsername = this.username.trim();
    
    if (!sanitizedUsername || sanitizedUsername.length === 0) {
      this.errors.username = 'Username is required';
      isValid = false;
    } else if (containsMaliciousContent(sanitizedUsername)) {
      this.errors.username = 'Username contains invalid characters';
      isValid = false;
    } else if (!isValidUsername(sanitizedUsername)) {
      this.errors.username = 'Username must be 3-30 characters and contain only letters, numbers, and underscores';
      isValid = false;
    }

    // Password validation
    if (!this.password || this.password.length === 0) {
      this.errors.password = 'Password is required';
      isValid = false;
    } else if (this.password.length < 6) {
      this.errors.password = 'Password must be at least 6 characters';
      isValid = false;
    } else if (containsMaliciousContent(this.password)) {
      this.errors.password = 'Password contains invalid characters';
      isValid = false;
    }

    return isValid;
  }

  /**
   * Handle lockout after failed attempts
   */
  handleFailedLogin(): void {
    this.loginAttempts++;
    const lockoutData = localStorage.getItem('login_lockout');
    let attempts = this.loginAttempts;
    let lockoutUntil = new Date().getTime() + (15 * 60 * 1000); // 15 minutes lockout

    if (lockoutData) {
      const data = JSON.parse(lockoutData);
      attempts = data.attempts + 1;
      lockoutUntil = data.lockoutUntil || lockoutUntil;
    }

    if (attempts >= this.maxLoginAttempts) {
      this.isLocked = true;
      this.lockoutTime = new Date(lockoutUntil);
      localStorage.setItem('login_lockout', JSON.stringify({
        attempts,
        lockoutUntil
      }));
      this.toastService.showError('Too many failed login attempts. Account locked for 15 minutes.');
    } else {
      localStorage.setItem('login_lockout', JSON.stringify({
        attempts,
        lockoutUntil: null
      }));
      const remaining = this.maxLoginAttempts - attempts;
      this.toastService.showWarning(`${remaining} attempt(s) remaining before account lockout.`);
    }
  }

  /**
   * Clear lockout on successful login
   */
  clearLockout(): void {
    localStorage.removeItem('login_lockout');
    this.loginAttempts = 0;
    this.isLocked = false;
    this.lockoutTime = null;
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    // Check if account is locked
    if (this.isLocked) {
      if (this.lockoutTime) {
        const now = new Date().getTime();
        const lockoutTime = this.lockoutTime.getTime();
        if (now < lockoutTime) {
          const remainingMinutes = Math.ceil((lockoutTime - now) / 60000);
          this.toastService.showError(`Account is locked. Please try again in ${remainingMinutes} minute(s).`);
          return;
        } else {
          this.clearLockout();
        }
      }
    }

    // Validate form
    if (!this.validateForm()) {
      return;
    }

    // Sanitize inputs using security utilities
    const sanitizedUsername = sanitizeInput(this.username.trim());
    const sanitizedPassword = this.password; // Don't sanitize password as it may contain special chars

    this.loginFailed = false;
    this.isLoading = true;

    this.authService.login(sanitizedUsername, sanitizedPassword).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res?.token) {
          this.clearLockout(); // Clear lockout on successful login
          this.toastService.showSuccess('Login successful!');
          // Redirect to return URL or dashboard
          setTimeout(() => {
            this.router.navigate([this.returnUrl]);
          }, 500);
        } else {
          this.loginFailed = true;
          this.handleFailedLogin();
          this.toastService.showError('Invalid response from server');
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.loginFailed = true;
        this.handleFailedLogin();
        
        let errorMessage = 'Invalid credentials. Please try again.';
        if (err?.error?.message) {
          errorMessage = err.error.message;
        } else if (err?.status === 401) {
          errorMessage = 'Invalid username or password';
        } else if (err?.status === 0) {
          errorMessage = 'Network error. Please check your connection.';
        } else if (err?.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
        
        this.toastService.showError(errorMessage);
        console.error('Login error:', err);
      }
    });
  }

  /**
   * Handle Enter key press
   */
  onKeyPress(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key === 'Enter' && !this.isLoading && !this.isLocked) {
      this.onSubmit();
    }
  }
}
