import { Component, Input, OnInit, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';

interface DisbursementData {
  id: number;
  customerId: string;
  loanAccountNumber: string;
  mobileNumber: string;
  schemeName: string;
  tenure: string;
  totalInstallments: number;
  loanAmount: number;
  processingFee: number;
  careInsurance: number;
  insuranceFeeGst: number;
  insuranceFeeCgst: number;
  processingFeeGst: number;
  processingFeeCgst: number;
  netDisbursmentAmount: number;
  bankName: string;
  ifscCode: string;
  accountNumber: string;
  accountHolderName: string;
  disbusmentDate: string;
  disbusmentStatus: string;
  createdBy: string;
  createdDate: string;
  updatedBy: string | null;
  updatedDate: string | null;
  customerName: string;
}

@Component({
  selector: 'app-disbursement-details',
  templateUrl: './disbursement-details.component.html',
  styleUrls: ['./disbursement-details.component.css']
})
export class DisbursementDetailsComponent implements OnInit, OnChanges {
  @Input() customerId!: string;
  @Input() loanApplicationId!: string;
  @Output() stepCompleted = new EventEmitter<void>();

  disbursementData: DisbursementData | null = null;
  isLoading = false;
  isActivating = false;
  loanAccountNumber: string | null = null;

  constructor(
    private personalService: PersonalDetailsService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadStoredLoanAccountNumber();
    this.loadDisbursementData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['customerId'] || changes['loanApplicationId']) && !changes['customerId']?.firstChange) {
      this.loadStoredLoanAccountNumber();
      this.loadDisbursementData();
    }
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

  loadDisbursementData(): void {
    if (!this.customerId) {
      return;
    }

    const accountNumber = this.getLoanAccountNumber();
    if (!accountNumber) {
      return;
    }

    this.isLoading = true;

    this.personalService.getDisbursementInfo(this.customerId, accountNumber).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res?.code === 200 && res?.data) {
          this.disbursementData = res.data;
          if (this.disbursementData?.disbusmentStatus === 'ACTIVE' || 
              this.disbursementData?.disbusmentStatus === 'DISBURSED') {
            this.stepCompleted.emit();
          }
        } else {
          this.disbursementData = null;
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.disbursementData = null;
        this.toastService.showError('Failed to load disbursement details.');
      }
    });
  }

  activateDisbursement(): void {
    if (!this.customerId || !this.getLoanAccountNumber()) {
      this.toastService.showWarning('Missing customer or loan account information.');
      return;
    }

    this.isActivating = true;

    this.personalService.activateDisbursementLoanAccount(this.customerId, this.getLoanAccountNumber()!).subscribe({
      next: (res: any) => {
        this.isActivating = false;
        if (res?.code === 200) {
          this.toastService.showSuccess('Loan account activated successfully!');
          this.loadDisbursementData();
          this.stepCompleted.emit();
        } else {
          this.toastService.showWarning(res?.message || 'Activation failed.');
        }
      },
      error: (err: any) => {
        this.isActivating = false;
        this.toastService.showError('Failed to activate loan account. Please try again.');
      }
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getStatusClass(status: string): string {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
      case 'DISBURSED':
        return 'status-success';
      case 'IN-PROCESS':
      case 'PENDING':
        return 'status-pending';
      case 'REJECTED':
      case 'FAILED':
        return 'status-failed';
      default:
        return 'status-pending';
    }
  }

  getStatusIcon(status: string): string {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
      case 'DISBURSED':
        return 'check_circle';
      case 'IN-PROCESS':
      case 'PENDING':
        return 'hourglass_empty';
      case 'REJECTED':
      case 'FAILED':
        return 'cancel';
      default:
        return 'pending';
    }
  }

  get totalDeductions(): number {
    if (!this.disbursementData) return 0;
    return (
      this.disbursementData.processingFee +
      this.disbursementData.processingFeeGst +
      this.disbursementData.processingFeeCgst
    );
  }

  get isActivationAllowed(): boolean {
    return this.disbursementData?.disbusmentStatus === 'IN-PROCESS' || 
           this.disbursementData?.disbusmentStatus === 'PENDING';
  }
}

