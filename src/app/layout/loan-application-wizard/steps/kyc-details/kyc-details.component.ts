import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

interface KycDocument {
  id?: number;
  loanAccountNo: string;
  documentType: string;
  proofType: string | string[];
  side: string;
  identifierNumber?: string;
  fileUrl?: string;
  fileName?: string;
  contentType?: string;
  size?: number;
  uploadedAt?: string;
}

@Component({
  selector: 'app-kyc-details',
  templateUrl: './kyc-details.component.html',
  styleUrls: ['./kyc-details.component.css']
})
export class KycDetailsComponent implements OnInit {
  form: FormGroup;

  aadhaarFrontPreview: string | ArrayBuffer | null = null;
  aadhaarBackPreview: string | ArrayBuffer | null = null;
  panPreview: string | ArrayBuffer | null = null;

  aadhaarFrontFile?: File;
  aadhaarBackFile?: File;
  panFile?: File;

  // Store existing documents
  existingDocuments: KycDocument[] = [];
  aadhaarFrontDoc: KycDocument | null = null;
  aadhaarBackDoc: KycDocument | null = null;
  panDoc: KycDocument | null = null;
  isEditingDocument: 'aadhaarFront' | 'aadhaarBack' | 'pan' | null = null;

  // Track if identifier numbers can be edited
  isEditingAadhaarNumber = false;
  isEditingPanNumber = false;
  originalAadhaarNumber = '';
  originalPanNumber = '';

  @Input() customerId!: string;
  @Input() loanApplicationId!: string;
  @Output() stepCompleted = new EventEmitter<void>();

  // Image viewing state
  viewingImage: { url: SafeUrl | string | null; title: string } | null = null;
  isLoadingImage: { [key: string]: boolean } = {};

  constructor(
    private fb: FormBuilder,
    private personalDetailsService: PersonalDetailsService,
    private toastService: ToastService,
    private sanitizer: DomSanitizer
  ) {
    this.form = this.fb.group({
      aadhaarVerified: [false],
      panVerified: [false],
      aadhaarIdentifierNumber: ['', Validators.required],
      aadhaarDocumentType: ['Addhar Card', Validators.required],
      panIdentifierNumber: ['', Validators.required],
      panDocumentType: ['Pan Card', Validators.required]
    });
  }

  ngOnInit(): void {
    if (this.customerId) {
      this.loadExistingDocuments();
    }
  }

  loadExistingDocuments(): void {
    if (!this.customerId) {
      return;
    }
    this.personalDetailsService.getAllKycDocuments(this.customerId).subscribe({
      next: (res: any) => {
        if (res && res.data && Array.isArray(res.data)) {
          this.existingDocuments = res.data;
          this.processExistingDocuments();
        }
      },
      error: (err: any) => {
        // Silently handle - no documents exist yet
        console.log('No existing KYC documents found');
      }
    });
  }

  processExistingDocuments(): void {
    // Find Aadhaar Front
    this.aadhaarFrontDoc = this.existingDocuments.find(
      doc => (doc.documentType?.toLowerCase().includes('addhar') || 
              doc.documentType?.toLowerCase().includes('aadhaar') ||
              doc.documentType?.toLowerCase().includes('aadhar')) && 
             (doc.side?.toLowerCase() === 'front' || doc.side === 'FRONT')
    ) || null;

    // Find Aadhaar Back
    this.aadhaarBackDoc = this.existingDocuments.find(
      doc => (doc.documentType?.toLowerCase().includes('addhar') || 
              doc.documentType?.toLowerCase().includes('aadhaar') ||
              doc.documentType?.toLowerCase().includes('aadhar')) && 
             (doc.side?.toLowerCase() === 'back' || doc.side === 'BACK')
    ) || null;

    // Find PAN
    this.panDoc = this.existingDocuments.find(
      doc => doc.documentType?.toLowerCase().includes('pan') && 
             (doc.side === 'NA' || !doc.side || doc.side === '' || doc.side?.toLowerCase() === 'na')
    ) || null;

    // Load previews and populate form values
    if (this.aadhaarFrontDoc) {
      this.loadDocumentPreview(this.aadhaarFrontDoc, 'aadhaarFront');
      // Auto-fill Aadhaar identifier number from front document
      if (this.aadhaarFrontDoc.identifierNumber) {
        this.form.patchValue({ aadhaarIdentifierNumber: this.aadhaarFrontDoc.identifierNumber });
      }
    }

    if (this.aadhaarBackDoc) {
      this.loadDocumentPreview(this.aadhaarBackDoc, 'aadhaarBack');
      // If no front doc but back has identifier, use that
      if (!this.aadhaarFrontDoc && this.aadhaarBackDoc.identifierNumber) {
        this.form.patchValue({ aadhaarIdentifierNumber: this.aadhaarBackDoc.identifierNumber });
      }
    }

    if (this.panDoc) {
      this.loadDocumentPreview(this.panDoc, 'pan');
      // Auto-fill PAN identifier number
      if (this.panDoc.identifierNumber) {
        this.form.patchValue({ panIdentifierNumber: this.panDoc.identifierNumber });
      }
    }
  }

