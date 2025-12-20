// login.component.ts
import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { ToastService } from '../services/toast.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  username = '';
  password = '';
  loginFailed = false;
  isLoading = false;
  returnUrl: string = '/dashboard';

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
  }

  onSubmit() {
    if (!this.username || !this.password) {
      this.toastService.showWarning('Please enter both username and password');
      return;
    }

    this.loginFailed = false;
    this.isLoading = true;

    this.authService.login(this.username, this.password).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res?.token) {
          this.toastService.showSuccess('Login successful!');
          // Redirect to return URL or dashboard
          this.router.navigate([this.returnUrl]);
        } else {
          this.loginFailed = true;
          this.toastService.showError('Invalid response from server');
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.loginFailed = true;
        const errorMessage = err?.error?.message || 'Invalid credentials. Please try again.';
        this.toastService.showError(errorMessage);
        console.error('Login error:', err);
      }
    });
  }
}
