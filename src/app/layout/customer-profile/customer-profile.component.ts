import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { PersonalDetailsService } from '../../services/PersonalDetailsService';
import { ToastService } from '../../services/toast.service';
import { LoaderService } from '../../services/loader.service';
import { AddNewLoanDialogComponent, AddNewLoanDialogResult } from './add-new-loan-dialog/add-new-loan-dialog.component';

@Component({
  selector: 'app-customer-profile',
  templateUrl: './customer-profile.component.html',
  styleUrls: ['./customer-profile.component.css']
})
export class CustomerProfileComponent implements OnInit {
  customerId: string | null = null;
  customer: any = null;
  loans: any[] = [];
  isLoading = false;
  selectedTabIndex = 0; // 0: details, 1: loans, 2: payment history, 3: documents

  // Payment History
  paymentHistory: any[] = [];
  isLoadingHistory = false;
  paymentHistoryColumns = ['loanAccountNumber', 'paymentType', 'repaymentAmount', 'paymentMode', 'paymentDate', 'paymentStatus'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private apiService: PersonalDetailsService,
    private toastService: ToastService,
    public loaderService: LoaderService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.customerId = params.get('id');
      if (this.customerId) {
        this.loadCustomerDetails();
      } else {
        this.toastService.showError('Customer ID is required');
        this.router.navigate(['/loan-info-details']);
      }
    });
  }

  loadCustomerDetails(): void {
    if (!this.customerId) return;

    this.isLoading = true;
    this.apiService.getById(this.customerId).subscribe({
      next: (res) => {
        this.isLoading = false;
        const data = res?.data ?? res;
        if (data) {
          this.customer = data;
          const loanList = data.loanAccountDetailsDtoList || data.loanAccountDetailsDto || [];
          this.loans = this.mapLoanAccountDetails(loanList);
          this.loadPaymentHistory();
        } else {
          this.toastService.showError('Customer not found');
          this.router.navigate(['/loan-info-details']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.toastService.showError(err?.error?.message || 'Failed to load customer details');
        console.error('Error loading customer details:', err);
      }
    });
  }

  /**
   * Maps loanAccountDetailsDtoList from API to loans format for template binding.
   */
  private mapLoanAccountDetails(loanDetails: any[]): any[] {
    return (loanDetails || []).map((loan: any, index: number) => ({
      id: loan.loanAccountNumber || index,
      loanAccountNo: loan.loanAccountNumber,
      loanAccountNumber: loan.loanAccountNumber,
      status: loan.loanStatus,
      loanStatus: loan.loanStatus,
      principalAmount: loan.netDisbursedAmount ?? loan.loanAmount ?? 0,
      netDisbursedAmount: loan.netDisbursedAmount,
      loanDate: loan.loanDate,
      rateOfInterest: loan.rateOfInterest ?? loan.interestRate,
      interestRate: loan.rateOfInterest ?? loan.interestRate ?? 'N/A',
      tenure: loan.tenure ?? 'N/A'
    }));
  }

  editCustomer(): void {
    if (this.customerId) {
      this.router.navigate(['/basic-details', this.customerId]);
    }
  }

  addNewLoan(): void {
    if (!this.customerId) return;
    const dialogRef = this.dialog.open(AddNewLoanDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: 'add-new-loan-dialog-panel',
      disableClose: false,
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      data: { customerId: this.customerId }
    });
    dialogRef.afterClosed().subscribe((result: AddNewLoanDialogResult) => {
      if (result) {
        const customerId = result.customerId || this.customerId;
        const queryParams: any = {
          loanPurpose: result.loanPurpose,
          relationshipManager: result.relationshipManager,
          sourcingChannel: result.sourcingChannel
        };
        if (result.loanAccountNumber) {
          queryParams.loanAccount = result.loanAccountNumber;
        }
        this.router.navigate(['/loan-wizard', customerId], { queryParams });
      }
    });
  }

  viewLoan(loanAccountNumberOrId: string): void {
    if (this.customerId) {
      this.router.navigate(['/loan-wizard', this.customerId], {
        queryParams: loanAccountNumberOrId ? { loanAccount: loanAccountNumberOrId } : {}
      });
    }
  }

  /**
   * Check if a loan can be released (only active/disbursed loans)
   */
  canReleaseLoan(loan: any): boolean {
    const status = (loan.loanStatus || loan.status || '').toUpperCase();
    return status === 'ACTIVE' || status === 'DISBURSED';
  }

  /**
   * Check if part payment or interest payment can be made on a loan
   */
  canMakePayment(loan: any): boolean {
    const status = (loan.loanStatus || loan.status || '').toUpperCase();
    return status === 'ACTIVE' || status === 'DISBURSED';
  }

  /**
   * Navigate to loan payment wizard for part payment
   */
  makePartPayment(loan: any): void {
    if (!this.customerId) return;
    const loanAccountNumber = loan.loanAccountNumber || loan.loanAccountNo || loan.id;
    if (!loanAccountNumber) {
      this.toastService.showError('Loan account number not found');
      return;
    }
    localStorage.setItem(`loanAccountNumber_${this.customerId}`, loanAccountNumber);
    this.router.navigate(['/loan-payment', this.customerId], {
      queryParams: { loanAccount: loanAccountNumber, type: 'part' }
    });
  }

  /**
   * Navigate to loan payment wizard for interest payment
   */
  makeInterestPayment(loan: any): void {
    if (!this.customerId) return;
    const loanAccountNumber = loan.loanAccountNumber || loan.loanAccountNo || loan.id;
    if (!loanAccountNumber) {
      this.toastService.showError('Loan account number not found');
      return;
    }
    localStorage.setItem(`loanAccountNumber_${this.customerId}`, loanAccountNumber);
    this.router.navigate(['/loan-payment', this.customerId], {
      queryParams: { loanAccount: loanAccountNumber, type: 'interest' }
    });
  }

  /**
   * Navigate to loan release wizard
   */
  releaseLoan(loan: any): void {
    if (!this.customerId) return;
    
    const loanAccountNumber = loan.loanAccountNumber || loan.loanAccountNo || loan.id;
    if (!loanAccountNumber) {
      this.toastService.showError('Loan account number not found');
      return;
    }

    // Store loan account number in localStorage for the release wizard
    localStorage.setItem(`loanAccountNumber_${this.customerId}`, loanAccountNumber);

    this.router.navigate(['/loan-release', this.customerId], {
      queryParams: { loanAccount: loanAccountNumber }
    });
  }

  /**
   * Load payment history for all loans
   */
  loadPaymentHistory(): void {
    if (!this.customerId || this.loans.length === 0) return;

    this.isLoadingHistory = true;
    // Load payment history for each loan account
    const loanAccount = this.loans[0]?.loanAccountNumber || this.loans[0]?.loanAccountNo;
    if (loanAccount) {
      this.apiService.getPaymentHistory(this.customerId, loanAccount).subscribe({
        next: (res: any) => {
          this.isLoadingHistory = false;
          this.paymentHistory = res?.data || [];
        },
        error: () => {
          this.isLoadingHistory = false;
          this.paymentHistory = [];
        }
      });
    } else {
      this.isLoadingHistory = false;
    }
  }

  formatPaymentCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  }

  formatPaymentDate(dateString: string | null): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getLoanStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'active': 'status-active',
      'in-process': 'status-pending',
      'in_process': 'status-pending',
      'pending': 'status-pending',
      'approved': 'status-approved',
      'rejected': 'status-rejected',
      'closed': 'status-closed',
      'disbursed': 'status-disbursed'
    };
    const normalized = (status || '').toLowerCase().replace(/_/g, '-');
    return statusMap[normalized] || 'status-default';
  }

  getLoanStatusLabel(status: string): string {
    if (!status) return 'Unknown';
    if (status.toUpperCase() === 'IN-PROCESS') return 'In Process';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }

  getStatusIcon(status: string): string {
    const statusLower = (status || '').toLowerCase().replace(/_/g, '-');
    const iconMap: { [key: string]: string } = {
      'pending': 'hourglass_empty',
      'in-process': 'hourglass_empty',
      'approved': 'check_circle',
      'active': 'play_circle',
      'rejected': 'cancel',
      'closed': 'lock',
      'disbursed': 'account_balance_wallet'
    };
    return iconMap[statusLower] || 'info';
  }

  goBack(): void {
    this.router.navigate(['/loan-info-details']);
  }

  setActiveTab(index: number): void {
    this.selectedTabIndex = index;
  }

  getFullName(): string {
    if (!this.customer) return 'N/A';
    return [this.customer.firstName, this.customer.middleName, this.customer.lastName]
      .filter(Boolean)
      .join(' ')
      .trim() || 'N/A';
  }

  /**
   * Returns data URL for customer photo from API (base64).
   * Returns null when no photo is available.
   */
  getPhotoUrl(): string | null {
    if (!this.customer?.photo) return null;
    const base64 = this.customer.photo;
    if (base64.startsWith('data:')) return base64;
    return `data:image/jpeg;base64,${base64}`;
  }
}

