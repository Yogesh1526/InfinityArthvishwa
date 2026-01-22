import { Component, ElementRef, ViewChild, Output, EventEmitter, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ClientDocumentService } from 'src/app/services/client-document.service';
import { ToastService } from 'src/app/services/toast.service';

interface DocumentItem {
  id?: number;
  customerId?: string;
  fileName?: string;
  fileType?: string;
  uploadedAt?: string;
  documentType?: string;
  [key: string]: any;
}

@Component({
  selector: 'app-additional-documents',
  templateUrl: './additional-documents.component.html',
  styleUrls: ['./additional-documents.component.css']
})
export class AdditionalDocumentsComponent implements OnInit, OnChanges {
  @Input() customerId!: string;
  @Output() stepCompleted = new EventEmitter<void>();

  form: FormGroup;
  documentPreview: string | ArrayBuffer | null = null;
  selectedFile: File | null = null;
  uploadedDocuments: DocumentItem[] = [];
  loading = false;
  saving = false;

  // Document type options
  documentTypes = [
    { value: 'incomeProof', label: 'Income Proof' },
    { value: 'addressProof', label: 'Address Proof' },
    { value: 'other', label: 'Other (Custom)' }
  ];
  selectedDocumentType: string = '';
  customDocumentType: string = '';
  showCustomInput: boolean = false;

  // Document viewing state
  viewingDocument: { url: string | null; safeUrl: SafeResourceUrl | null; title: string; type: string } | null = null;
  isLoadingDocument: { [key: string]: boolean } = {};

  @ViewChild('incomeProof') incomeProofInput!: ElementRef<HTMLInputElement>;
  @ViewChild('addressProof') addressProofInput!: ElementRef<HTMLInputElement>;
  @ViewChild('otherDocument') otherDocumentInput!: ElementRef<HTMLInputElement>;

  constructor(
    private fb: FormBuilder,
    private clientDocumentService: ClientDocumentService,
    private toastService: ToastService,
    private sanitizer: DomSanitizer
  ) {
    this.form = this.fb.group({
      documentType: [''],
      customDocumentType: ['']
    });
  }

  ngOnInit(): void {
    if (this.customerId) {
      this.loadDocuments();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['customerId'] && changes['customerId'].currentValue && !changes['customerId'].firstChange) {
      this.loadDocuments();
    }
  }

  /**
   * Load all documents for the customer
   */
  loadDocuments(): void {
    if (!this.customerId) {
      return;
    }

    this.loading = true;
    this.clientDocumentService.getAllClientDocuments(this.customerId).subscribe({
      next: (response) => {
        this.loading = false;
        this.uploadedDocuments = response?.data || response || [];
        this.processExistingDocuments();
        // Mark step as completed if documents exist
        if (this.uploadedDocuments.length > 0) {
          this.stepCompleted.emit();
        }
      },
      error: (err) => {
        this.loading = false;
        // Silently handle - no documents means form is empty, which is fine
        this.uploadedDocuments = [];
      }
    });
  }

  /**
   * Process existing documents
   */
  processExistingDocuments(): void {
    // Documents are already loaded in uploadedDocuments array
    // No need to categorize them anymore
  }

  /**
   * On document type change
   */
  onDocumentTypeChange(): void {
    if (this.selectedDocumentType === 'other') {
      this.showCustomInput = true;
      this.customDocumentType = '';
    } else {
      this.showCustomInput = false;
      this.customDocumentType = '';
    }
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
    const input = document.getElementById('document-upload') as HTMLInputElement;
    if (input) {
      input.click();
    }
  }

