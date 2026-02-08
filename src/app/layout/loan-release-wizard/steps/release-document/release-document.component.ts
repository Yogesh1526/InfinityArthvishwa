import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';

interface ReleaseDocument {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'pending' | 'generating' | 'generated' | 'error';
  downloadUrl?: string;
  generatedAt?: Date;
}

@Component({
  selector: 'app-release-document',
  templateUrl: './release-document.component.html',
  styleUrls: ['./release-document.component.css']
})
export class ReleaseDocumentComponent implements OnInit {
  @Input() customerId!: string;
  @Input() loanAccountNumber!: string;
  @Input() customerName!: string;
  @Input() paymentData: any;
  @Output() stepCompleted = new EventEmitter<void>();

  documents: ReleaseDocument[] = [];
  isGeneratingAll = false;
  allDocumentsGenerated = false;

  constructor(
    private personalService: PersonalDetailsService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initDocuments();
  }

  /**
   * Initialize document list
   */
  initDocuments(): void {
    this.documents = [
      {
        id: 'release_certificate',
        name: 'Loan Release Certificate',
        description: 'Official certificate confirming loan closure and release of pledged items',
        icon: 'verified',
        status: 'pending'
      },
      {
        id: 'noc',
        name: 'No Objection Certificate (NOC)',
        description: 'Certificate stating no dues remain against the customer',
        icon: 'fact_check',
        status: 'pending'
      },
      {
        id: 'gold_release',
        name: 'Gold Release Form',
        description: 'Authorization form for release of pledged gold items',
        icon: 'receipt_long',
        status: 'pending'
      },
      {
        id: 'payment_receipt',
        name: 'Final Payment Receipt',
        description: 'Receipt for the final payment made towards loan closure',
        icon: 'receipt',
        status: 'pending'
      },
      {
        id: 'account_closure',
        name: 'Account Closure Statement',
        description: 'Detailed statement showing complete transaction history',
        icon: 'summarize',
        status: 'pending'
      }
    ];
  }

  /**
   * Generate a single document
   */
  generateDocument(doc: ReleaseDocument): void {
    if (doc.status === 'generating' || doc.status === 'generated') {
      return;
    }

    doc.status = 'generating';

    // Simulate document generation - In production, this would call actual API
    setTimeout(() => {
      doc.status = 'generated';
      doc.generatedAt = new Date();
      doc.downloadUrl = this.generateMockPdfUrl(doc.id);
      this.toastService.showSuccess(`${doc.name} generated successfully!`);
      this.checkAllDocumentsGenerated();
    }, 1500 + Math.random() * 1000);

    // Actual API call would be:
    // this.personalService.generateReleaseDocument(this.customerId, this.loanAccountNumber, doc.id).subscribe({
    //   next: (res) => { ... },
    //   error: (err) => { ... }
    // });
  }

  /**
   * Generate all documents
   */
  generateAllDocuments(): void {
    if (this.isGeneratingAll) {
      return;
    }

    this.isGeneratingAll = true;
    const pendingDocs = this.documents.filter(d => d.status === 'pending');

    if (pendingDocs.length === 0) {
      this.isGeneratingAll = false;
      this.toastService.showInfo('All documents are already generated.');
      return;
    }

    // Generate documents sequentially with delay
    let index = 0;
    const generateNext = () => {
      if (index < pendingDocs.length) {
        const doc = pendingDocs[index];
        doc.status = 'generating';

        setTimeout(() => {
          doc.status = 'generated';
          doc.generatedAt = new Date();
          doc.downloadUrl = this.generateMockPdfUrl(doc.id);
          index++;
          generateNext();
        }, 1000 + Math.random() * 500);
      } else {
        this.isGeneratingAll = false;
        this.toastService.showSuccess('All documents generated successfully!');
        this.checkAllDocumentsGenerated();
      }
    };

    generateNext();
  }

  /**
   * Generate mock PDF URL (in production, this would come from API)
   */
  private generateMockPdfUrl(docId: string): string {
    return `#document-${docId}-${this.loanAccountNumber}`;
  }

  /**
   * Download a document
   */
  downloadDocument(doc: ReleaseDocument): void {
    if (doc.status !== 'generated' || !doc.downloadUrl) {
      this.toastService.showWarning('Please generate the document first.');
      return;
    }

    // In production, this would trigger actual file download
    this.toastService.showInfo(`Downloading ${doc.name}...`);
    
    // Simulate download
    setTimeout(() => {
      this.toastService.showSuccess(`${doc.name} downloaded successfully!`);
    }, 1000);
  }

  /**
   * Download all documents as ZIP
   */
  downloadAllDocuments(): void {
    const generatedDocs = this.documents.filter(d => d.status === 'generated');
    
    if (generatedDocs.length === 0) {
      this.toastService.showWarning('No documents available to download. Please generate documents first.');
      return;
    }

    this.toastService.showInfo('Preparing documents for download...');
    
    // In production, this would create a ZIP file with all documents
    setTimeout(() => {
      this.toastService.showSuccess('All documents downloaded successfully!');
    }, 1500);
  }

  /**
   * Print a document
   */
  printDocument(doc: ReleaseDocument): void {
    if (doc.status !== 'generated') {
      this.toastService.showWarning('Please generate the document first.');
      return;
    }

    this.toastService.showInfo(`Preparing ${doc.name} for printing...`);
    
    // In production, this would open print dialog
    setTimeout(() => {
      window.print();
    }, 500);
  }

  /**
   * Check if all documents are generated
   */
  private checkAllDocumentsGenerated(): void {
    this.allDocumentsGenerated = this.documents.every(d => d.status === 'generated');
    if (this.allDocumentsGenerated) {
      this.stepCompleted.emit();
    }
  }

  /**
   * Validate step before navigation
   */
  validateStep(): boolean {
    if (!this.allDocumentsGenerated) {
      this.toastService.showWarning('Please generate all required documents before completing the release.');
      return false;
    }
    return true;
  }

  /**
   * Get status icon for document
   */
  getStatusIcon(status: string): string {
    switch (status) {
      case 'generating': return 'hourglass_empty';
      case 'generated': return 'check_circle';
      case 'error': return 'error';
      default: return 'description';
    }
  }

  /**
   * Get status class for document
   */
  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  /**
   * Format date for display
   */
  formatDate(date: Date | undefined): string {
    if (!date) return '-';
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Get count of generated documents
   */
  get generatedCount(): number {
    return this.documents.filter(d => d.status === 'generated').length;
  }

  /**
   * Get progress percentage
   */
  get progressPercentage(): number {
    return (this.generatedCount / this.documents.length) * 100;
  }
}
