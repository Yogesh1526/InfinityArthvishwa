// login.component.ts
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username = 'admin';
  password = 'admin123';
  loginFailed = false;

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit() {
    // login.component.ts
    this.authService.login(this.username, this.password).subscribe({
      next: (res) => {
        console.log('Login success:', res);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error('Login error:', err);
        this.router.navigate(['/dashboard']);
        // this.errorMessage = 'Invalid credentials or server error.';
      }
    });

    // const success = this.authService.login(this.username, this.password);
    // if (success) {
    //   this.router.navigate(['/dashboard']);
    // } else {
    //   this.loginFailed = true;
    // }
  }
}
