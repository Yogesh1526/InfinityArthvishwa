import { Component, Input, OnInit, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';

interface Document {
  id: number;
  name: string;
  status: 'SUCCESS' | 'PENDING' | 'GENERATING';
  fileName?: string;
}

@Component({
  selector: 'app-loan-agreement-document',
  templateUrl: './loan-agreement-document.component.html',
  styleUrls: ['./loan-agreement-document.component.css']
})
export class LoanAgreementDocumentComponent implements OnInit, OnChanges {
  @Input() customerId!: string;
  @Input() loanApplicationId!: string;
  @Output() stepCompleted = new EventEmitter<void>();

  documents: Document[] = [];
  isLoading = false;
  isGenerating = false;
  loanAccountNumber: string | null = null;

  constructor(
    private personalService: PersonalDetailsService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadStoredLoanAccountNumber();
    // Only check localStorage - NO API call on init
    this.loadFromLocalStorage();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['customerId'] || changes['loanApplicationId']) && !changes['customerId']?.firstChange) {
      this.loadStoredLoanAccountNumber();
      this.loadFromLocalStorage();
    }
  }

  loadStoredLoanAccountNumber(): void {
    if (this.customerId) {
      const stored = localStorage.getItem(`loanAccountNumber_${this.customerId}`);
      if (stored) {
        this.loanAccountNumber = stored;
      }
    }
    if (!this.loanAccountNumber && this.loanApplicationId && 
        (this.loanApplicationId.startsWith('AP') || this.loanApplicationId.startsWith('GL'))) {
      this.loanAccountNumber = this.loanApplicationId;
    }
  }

  getLoanAccountNumber(): string | null {
    return this.loanAccountNumber || this.loanApplicationId || null;
  }

  /**
   * Load document status from localStorage only - NO API call
   */
  loadFromLocalStorage(): void {
    const storedFileName = localStorage.getItem(`loanAgreementDoc_${this.customerId}_${this.getLoanAccountNumber()}`);
    
    if (storedFileName) {
      // Document already generated - show directly
      this.documents = [{
        id: 1,
        name: 'Loan Agreement Document',
        status: 'SUCCESS',
        fileName: storedFileName
      }];
      this.stepCompleted.emit();
    } else {
      // Not generated yet - show pending
      this.documents = [{
        id: 1,
        name: 'Loan Agreement Document',
        status: 'PENDING'
      }];
    }
  }

  /**
   * Generate document - API called only when user clicks button
   */
  generateDocument(): void {
    if (!this.customerId || !this.getLoanAccountNumber()) {
      this.toastService.showWarning('Missing customer or loan account information.');
      return;
    }

    this.isGenerating = true;
    this.documents[0].status = 'GENERATING';

    this.personalService.generateLoanAgreementDocument(this.customerId, this.getLoanAccountNumber()!).subscribe({
      next: (res: any) => {
        this.isGenerating = false;
        
        const fileName = res?.loanAgreementFileName || res?.data?.loanAgreementFileName;
        
        if (fileName) {
          this.documents[0] = {
            id: 1,
            name: 'Loan Agreement Document',
            status: 'SUCCESS',
            fileName: fileName
          };

          // Save to localStorage
          localStorage.setItem(`loanAgreementDoc_${this.customerId}_${this.getLoanAccountNumber()}`, fileName);
          
          this.toastService.showSuccess('Loan Agreement Document generated successfully!');
          this.stepCompleted.emit();

          // Auto open
          this.viewDocument(this.documents[0]);
        } else {
          this.documents[0].status = 'PENDING';
          this.toastService.showError('Failed to get document filename from response.');
        }
      },
      error: (err: any) => {
        this.isGenerating = false;
        this.documents[0].status = 'PENDING';
        this.toastService.showError('Failed to generate document. Please try again.');
      }
    });
  }

  /**
   * View document - opens in new tab
   */
  viewDocument(doc: Document): void {
    if (!doc.fileName) {
      this.toastService.showWarning('Document is not available for viewing.');
      return;
    }
    this.downloadDocument(doc, true);
  }

  /**
   * Download document - API called only when user clicks View/Download
   */
  downloadDocument(doc: Document, openInNewTab: boolean = false): void {
    if (!doc.fileName) {
      this.toastService.showWarning('Document is not available for download.');
      return;
    }

    this.isLoading = true;

    this.personalService.downloadFile(doc.fileName).subscribe({
      next: (blob: Blob) => {
        this.isLoading = false;
        
        const url = window.URL.createObjectURL(blob);
        
        if (openInNewTab) {
          window.open(url, '_blank');
          this.toastService.showSuccess('Opening document...');
        } else {
          const link = document.createElement('a');
          link.href = url;
          link.download = doc.fileName || 'Loan_Agreement.pdf';
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

  getStatusIcon(status: string): string {
    switch (status) {
      case 'SUCCESS':
        return 'check_circle';
      case 'GENERATING':
        return 'sync';
      default:
        return 'pending';
    }
  }
}
