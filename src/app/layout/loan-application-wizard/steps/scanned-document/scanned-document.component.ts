import { Component, ElementRef, ViewChild, Output, EventEmitter, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-scanned-document',
  templateUrl: './scanned-document.component.html',
  styleUrls: ['./scanned-document.component.css']
})
export class ScannedDocumentComponent implements OnInit, OnChanges {
  @Input() customerId!: string;
  @Input() loanApplicationId!: string;
  @Output() stepCompleted = new EventEmitter<void>();

  form: FormGroup;
  documentPreview: string | ArrayBuffer | null = null;
  selectedFile: File | null = null;
  uploadedDocument: any = null;
  loading = false;
  saving = false;
  loanAccountNumber: string | null = null;

  // Document viewing state
  viewingDocument: { url: string | null; safeUrl: SafeResourceUrl | null; title: string; type: string } | null = null;
  isLoadingDocument = false;

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(
    private fb: FormBuilder,
    private personalService: PersonalDetailsService,
    private toastService: ToastService,
    private sanitizer: DomSanitizer
  ) {
    this.form = this.fb.group({});
  }

  ngOnInit(): void {
    this.loadLoanAccountNumber();
    if (this.customerId && this.loanAccountNumber) {
      this.loadDocument();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['customerId'] && changes['customerId'].currentValue && !changes['customerId'].firstChange) {
      this.loadLoanAccountNumber();
      if (this.customerId && this.loanAccountNumber) {
        this.loadDocument();
      }
    }
  }

  loadLoanAccountNumber(): void {
    if (this.customerId) {
      const stored = localStorage.getItem(`loanAccountNumber_${this.customerId}`);
      if (stored) {
        this.loanAccountNumber = stored;
      }
    }
    if (!this.loanAccountNumber && this.loanApplicationId) {
      this.loanAccountNumber = this.loanApplicationId;
    }
  }

  /**
   * Load scanned document
   */
  loadDocument(): void {
    if (!this.customerId || !this.loanAccountNumber) {
      return;
    }

    this.loading = true;
    this.personalService.getScanDocument(this.customerId, this.loanAccountNumber).subscribe({
      next: (blob: Blob) => {
        this.loading = false;
        if (blob && blob.size > 0) {
          // Document exists
          this.uploadedDocument = {
            exists: true,
            size: blob.size
          };
          this.stepCompleted.emit();
        } else {
          this.uploadedDocument = null;
        }
      },
      error: (err) => {
        this.loading = false;
        // Document doesn't exist yet - that's fine
        this.uploadedDocument = null;
      }
    });
  }

  /**
   * Handle file selection
   */
  onFileChange(event: any): void {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    this.selectedFile = file;

    // Show preview for images only
    if (file.type.startsWith('image')) {
      const reader = new FileReader();
      reader.onload = () => {
        this.documentPreview = reader.result;
      };
      reader.readAsDataURL(file);
    } else {
      // For PDF, Word, etc., just show file name
      this.documentPreview = null;
    }
  }

  /**
   * Trigger file input
   */
  triggerFileInput(): void {
    if (this.fileInput) {
      this.fileInput.nativeElement.click();
    }
  }

  /**
   * Clear selected file
   */
  clearFile(): void {
    this.selectedFile = null;
    this.documentPreview = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  /**
   * Upload document to server
   */
  uploadDocument(): void {
    if (!this.selectedFile) {
      this.toastService.showWarning('Please select a file first.');
      return;
    }

    if (!this.customerId || !this.loanAccountNumber) {
      this.toastService.showError('Customer ID and Loan Account Number are required.');
      return;
    }

    this.saving = true;
    this.personalService.uploadScanDocument(this.customerId, this.loanAccountNumber, this.selectedFile).subscribe({
      next: (response) => {
        this.saving = false;
        this.toastService.showSuccess('Scanned document uploaded successfully!');
        // Clear form
        this.selectedFile = null;
        this.documentPreview = null;
        this.clearFile();
        // Reload document to verify upload
        this.loadDocument();
        this.stepCompleted.emit();
      },
      error: (err) => {
        this.saving = false;
        const errorMsg = err?.error?.message || 'Failed to upload document. Please try again.';
        this.toastService.showError(errorMsg);
      }
    });
  }

  /**
   * View document
   */
  viewDocument(): void {
    if (!this.customerId || !this.loanAccountNumber) {
      return;
    }

    this.isLoadingDocument = true;

    this.personalService.getScanDocument(this.customerId, this.loanAccountNumber).subscribe({
      next: (blob: Blob) => {
        this.isLoadingDocument = false;
        const url = window.URL.createObjectURL(blob);
        
        // Determine file type
        const fileType = blob.type || 'application/pdf';
        let safeUrl: SafeResourceUrl | null = null;
        let type = 'pdf';
        
        if (fileType.startsWith('image')) {
          type = 'image';
          safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        } else if (fileType === 'application/pdf') {
          type = 'pdf';
          safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        } else {
          type = 'download';
        }

        this.viewingDocument = {
          url: type === 'download' ? url : null,
          safeUrl: safeUrl,
          title: 'Scanned Document',
          type: type
        };
      },
      error: (err) => {
        this.isLoadingDocument = false;
        this.toastService.showError('Failed to load document. Please try again.');
      }
    });
  }

  /**
   * Close document viewer
   */
  closeDocumentViewer(): void {
    if (this.viewingDocument?.url) {
      window.URL.revokeObjectURL(this.viewingDocument.url);
    }
    this.viewingDocument = null;
  }

  /**
   * Download document
   */
  downloadDocument(): void {
    if (!this.customerId || !this.loanAccountNumber) {
      return;
    }

    this.isLoadingDocument = true;

    this.personalService.getScanDocument(this.customerId, this.loanAccountNumber).subscribe({
      next: (blob: Blob) => {
        this.isLoadingDocument = false;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'scanned-document.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.isLoadingDocument = false;
        this.toastService.showError('Failed to download document. Please try again.');
      }
    });
  }

  /**
   * Get file icon based on file name
   */
  getFileIcon(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    switch (extension) {
      case 'pdf':
        return 'picture_as_pdf';
      case 'doc':
      case 'docx':
        return 'description';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'image';
      default:
        return 'insert_drive_file';
    }
  }

  /**
   * Format file size to human readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

