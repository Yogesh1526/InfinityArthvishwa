import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';
import { WebcamComponent } from '../webcam/webcam.component';

@Component({
  selector: 'app-personal-details',
  templateUrl: './personal-details.component.html',
  styleUrls: ['./personal-details.component.css']
})
export class PersonalDetailsComponent implements OnInit, OnChanges {
  customer: any;
  profilePreview: string | ArrayBuffer | null = null;
  isPhotoUploaded = false;
  showPhotoError = false;
  
  @Input() customerId!: string;
  @Input() loanApplicationId!: string;
  @Output() stepCompleted = new EventEmitter<void>();
  @Output() validationFailed = new EventEmitter<string>();

  constructor(
    private personalService: PersonalDetailsService,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    if (this.customerId) {
        this.loadCustomerData(this.customerId);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['customerId'] && changes['customerId'].currentValue && !changes['customerId'].firstChange) {
      this.loadCustomerData(this.customerId);
    }
  }

  loadCustomerData(id: any): void {
    this.personalService.getById(id).subscribe({
      next: (res) => {
        this.customer = res.data;
        // Load photo separately using customerId
        if (this.customerId) {
          this.loadPhoto(this.customerId);
        }
      },
      error: err => {
        // Silently handle - customer may not exist yet
      }
    });
  }

  loadPhoto(customerId: string): void {
    this.personalService.getPhoto(customerId).subscribe({
      next: (blob: Blob) => {
        const reader = new FileReader();
        reader.onload = () => {
          this.profilePreview = reader.result as string;
          this.isPhotoUploaded = true;
          this.showPhotoError = false;
          // Emit step completed when photo exists
          this.stepCompleted.emit();
        };
        reader.readAsDataURL(blob);
      },
      error: err => {
        // Photo may not exist yet, use default
        this.profilePreview = null;
        this.isPhotoUploaded = false;
      }
    });
  }

  /**
   * Validate if the step can be completed
   * Returns true if valid, false otherwise
   */
  validateStep(): boolean {
    if (!this.isPhotoUploaded) {
      this.showPhotoError = true;
      this.toastService.showWarning('Please upload a photo to proceed to the next step');
      this.validationFailed.emit('Photo is required to proceed');
      return false;
    }
    this.showPhotoError = false;
    return true;
  }

  /**
   * Check if step is valid (for parent component to call)
   */
  isStepValid(): boolean {
    return this.isPhotoUploaded;
  }

  onEditClick(): void {
    if (this.customerId) {
      this.router.navigate(['/basic-details', this.customerId]);
    } else {
      this.toastService.showError('Customer ID is not available');
    }
  }

  openWebcam(): void {
    const dialogRef = this.dialog.open(WebcamComponent, {
      width: '480px',
      height: 'auto',
      disableClose: false,
      autoFocus: false
    });
  
    dialogRef.afterClosed().subscribe((dataUrl: string | null) => {
      if (dataUrl) {
        this.profilePreview = dataUrl;
  
        const file = this.dataURLToFile(dataUrl, 'photo.jpg');
        if (this.customerId) {
          // If customer already exists, update photo; otherwise upload new
          if (this.customer?.id) {
            this.personalService.updatePhoto(this.customerId, file).subscribe({
              next: (res) => {
                this.toastService.showSuccess('Photo updated successfully!');
                this.isPhotoUploaded = true;
                this.showPhotoError = false;
                // Emit step completed after successful photo upload
                this.stepCompleted.emit();
              },
              error: (err) => {
                const errorMsg = err?.error?.message || 'Failed to update photo. Please try again.';
                this.toastService.showError(errorMsg);
                this.isPhotoUploaded = false;
              }
            });
          } else {
            this.personalService.uploadPhoto(this.customerId, file).subscribe({
              next: (res) => {
                this.toastService.showSuccess('Photo uploaded successfully!');
                this.isPhotoUploaded = true;
                this.showPhotoError = false;
                // Emit step completed after successful photo upload
                this.stepCompleted.emit();
              },
              error: (err) => {
                const errorMsg = err?.error?.message || 'Failed to upload photo. Please try again.';
                this.toastService.showError(errorMsg);
                this.isPhotoUploaded = false;
              }
            });
          }
        } else {
          this.toastService.showError('Customer ID is not available');
        }
      }
    });
  }
  
  dataURLToFile(dataUrl: string, filename: string): File {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
  
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
  
    return new File([u8arr], filename, { type: mime });
  }
  
}