  /**
   * Clear selected file
   */
  clearFile(): void {
    this.selectedFile = null;
    this.documentPreview = null;
    const input = document.getElementById('document-upload') as HTMLInputElement;
    if (input) {
      input.value = '';
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

    if (!this.selectedDocumentType) {
      this.toastService.showWarning('Please select a document type.');
      return;
    }

    if (this.selectedDocumentType === 'other' && !this.customDocumentType.trim()) {
      this.toastService.showWarning('Please enter a custom document type.');
      return;
    }

    if (!this.customerId) {
      this.toastService.showError('Customer ID is required.');
      return;
    }

    // Determine document type to send to API
    const documentType = this.selectedDocumentType === 'other' 
      ? this.customDocumentType.trim() 
      : this.selectedDocumentType;

    this.saving = true;
    this.clientDocumentService.saveClientDocument(this.customerId, this.selectedFile, documentType).subscribe({
      next: (response) => {
        this.saving = false;
        this.toastService.showSuccess('Document uploaded successfully!');
        // Clear form
        this.selectedFile = null;
        this.documentPreview = null;
        this.selectedDocumentType = '';
        this.customDocumentType = '';
        this.showCustomInput = false;
        this.form.reset();
        // Reset file input
        const input = document.getElementById('document-upload') as HTMLInputElement;
        if (input) {
          input.value = '';
        }
        // Reload documents to get the updated list
        this.loadDocuments();
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
  viewDocument(doc: DocumentItem): void {
    if (!doc.id || !this.customerId) {
      return;
    }

    const loadingKey = `view_${doc.id}`;
    this.isLoadingDocument[loadingKey] = true;

    this.clientDocumentService.getClientDocument(this.customerId, doc.id).subscribe({
      next: (blob: Blob) => {
        this.isLoadingDocument[loadingKey] = false;
        const url = window.URL.createObjectURL(blob);
        
        // Determine file type
        const fileName = doc.fileName || '';
        const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
        let fileType = 'image';
        
        if (fileExtension === 'pdf') {
          fileType = 'pdf';
        } else if (['doc', 'docx'].includes(fileExtension)) {
          fileType = 'word';
        } else if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(fileExtension)) {
          fileType = 'image';
        }
        
        // Sanitize URL for iframe
        const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        
        this.viewingDocument = {
          url: url,
          safeUrl: safeUrl,
          title: fileName || `Document ${doc.id}`,
          type: fileType
        };
      },
      error: (err) => {
        this.isLoadingDocument[loadingKey] = false;
        const errorMsg = err?.error?.message || 'Failed to load document. Please try again.';
        this.toastService.showError(errorMsg);
      }
    });
  }

  /**
   * Close document view
   */
  closeDocumentView(): void {
    if (this.viewingDocument?.url) {
      window.URL.revokeObjectURL(this.viewingDocument.url);
    }
    this.viewingDocument = null;
  }

  /**
   * Download a document
   */
  downloadDocument(documentId: number, fileName?: string): void {
    if (!this.customerId) {
      this.toastService.showError('Customer ID is required.');
      return;
    }

    this.clientDocumentService.getClientDocument(this.customerId, documentId).subscribe({
      next: (blob: Blob) => {
        // Create a download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName || `document_${documentId}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        this.toastService.showSuccess('Document downloaded successfully!');
      },
      error: (err) => {
        const errorMsg = err?.error?.message || 'Failed to download document. Please try again.';
        this.toastService.showError(errorMsg);
      }
    });
  }

  /**
   * Delete document
   */
  deleteDocument(doc: DocumentItem): void {
    if (!doc || !doc.id) {
      return;
    }

    if (!this.customerId) {
      this.toastService.showError('Customer ID is required.');
      return;
    }

    // Confirm deletion
    if (!confirm(`Are you sure you want to delete "${doc.fileName || 'this document'}"?`)) {
      return;
    }

    this.clientDocumentService.deleteClientDocument(this.customerId, doc.id).subscribe({
      next: (response) => {
        this.toastService.showSuccess('Document deleted successfully!');
        // Reload documents to get the updated list
        this.loadDocuments();
      },
      error: (err) => {
        const errorMsg = err?.error?.message || 'Failed to delete document. Please try again.';
        this.toastService.showError(errorMsg);
      }
    });
  }

  /**
   * Get file type icon
   */
  getFileIcon(fileName?: string): string {
    if (!fileName) return 'description';
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(ext || '')) {
      return 'image';
    } else if (ext === 'pdf') {
      return 'picture_as_pdf';
    } else if (['doc', 'docx'].includes(ext || '')) {
      return 'description';
    }
    return 'description';
  }


  /**
   * Download document from view modal
   */
  downloadDocumentFromView(): void {
    if (this.viewingDocument?.url) {
      const link = document.createElement('a');
      link.href = this.viewingDocument.url;
      link.download = this.viewingDocument.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  validateStep(): boolean {
    // At least one document is required
    if (this.uploadedDocuments.length === 0) {
      this.toastService.showWarning('At least one document is required. Please upload at least one document.');
      return false;
    }
    return true;
  }
}
