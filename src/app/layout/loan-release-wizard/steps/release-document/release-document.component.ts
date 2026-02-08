import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';

interface ReleaseDoc {
  id: number;
  name: string;
  status: 'PENDING' | 'GENERATING' | 'SUCCESS';
  fileName?: string;
}

@Component({
  selector: 'app-release-document',
  templateUrl: './release-document.component.html',
  styleUrls: ['./release-document.component.css']
})
export class ReleaseDocumentComponent implements OnInit, OnChanges {
  @Input() customerId!: string;
  @Input() loanAccountNumber!: string;
  @Input() customerName!: string;
  @Input() paymentData: any;
  @Output() stepCompleted = new EventEmitter<void>();

  documents: ReleaseDoc[] = [];
  isLoading = false;
  isGenerating = false;

  constructor(
    private personalService: PersonalDetailsService,
    private toastService: ToastService
  ) {}

  /** localStorage key */
  private get storageKey(): string {
    return `releaseDoc_${this.customerId}_${this.loanAccountNumber}`;
  }

  ngOnInit(): void {
    this.loadFromLocalStorage();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['customerId'] || changes['loanAccountNumber']) && !changes['customerId']?.firstChange) {
      this.loadFromLocalStorage();
    }
  }

  /**
   * Load document status from localStorage (no API call on init)
   */
  loadFromLocalStorage(): void {
    const storedFileName = localStorage.getItem(this.storageKey);

    if (storedFileName) {
      this.documents = [{
        id: 1,
        name: 'Full Release Document',
        status: 'SUCCESS',
        fileName: storedFileName
      }];
      this.stepCompleted.emit();
      // Also persist wizard step
      this.persistWizardStep();
    } else {
      this.documents = [{
        id: 1,
        name: 'Full Release Document',
        status: 'PENDING'
      }];
    }
  }

  /**
   * Generate document — calls GET generate-pdf API
   */
  generateDocument(): void {
    if (!this.customerId || !this.loanAccountNumber) {
      this.toastService.showWarning('Missing customer or loan account information.');
      return;
    }

    this.isGenerating = true;
    this.documents[0].status = 'GENERATING';

    this.personalService.generateFullReleaseDoc(this.customerId, this.loanAccountNumber).subscribe({
      next: (res: any) => {
        this.isGenerating = false;

        // Try to extract fileName from response
        const fileName = res?.fileName || res?.data?.fileName || res?.loanReleaseFileName || res?.data?.loanReleaseFileName;

        if (fileName) {
          this.documents[0] = {
            id: 1,
            name: 'Full Release Document',
            status: 'SUCCESS',
            fileName: fileName
          };

          localStorage.setItem(this.storageKey, fileName);
          this.toastService.showSuccess('Release Document generated successfully!');
          this.stepCompleted.emit();
          this.persistWizardStep();

          // Auto open in new tab
          this.viewDocument(this.documents[0]);
        } else {
          // If no fileName in response, still mark as success (the download API uses customerId/loanAccountNumber)
          this.documents[0] = {
            id: 1,
            name: 'Full Release Document',
            status: 'SUCCESS',
            fileName: 'release_doc'
          };

          localStorage.setItem(this.storageKey, 'release_doc');
          this.toastService.showSuccess('Release Document generated successfully!');
          this.stepCompleted.emit();
          this.persistWizardStep();

          // Auto download
          this.downloadDocument(this.documents[0], true);
        }
      },
      error: (err: any) => {
        this.isGenerating = false;
        this.documents[0].status = 'PENDING';
        const errorMsg = err?.error?.message || 'Failed to generate document. Please try again.';
        this.toastService.showError(errorMsg);
      }
    });
  }

  /**
   * View document — opens in new tab
   */
  viewDocument(doc: ReleaseDoc): void {
    if (doc.status !== 'SUCCESS') {
      this.toastService.showWarning('Please generate the document first.');
      return;
    }
    this.downloadDocument(doc, true);
  }

  /**
   * Download document — calls GET download API (returns blob)
   */
  downloadDocument(doc: ReleaseDoc, openInNewTab: boolean = false): void {
    if (doc.status !== 'SUCCESS') {
      this.toastService.showWarning('Please generate the document first.');
      return;
    }

    this.isLoading = true;

    this.personalService.downloadFullReleaseDoc(this.customerId, this.loanAccountNumber).subscribe({
      next: (blob: Blob) => {
        this.isLoading = false;

        const url = window.URL.createObjectURL(blob);

        if (openInNewTab) {
          window.open(url, '_blank');
          this.toastService.showSuccess('Opening document...');
        } else {
          const link = document.createElement('a');
          link.href = url;
          link.download = doc.fileName || `Release_Document_${this.loanAccountNumber}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          setTimeout(() => {
            window.URL.revokeObjectURL(url);
          }, 100);

          this.toastService.showSuccess('Downloading document...');
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.toastService.showError(`Failed to ${openInNewTab ? 'view' : 'download'} document. Please try again.`);
      }
    });
  }

  /**
   * Persist wizard step completion to localStorage
   */
  private persistWizardStep(): void {
    if (this.customerId && this.loanAccountNumber) {
      localStorage.setItem(`wizard_step_3_${this.customerId}_${this.loanAccountNumber}`, 'true');
    }
  }

  /**
   * Validate step
   */
  validateStep(): boolean {
    if (this.documents[0]?.status !== 'SUCCESS') {
      this.toastService.showWarning('Please generate the release document before completing.');
      return false;
    }
    return true;
  }

  /**
   * Get status icon
   */
  getStatusIcon(status: string): string {
    switch (status) {
      case 'SUCCESS': return 'check_circle';
      case 'GENERATING': return 'sync';
      default: return 'pending';
    }
  }
}
