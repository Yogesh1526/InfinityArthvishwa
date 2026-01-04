import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';

interface Report {
  id: number;
  name: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  fileName?: string;
  viewUrl?: string;
}

interface Note {
  id: number;
  content: string;
  createdBy: string;
  createdDate: string;
}

@Component({
  selector: 'app-loan-application-approval',
  templateUrl: './loan-application-approval.component.html',
  styleUrls: ['./loan-application-approval.component.css']
})
export class LoanApplicationApprovalComponent implements OnInit {
  @Input() customerId!: string;
  @Input() loanApplicationId!: string;
  @Output() stepCompleted = new EventEmitter<void>();

  reports: Report[] = [];
  notes: Note[] = [];
  isApproved = false;
  isLoading = false;
  loanAccountNumber: string | null = null;
  newNote: string = '';
  isAddingNote = false;

  constructor(
    private personalService: PersonalDetailsService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadStoredLoanAccountNumber();
    this.loadApprovalData();
  }

  /**
   * Load loanAccountNumber from localStorage using customerId as key
   */
  loadStoredLoanAccountNumber(): void {
    if (this.customerId) {
      const stored = localStorage.getItem(`loanAccountNumber_${this.customerId}`);
      if (stored) {
        this.loanAccountNumber = stored;
      }
    }
    // Fallback to loanApplicationId if it's a valid loan account number
    if (!this.loanAccountNumber && this.loanApplicationId && 
        (this.loanApplicationId.startsWith('AP') || this.loanApplicationId.startsWith('GL'))) {
      this.loanAccountNumber = this.loanApplicationId;
    }
  }

  /**
   * Get the loan account number to use for API calls
   */
  getLoanAccountNumber(): string | null {
    return this.loanAccountNumber || this.loanApplicationId || null;
  }

  loadApprovalData(): void {
    if (!this.customerId) {
      return;
    }

    const accountNumber = this.getLoanAccountNumber();
    if (!accountNumber) {
      return;
    }

    this.isLoading = true;
    
    // Load approval files
    this.personalService.getApprovalFiles(this.customerId, accountNumber).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        
        if (res?.code === 200 && res?.data) {
          const fileData = res.data;
          
          // Build reports array from API response
          this.reports = [];
          
          // Map CAM-Gold-File-Name to CAM Gold report
          if (fileData['CAM-Gold-File-Name']) {
            this.reports.push({
              id: 1,
              name: 'CAM Gold Loan Approval',
              status: 'SUCCESS',
              fileName: fileData['CAM-Gold-File-Name']
            });
          }
          
          // Map Credit-Summary-File-Name to Credit Summary report
          if (fileData['Credit-Summary-File-Name']) {
            this.reports.push({
              id: 2,
              name: 'Credit Summary Approval',
              status: 'SUCCESS',
              fileName: fileData['Credit-Summary-File-Name']
            });
          }
          
          // If no reports found, show pending status
          if (this.reports.length === 0) {
            this.reports = [
              {
                id: 1,
                name: 'CAM Gold Loan Approval',
                status: 'PENDING'
              },
              {
                id: 2,
                name: 'Credit Summary Approval',
                status: 'PENDING'
              }
            ];
          }
          
          // Check if loan is approved (both reports available)
          this.isApproved = this.reports.length === 2 && 
                           this.reports.every(r => r.status === 'SUCCESS');
        } else {
          // If API call fails or returns no data, show pending reports
          this.reports = [
            {
              id: 1,
              name: 'CAM Gold Loan Approval',
              status: 'PENDING'
            },
            {
              id: 2,
              name: 'Credit Summary Approval',
              status: 'PENDING'
            }
          ];
          this.isApproved = false;
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.toastService.showError('Failed to load approval files.');
        
        // Show pending reports on error
        this.reports = [
          {
            id: 1,
            name: 'CAM Gold Loan Approval',
            status: 'PENDING'
          },
          {
            id: 2,
            name: 'Credit Summary Approval',
            status: 'PENDING'
          }
        ];
        this.isApproved = false;
      }
    });
  }

  viewReport(report: Report): void {
    if (!report.fileName) {
      this.toastService.showWarning(`${report.name} is not available for viewing.`);
      return;
    }

    // For viewing, we'll download and open in a new tab
    this.downloadReport(report, true);
  }

  downloadReport(report: Report, openInNewTab: boolean = false): void {
    if (!report.fileName) {
      this.toastService.showWarning(`${report.name} is not available for download.`);
      return;
    }

    this.isLoading = true;
    
    this.personalService.downloadFile(report.fileName).subscribe({
      next: (blob: Blob) => {
        this.isLoading = false;
        
        // Create a blob URL and trigger download
        const url = window.URL.createObjectURL(blob);
        
        if (openInNewTab) {
          // Open in new tab for viewing
          window.open(url, '_blank');
          this.toastService.showSuccess(`Opening ${report.name}...`);
        } else {
          // Trigger download
          const link = document.createElement('a');
          link.href = url;
          link.download = report.fileName || report.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Clean up the blob URL after a delay
          setTimeout(() => {
            window.URL.revokeObjectURL(url);
          }, 100);
          
          this.toastService.showSuccess(`Downloading ${report.name}...`);
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.toastService.showError(`Failed to ${openInNewTab ? 'view' : 'download'} ${report.name}. Please try again.`);
      }
    });
  }

  addNote(): void {
    if (!this.newNote.trim()) {
      this.toastService.showWarning('Please enter a note before adding.');
      return;
    }

    this.isAddingNote = true;
    
    // TODO: Implement API call to save note
    // For now, just add to local array
    const note: Note = {
      id: Date.now(),
      content: this.newNote,
      createdBy: 'Current User', // Replace with actual user
      createdDate: new Date().toISOString()
    };
    
    this.notes.unshift(note);
    this.newNote = '';
    this.isAddingNote = false;
    this.toastService.showSuccess('Note added successfully!');
    
    // If you have an API:
    // this.personalService.addNote(this.customerId, this.getLoanAccountNumber(), this.newNote).subscribe({
    //   next: () => {
    //     this.newNote = '';
    //     this.isAddingNote = false;
    //     this.toastService.showSuccess('Note added successfully!');
    //     this.loadNotes();
    //   },
    //   error: (err) => {
    //     this.isAddingNote = false;
    //     this.toastService.showError('Failed to add note. Please try again.');
    //   }
    // });
  }

  deleteNote(noteId: number): void {
    // TODO: Implement API call to delete note
    this.notes = this.notes.filter(note => note.id !== noteId);
    this.toastService.showSuccess('Note deleted successfully!');
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

