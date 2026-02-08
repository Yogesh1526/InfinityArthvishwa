import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';

interface OutstandingData {
  loanAccountNumber: string;
  customerId: string;
  totalOutstandingAmount: number;
  dailyInterestRate: number;
  schemeName: string;
  loanTenure: string;
  loanStartDate: string;
  loanEndDate: string | null;
  createdDate: string;
  createdBy: string;
  // Computed fields for display
  totalOutstanding: number;
}

@Component({
  selector: 'app-outstanding-details',
  templateUrl: './outstanding-details.component.html',
  styleUrls: ['./outstanding-details.component.css']
})
export class OutstandingDetailsComponent implements OnInit, OnChanges {
  @Input() customerId!: string;
  @Input() loanAccountNumber!: string;
  @Output() stepCompleted = new EventEmitter<void>();
  @Output() dataLoaded = new EventEmitter<any>();

  outstandingData: any = null;
  isLoading = false;
  isConfirmed = false;
  isSaved = false; // true when data is already saved on server

  // Loan end date (defaults to today, no past dates allowed)
  loanEndDate: string = '';
  todayDate: string = '';

  // Computed breakdown fields
  daysElapsed = 0;
  accruedInterest = 0;

  constructor(
    private personalService: PersonalDetailsService,
    private toastService: ToastService
  ) {}

  /** localStorage key for persisting saved state */
  private get savedStateKey(): string {
    return `outstanding_saved_${this.customerId}_${this.loanAccountNumber}`;
  }

  ngOnInit(): void {
    const today = new Date();
    this.todayDate = today.toISOString().split('T')[0];
    this.loanEndDate = this.todayDate;

    // Restore saved state from localStorage
    this.restoreSavedState();

    this.loadOutstandingDetails();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['customerId'] || changes['loanAccountNumber']) && !changes['customerId']?.firstChange) {
      this.loadOutstandingDetails();
    }
  }

  /**
   * Load outstanding details from dedicated API
   */
  loadOutstandingDetails(): void {
    if (!this.customerId || !this.loanAccountNumber) {
      return;
    }

    this.isLoading = true;

    this.personalService.getOutstandingLoanAmountDetails(this.customerId, this.loanAccountNumber).subscribe({
      next: (res: any) => {
        if (res?.code === 200 && res?.data) {
          const data = res.data;
          this.outstandingData = data;

          // Calculate days elapsed from loan start date
          if (data.loanStartDate) {
            const startDate = new Date(data.loanStartDate);
            const today = new Date();
            this.daysElapsed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          }

          // Calculate accrued interest: totalOutstandingAmount * dailyInterestRate * daysElapsed / 100
          if (data.dailyInterestRate && this.daysElapsed > 0) {
            this.accruedInterest = Math.round((data.totalOutstandingAmount * data.dailyInterestRate * this.daysElapsed) / 100 * 100) / 100;
          }

          // Loan end date is always today's date (read-only)
          this.loanEndDate = this.todayDate;
          this.outstandingData.loanEndDate = this.loanEndDate;

          // Set totalOutstanding for compatibility with payment step
          this.outstandingData.totalOutstanding = data.totalOutstandingAmount;

          // Check persisted saved state OR if data has an id
          if (this.isSaved || data.id) {
            this.markAsSaved();
          }

          this.dataLoaded.emit(this.outstandingData);
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error loading outstanding details:', err);
        this.isLoading = false;
        this.toastService.showError('Failed to load outstanding details. Please try again.');
      }
    });
  }

  /**
   * Handle loan end date change - recalculate days elapsed and interest
   */
  onLoanEndDateChange(): void {
    if (this.isSaved) return;
    if (this.outstandingData?.loanStartDate && this.loanEndDate) {
      const startDate = new Date(this.outstandingData.loanStartDate);
      const endDate = new Date(this.loanEndDate);
      this.daysElapsed = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      if (this.outstandingData.dailyInterestRate && this.daysElapsed > 0) {
        this.accruedInterest = Math.round((this.outstandingData.totalOutstandingAmount * this.outstandingData.dailyInterestRate * this.daysElapsed) / 100 * 100) / 100;
      } else {
        this.accruedInterest = 0;
      }

      // Update the data model
      this.outstandingData.loanEndDate = this.loanEndDate;
    }
  }

  /**
   * Confirm outstanding details - save via POST API and proceed
   */
  confirmOutstanding(): void {
    if (this.isSaved) return; // Already saved, no need to save again

    if (!this.outstandingData) {
      this.toastService.showWarning('Please wait for outstanding details to load.');
      return;
    }

    this.isLoading = true;

    // Build payload matching the API format
    const payload = {
      id: this.outstandingData.id || null,
      loanAccountNumber: this.outstandingData.loanAccountNumber,
      customerId: this.outstandingData.customerId,
      totalOutstandingAmount: this.outstandingData.totalOutstandingAmount,
      dailyInterestRate: this.outstandingData.dailyInterestRate,
      schemeName: this.outstandingData.schemeName,
      loanTenure: this.outstandingData.loanTenure,
      loanStartDate: this.outstandingData.loanStartDate,
      loanEndDate: this.loanEndDate || null,
      createdDate: this.outstandingData.createdDate,
      createdBy: this.outstandingData.createdBy,
      updatedBy: this.outstandingData.updatedBy || null,
      updatedDate: this.outstandingData.updatedDate || null
    };

    this.personalService.saveOutstandingLoanAmountDetails(payload).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.markAsSaved();
        this.persistSavedState();
        this.toastService.showSuccess('Outstanding details saved & confirmed successfully.');
      },
      error: (err: any) => {
        this.isLoading = false;
        const errorMsg = err?.error?.message || 'Failed to save outstanding details. Please try again.';
        this.toastService.showError(errorMsg);
        this.isConfirmed = false;
      }
    });
  }

  /**
   * Mark step as saved and emit completed
   */
  private markAsSaved(): void {
    this.isSaved = true;
    this.isConfirmed = true;
    this.stepCompleted.emit();
  }

  /**
   * Persist saved state to localStorage
   */
  private persistSavedState(): void {
    if (this.customerId && this.loanAccountNumber) {
      localStorage.setItem(this.savedStateKey, 'true');
    }
  }

  /**
   * Restore saved state from localStorage
   */
  private restoreSavedState(): void {
    if (this.customerId && this.loanAccountNumber) {
      const saved = localStorage.getItem(this.savedStateKey);
      if (saved === 'true') {
        this.isSaved = true;
        this.isConfirmed = true;
      }
    }
  }

  /**
   * Validate step before navigation
   */
  validateStep(): boolean {
    if (this.isSaved) return true;
    if (!this.isConfirmed) {
      this.toastService.showWarning('Please confirm the outstanding details before proceeding.');
      return false;
    }
    return true;
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string | null): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