  loadDocumentPreview(doc: KycDocument, type: 'aadhaarFront' | 'aadhaarBack' | 'pan'): void {
    const loadingKey = `${type}_${doc.id}`;
    this.isLoadingImage[loadingKey] = true;

    // Try to fetch the document image (returns blob directly)
    this.personalDetailsService.getDocumentByType(
      this.customerId,
      doc.documentType,
      doc.side || 'NA'
    ).subscribe({
      next: (blob: Blob) => {
        // Check if blob is actually an error response
        if (blob.type === 'application/json' || blob.size < 100) {
          this.isLoadingImage[loadingKey] = false;
          return; // Silently fail for preview
        }

        if (blob && blob.size > 0) {
          // Create object URL from blob
          const reader = new FileReader();
          reader.onload = () => {
            const fileUrl = reader.result as string;
            
            if (type === 'aadhaarFront') {
              this.aadhaarFrontPreview = fileUrl;
            } else if (type === 'aadhaarBack') {
              this.aadhaarBackPreview = fileUrl;
            } else if (type === 'pan') {
              this.panPreview = fileUrl;
            }
            this.isLoadingImage[loadingKey] = false;
          };
          reader.onerror = () => {
            this.isLoadingImage[loadingKey] = false;
          };
          reader.readAsDataURL(blob);
        } else {
          this.isLoadingImage[loadingKey] = false;
        }
      },
      error: (err: any) => {
        this.isLoadingImage[loadingKey] = false;
        // Handle error silently - document might not have preview
        console.log('Error loading document preview:', err);
      }
    });
  }

  getContentTypeFromDocument(doc: KycDocument): string {
    if (doc.contentType) {
      return doc.contentType;
    }
    if (doc.fileName) {
      const ext = doc.fileName.toLowerCase().split('.').pop();
      if (ext === 'pdf') return 'application/pdf';
      if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
      if (ext === 'png') return 'image/png';
    }
    return 'image/jpeg'; // Default
  }

