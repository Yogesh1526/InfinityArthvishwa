import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

@Injectable({
  providedIn: 'root'
})
export class ToastService {

  constructor(private snackBar: MatSnackBar) {}

  show(message: string, type: ToastType = 'info', duration: number = 5000): void {
    const config: MatSnackBarConfig = {
      duration,
      panelClass: [`toast-${type}`],
      horizontalPosition: 'right',
      verticalPosition: 'top',
    };
    this.snackBar.open(message, 'Close', config);
  }

  showSuccess(message: string, duration?: number) {
    this.show(message, 'success', duration);
  }

  showError(message: string, duration?: number) {
    this.show(message, 'error', duration);
  }

  showInfo(message: string, duration?: number) {
    this.show(message, 'info', duration);
  }

  showWarning(message: string, duration?: number) {
    this.show(message, 'warning', duration);
  }
}