  viewDocument(doc: KycDocument, type: 'aadhaarFront' | 'aadhaarBack' | 'pan'): void {
    const loadingKey = `view_${type}_${doc.id}`;
    this.isLoadingImage[loadingKey] = true;

    this.personalDetailsService.getDocumentByType(
      this.customerId,
      doc.documentType,
      doc.side || 'NA'
    ).subscribe({
      next: (response: any) => {
        // Handle both Blob and ArrayBuffer responses
        let blob: Blob;
        
        if (response instanceof Blob) {
          blob = response;
        } else if (response instanceof ArrayBuffer) {
          // Convert ArrayBuffer to Blob
          const contentType = this.getContentTypeFromDocument(doc);
          blob = new Blob([response], { type: contentType });
        } else {
          // If response is not a blob, try to create one
          this.isLoadingImage[loadingKey] = false;
          this.toastService.showError('Invalid response format from server.');
          return;
        }

        // Check if blob is actually an error response (JSON error returned as blob)
        if (blob.type === 'application/json') {
          // Try to read as text to see if it's an error message
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const text = reader.result as string;
              const errorData = JSON.parse(text);
              this.isLoadingImage[loadingKey] = false;
              this.toastService.showError(errorData.message || 'Failed to load document.');
            } catch {
              this.isLoadingImage[loadingKey] = false;
              this.toastService.showError('Failed to load document. Invalid response.');
            }
          };
          reader.onerror = () => {
            this.isLoadingImage[loadingKey] = false;
            this.toastService.showError('Error reading error response.');
          };
          reader.readAsText(blob);
          return;
        }

        // Valid image blob
        if (blob && blob.size > 0) {
          // Use URL.createObjectURL for better performance (no need to convert to base64)
          const objectUrl = URL.createObjectURL(blob);
          const safeUrl = this.sanitizer.bypassSecurityTrustUrl(objectUrl);
          const docTitle = type === 'aadhaarFront' ? 'Aadhaar Front' : 
                          type === 'aadhaarBack' ? 'Aadhaar Back' : 'PAN Card';
          this.viewingImage = { url: safeUrl, title: `${docTitle} - ${doc.documentType}` };
          this.isLoadingImage[loadingKey] = false;
        } else {
          this.isLoadingImage[loadingKey] = false;
          this.toastService.showWarning('Document is empty or not available.');
        }
      },
      error: (err: any) => {
        this.isLoadingImage[loadingKey] = false;
        console.error('Error loading document:', err);
        
        // Handle different error types
        let errorMsg = 'Failed to load document. Please try again.';
        
        // Check if error is due to parsing (Http failure during parsing)
        if (err.name === 'HttpErrorResponse' && err.error instanceof Blob) {
          // Error response is a blob (might be JSON error from server)
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const text = reader.result as string;
              const errorData = JSON.parse(text);
              this.toastService.showError(errorData.message || errorData.error || errorMsg);
            } catch {
              // If can't parse as JSON, it might be an actual error image or empty response
              this.toastService.showError(errorMsg);
            }
          };
          reader.onerror = () => {
            this.toastService.showError(errorMsg);
          };
          reader.readAsText(err.error);
        } else if (err.error && typeof err.error === 'object' && !(err.error instanceof Blob)) {
          // Regular JSON error response
          errorMsg = err.error.message || err.error.error || errorMsg;
          this.toastService.showError(errorMsg);
        } else if (err.status === 404) {
          this.toastService.showError('Document not found.');
        } else if (err.status === 0) {
          this.toastService.showError('Network error. Please check your connection.');
        } else {
          this.toastService.showError(errorMsg);
        }
      }
    });
  }

  closeImageView(): void {
    // Clean up object URL to prevent memory leaks
    if (this.viewingImage && this.viewingImage.url) {
      const url = this.viewingImage.url;
      if (typeof url === 'string' && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      } else if (url && typeof (url as any).changingThisBreaksApplicationSecurity === 'undefined') {
        // It's a SafeUrl, extract the actual URL
        const actualUrl = (url as any).changingThisBreaksApplicationSecurity;
        if (actualUrl && actualUrl.startsWith('blob:')) {
          URL.revokeObjectURL(actualUrl);
        }
      }
    }
    this.viewingImage = null;
  }

  triggerFileInput(id: string) {
    const element = document.getElementById(id) as HTMLElement;
    element.click();
  }

  onFileChange(event: Event, type: 'aadhaarFront' | 'aadhaarBack' | 'pan') {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = () => {
        if (type === 'aadhaarFront') {
          this.aadhaarFrontPreview = reader.result;
          this.aadhaarFrontFile = file;
        } else if (type === 'aadhaarBack') {
          this.aadhaarBackPreview = reader.result;
          this.aadhaarBackFile = file;
        } else if (type === 'pan') {
          this.panPreview = reader.result;
          this.panFile = file;
        }
      };

      if (file.type.startsWith('image')) {
        reader.readAsDataURL(file);
      } else {
        // For PDFs or other types, clear preview but keep file reference
        if (type === 'aadhaarFront') {
          this.aadhaarFrontPreview = null;
          this.aadhaarFrontFile = file;
        } else if (type === 'aadhaarBack') {
          this.aadhaarBackPreview = null;
          this.aadhaarBackFile = file;
        } else if (type === 'pan') {
          this.panPreview = null;
          this.panFile = file;
        }
      }
    }
  }

  uploadDocument(type: 'aadhaarFront' | 'aadhaarBack' | 'pan') {
    let file: File | undefined;
    let proofType = '';
    let side = '';
    let identifierNumber = '';
    let documentType = '';
    let existingDoc: KycDocument | null = null;

    if (type === 'aadhaarFront') {
      file = this.aadhaarFrontFile;
      proofType = 'Address Proof, Age Proof, Id Proof';
      side = 'front';
      identifierNumber = this.form.get('aadhaarIdentifierNumber')?.value;
      documentType = 'Addhar Card';
      existingDoc = this.aadhaarFrontDoc;
    } else if (type === 'aadhaarBack') {
      file = this.aadhaarBackFile;
      proofType = 'Address Proof, Age Proof, Id Proof';
      side = 'back';
      // Use same Aadhaar number as front
      identifierNumber = this.form.get('aadhaarIdentifierNumber')?.value;
      documentType = 'Addhar Card';
      existingDoc = this.aadhaarBackDoc;
    } else if (type === 'pan') {
      file = this.panFile;
      proofType = 'Address Proof, Age Proof, Id Proof';
      side = 'NA';
      identifierNumber = this.form.get('panIdentifierNumber')?.value;
      documentType = 'Pan Card';
      existingDoc = this.panDoc;
    }

    if (!file && !existingDoc) {
      this.toastService.showWarning('Please select a file before uploading.');
      return;
    }

    if (!identifierNumber) {
      this.toastService.showWarning('Please fill in identifier number.');
      return;
    }

    // For Aadhaar back, ensure front identifier is filled
    if (type === 'aadhaarBack' && !identifierNumber) {
      this.toastService.showWarning('Please enter Aadhaar number first (same as front).');
      return;
    }

    // If document exists, update it; otherwise, create new
    if (existingDoc && existingDoc.id) {
      if (!this.customerId) {
        this.toastService.showError('Customer ID is required.');
        return;
      }
      this.personalDetailsService.updateKycDocument({
        customerId: this.customerId,
        file: file,
        proofType,
        side,
        identifierNumber,
        documentType,
        id: existingDoc.id
      }).subscribe({
        next: (res: any) => {
          const documentName = type === 'aadhaarFront' ? 'Aadhaar Front' : 
                              type === 'aadhaarBack' ? 'Aadhaar Back' : 'PAN';
          this.toastService.showSuccess(`${documentName} updated successfully!`);
          this.isEditingDocument = null;
          // Reset editing states
          if (type === 'aadhaarFront' || type === 'aadhaarBack') {
            this.isEditingAadhaarNumber = false;
          } else {
            this.isEditingPanNumber = false;
          }
          this.stepCompleted.emit();
          this.loadExistingDocuments(); // Reload to get updated data
        },
        error: (err: any) => {
          const errorMsg = err?.error?.message || 'Failed to update document. Please try again.';
          this.toastService.showError(errorMsg);
        }
      });
    } else {
      if (!file) {
        this.toastService.showWarning('Please select a file before uploading.');
        return;
      }

      if (!this.customerId) {
        this.toastService.showError('Customer ID is required.');
        return;
      }
      this.personalDetailsService.uploadKycDocument({
        customerId: this.customerId,
        file,
        proofType,
        side,
        identifierNumber,
        documentType
      }).subscribe({
        next: (res: any) => {
          const documentName = type === 'aadhaarFront' ? 'Aadhaar Front' : 
                              type === 'aadhaarBack' ? 'Aadhaar Back' : 'PAN';
          this.toastService.showSuccess(`${documentName} uploaded successfully!`);
          this.isEditingDocument = null;
          // Reset editing states
          if (type === 'aadhaarFront' || type === 'aadhaarBack') {
            this.isEditingAadhaarNumber = false;
          } else {
            this.isEditingPanNumber = false;
          }
          this.stepCompleted.emit();
          this.loadExistingDocuments(); // Reload to get new document
        },
        error: (err: any) => {
          const errorMsg = err?.error?.message || 'Failed to upload document. Please try again.';
          this.toastService.showError(errorMsg);
        }
      });
    }
  }

  deleteDocument(type: 'aadhaarFront' | 'aadhaarBack' | 'pan'): void {
    let doc: KycDocument | null = null;
    let documentName = '';

    if (type === 'aadhaarFront') {
      doc = this.aadhaarFrontDoc;
      documentName = 'Aadhaar Front';
    } else if (type === 'aadhaarBack') {
      doc = this.aadhaarBackDoc;
      documentName = 'Aadhaar Back';
    } else if (type === 'pan') {
      doc = this.panDoc;
      documentName = 'PAN';
    }

    if (!doc || !doc.id) {
      this.toastService.showWarning('No document found to delete.');
      return;
    }

    if (confirm(`Are you sure you want to delete ${documentName}?`)) {
      this.personalDetailsService.deleteKycDocument(doc.id).subscribe({
        next: () => {
          this.toastService.showSuccess(`${documentName} deleted successfully!`);
          // Clear the preview and document reference
          if (type === 'aadhaarFront') {
            this.aadhaarFrontPreview = null;
            this.aadhaarFrontFile = undefined;
            this.aadhaarFrontDoc = null;
          } else if (type === 'aadhaarBack') {
            this.aadhaarBackPreview = null;
            this.aadhaarBackFile = undefined;
            this.aadhaarBackDoc = null;
          } else if (type === 'pan') {
            this.panPreview = null;
            this.panFile = undefined;
            this.panDoc = null;
          }
          this.loadExistingDocuments(); // Reload to refresh list
        },
        error: (err: any) => {
          const errorMsg = err?.error?.message || 'Failed to delete document. Please try again.';
          this.toastService.showError(errorMsg);
        }
      });
    }
  }

  clearFile(type: 'aadhaarFront' | 'aadhaarBack' | 'pan'): void {
    if (type === 'aadhaarFront') {
      this.aadhaarFrontFile = undefined;
      this.aadhaarFrontPreview = null;
    } else if (type === 'aadhaarBack') {
      this.aadhaarBackFile = undefined;
      this.aadhaarBackPreview = null;
    } else if (type === 'pan') {
      this.panFile = undefined;
      this.panPreview = null;
    }
  }

  hasExistingDocument(type: 'aadhaarFront' | 'aadhaarBack' | 'pan'): boolean {
    if (type === 'aadhaarFront') {
      return !!this.aadhaarFrontDoc;
    } else if (type === 'aadhaarBack') {
      return !!this.aadhaarBackDoc;
    } else if (type === 'pan') {
      return !!this.panDoc;
    }
    return false;
  }

  onEditDocument(type: 'aadhaarFront' | 'aadhaarBack' | 'pan'): void {
    this.isEditingDocument = type;
    // Clear any selected files when starting to edit
    if (type === 'aadhaarFront') {
      this.aadhaarFrontFile = undefined;
      this.aadhaarFrontPreview = null;
    } else if (type === 'aadhaarBack') {
      this.aadhaarBackFile = undefined;
      this.aadhaarBackPreview = null;
    } else if (type === 'pan') {
      this.panFile = undefined;
      this.panPreview = null;
    }
  }

  cancelEdit(type: 'aadhaarFront' | 'aadhaarBack' | 'pan'): void {
    this.isEditingDocument = null;
    // Clear any selected files
    if (type === 'aadhaarFront') {
      this.aadhaarFrontFile = undefined;
      this.aadhaarFrontPreview = null;
      // Reload preview if document exists
      if (this.aadhaarFrontDoc) {
        this.loadDocumentPreview(this.aadhaarFrontDoc, 'aadhaarFront');
      }
    } else if (type === 'aadhaarBack') {
      this.aadhaarBackFile = undefined;
      this.aadhaarBackPreview = null;
      if (this.aadhaarBackDoc) {
        this.loadDocumentPreview(this.aadhaarBackDoc, 'aadhaarBack');
      }
    } else if (type === 'pan') {
      this.panFile = undefined;
      this.panPreview = null;
      if (this.panDoc) {
        this.loadDocumentPreview(this.panDoc, 'pan');
      }
    }
  }

  formatFileSize(bytes?: number): string {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }

  formatProofType(proofType?: string | string[]): string {
    if (!proofType) return 'N/A';
    if (Array.isArray(proofType)) {
      return proofType.join(', ');
    }
    return proofType;
  }

  // Check if Aadhaar documents are saved
  get isAadhaarSaved(): boolean {
    return !!(this.aadhaarFrontDoc || this.aadhaarBackDoc);
  }

  // Check if PAN document is saved
  get isPanSaved(): boolean {
    return !!this.panDoc;
  }

  // Enable Aadhaar number editing
  enableAadhaarNumberEdit(): void {
    this.originalAadhaarNumber = this.form.get('aadhaarIdentifierNumber')?.value || '';
    this.isEditingAadhaarNumber = true;
  }

  // Cancel Aadhaar number editing
  cancelAadhaarNumberEdit(): void {
    this.form.patchValue({ aadhaarIdentifierNumber: this.originalAadhaarNumber });
    this.isEditingAadhaarNumber = false;
  }

  // Enable PAN number editing
  enablePanNumberEdit(): void {
    this.originalPanNumber = this.form.get('panIdentifierNumber')?.value || '';
    this.isEditingPanNumber = true;
  }

  // Cancel PAN number editing
  cancelPanNumberEdit(): void {
    this.form.patchValue({ panIdentifierNumber: this.originalPanNumber });
    this.isEditingPanNumber = false;
  }
}
