import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { GoldRateService } from 'src/app/services/gold-rate.service';

interface LoanAccountDetail {
  loanAccountNumber: string;
  customerId: string;
  netDisbursedAmount?: number;
  loanDate?: string;
  loanStatus?: string;
}

interface LoanApplication {
  id: number;
  customerId: string;
  tempLoanAccountNumber: string;
  name: string;
  mobileNumber: string;
  loanDate: string;
  loanAmount: number | null;
  createdBy: string;
  status: string;
  /** True if loanAccountDetailsDto has at least one loan with loanStatus ACTIVE */
  isDisbursed: boolean;
  loanAccountDetailsDto?: LoanAccountDetail[];
}

@Component({
  selector: 'app-loan-info-details-table',
  templateUrl: './loan-info-details-table.component.html',
  styleUrls: ['./loan-info-details-table.component.css']
})
export class LoanInfoDetailsTableComponent implements OnInit {
  loanList: LoanApplication[] = [];
  filterText: string = '';
  selectedStatus: string = 'All';

  loanCount = 0;
  approvedCount = 0;
  rejectedCount = 0;
  disbursedCount = 0;
  pendingCount = 0;

  pageSize = 10;
  currentPage = 1;

  // Expose Math to template
  Math = Math;

  // Error and data states (loading handled by global LoaderInterceptor)
  hasError: boolean = false;
  errorMessage: string = '';
  hasData: boolean = false;

  // Gold rate alert
  showGoldRateAlert: boolean = false;
  goldRateNeedsUpdate: boolean = false;

  constructor(
    private router: Router,
    private loanService: PersonalDetailsService,
    private goldRateService: GoldRateService
  ) {}

  ngOnInit(): void {
    this.loadCustomerDetails();
    this.checkGoldRateStatus();
  }

  loadCustomerDetails(): void {
    // Reset states (loading is handled by global LoaderInterceptor)
    this.hasError = false;
    this.errorMessage = '';
    this.hasData = false;

    this.loanService.getAllCustomerDetails().subscribe({
      next: (response) => {
        const customers = response?.data || [];

        if (customers.length === 0) {
          this.hasData = false;
          this.hasError = true;
          this.errorMessage = 'No customer data found';
          this.loanList = [];
        } else {
          this.hasData = true;
          this.hasError = false;
          this.loanList = customers.map((c: any) => this.mapCustomerToLoan(c));
        }

        this.updateCounts();
      },
      error: (err) => {
        this.hasError = true;
        this.hasData = false;
        this.loanList = [];
        
        // Set appropriate error message
        if (err.status === 0) {
          this.errorMessage = 'Unable to connect to server. Please check your internet connection.';
        } else if (err.status === 404) {
          this.errorMessage = 'API endpoint not found';
        } else if (err.status >= 500) {
          this.errorMessage = 'Server error. Please try again later.';
        } else {
          this.errorMessage = err?.error?.message || 'Failed to load customer data. Please try again.';
        }
        
        console.error('Error loading customer data', err);
      }
    });
  }

  /**
   * Maps API customer to LoanApplication using loanAccountDetailsDto for disbursed/pending and loan amount/date.
   */
  mapCustomerToLoan(c: any): LoanApplication {
    const loanDetails = c.loanAccountDetailsDto || [];
    const activeLoan = loanDetails.find((l: LoanAccountDetail) => (l.loanStatus || '').toUpperCase() === 'ACTIVE');
    const firstLoan = loanDetails[0];
    const isDisbursed = loanDetails.some((l: LoanAccountDetail) => (l.loanStatus || '').toUpperCase() === 'ACTIVE');

    const loanAmount = activeLoan?.netDisbursedAmount ?? firstLoan?.netDisbursedAmount ?? c.loanDisbussementAmount ?? c.loanAmount ?? c.loanAmountNeedToBeDisbursed ?? null;
    const loanDateRaw = activeLoan?.loanDate ?? firstLoan?.loanDate ?? c.loanDisbusDate ?? c.loanDate ?? c.createdDate ?? c.applicationDate;

    return {
      id: c.id,
      customerId: c.customerId ?? 'N/A',
      tempLoanAccountNumber: c.tempLoanAccountNumber ?? firstLoan?.loanAccountNumber ?? c.loanAccountNo ?? 'N/A',
      name: this.buildFullName(c.firstName, c.middleName, c.lastName),
      mobileNumber: c.mobileNumber ?? 'N/A',
      loanDate: this.formatLoanDate(loanDateRaw),
      loanAmount: loanAmount != null ? Number(loanAmount) : null,
      createdBy: c.createdBy ?? 'N/A',
      status: c.applicationStatus ?? 'N/A',
      isDisbursed,
      loanAccountDetailsDto: loanDetails
    };
  }

  buildFullName(firstName: string, middleName: string, lastName: string): string {
    return [firstName, middleName, lastName]
      .filter(name => name && name.trim())
      .join(' ')
      .trim() || 'N/A';
  }

  formatLoanDate(dateVal: string | Date | null | undefined): string {
    if (!dateVal) return 'N/A';
    try {
      const d = typeof dateVal === 'string' ? new Date(dateVal) : dateVal;
      return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return 'N/A';
    }
  }

  formatCurrency(value: number | null | undefined): string {
    if (value == null || value === undefined || isNaN(value)) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    }).format(value);
  }

  getInitials(name: string): string {
    if (!name || name === 'N/A') return '?';
    const parts = name.split(' ').filter(p => p);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }

  retryLoad(): void {
    this.loadCustomerDetails();
  }


  get filteredLoans(): LoanApplication[] {
    const text = this.filterText.toLowerCase();
    return this.loanList.filter(loan => {
      let matchStatus = true;
      if (this.selectedStatus !== 'All') {
        matchStatus = this.matchesStatusFilter(loan, this.selectedStatus);
      }
      const matchText = 
        loan.name.toLowerCase().includes(text) || 
        loan.customerId.toLowerCase().includes(text) ||
        loan.mobileNumber.includes(text) ||
        loan.tempLoanAccountNumber.toLowerCase().includes(text) ||
        (loan.loanDate && loan.loanDate !== 'N/A' && loan.loanDate.toLowerCase().includes(text));
      return matchStatus && matchText;
    });
  }

  matchesStatusFilter(loan: LoanApplication, filterStatus: string): boolean {
    const statusUpper = (loan.status || '').toUpperCase().replace(/_/g, '-');
    
    switch (filterStatus) {
      case 'Approved':
        return statusUpper === 'APPROVED';
      case 'Rejected':
        return statusUpper === 'REJECTED';
      case 'Disbursed':
        // Use loanAccountDetailsDto: has at least one loan with loanStatus ACTIVE
        return loan.isDisbursed;
      case 'Pending':
        // In-process: applicationStatus IN-PROCESS (API uses IN-PROCESS with hyphen)
        return statusUpper === 'IN-PROCESS' || statusUpper === 'PENDING' || statusUpper === 'SUBMITTED';
      default:
        return false;
    }
  }

  get pagedLoans(): LoanApplication[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredLoans.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredLoans.length / this.pageSize);
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  prevPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }

  changeStatusFilter(status: string): void {
    this.selectedStatus = status;
    this.currentPage = 1;
  }

  editLoan(loan: LoanApplication): void {
    // Use customerId for navigation to customer profile, fallback to tempLoanAccountNumber if customerId is not available
    const idToUse = loan.customerId && loan.customerId !== 'N/A' ? loan.customerId : loan.tempLoanAccountNumber;
    if (idToUse && idToUse !== 'N/A') {
      this.router.navigate(['/customer-profile', idToUse]);
    }
  }

  deleteLoan(loanId: number): void {
    this.loanList = this.loanList.filter(loan => loan.id !== loanId);
    this.updateCounts();
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages || 1;
    }
  }

  addNewLoan(): void {
    this.router.navigate(['/basic-details/0']);
  }

  updateCounts(): void {
    this.loanCount = this.loanList.length;
    this.approvedCount = this.loanList.filter(l => l.status?.toUpperCase() === 'APPROVED').length;
    this.rejectedCount = this.loanList.filter(l => l.status?.toUpperCase() === 'REJECTED').length;
    // Disbursed: loanAccountDetailsDto has at least one loan with loanStatus ACTIVE
    this.disbursedCount = this.loanList.filter(l => l.isDisbursed).length;
    // Pending: applicationStatus IN-PROCESS (API uses hyphen)
    this.pendingCount = this.loanList.filter(l => {
      const s = (l.status || '').toUpperCase().replace(/_/g, '-');
      return s === 'IN-PROCESS' || s === 'PENDING' || s === 'SUBMITTED';
    }).length;
  }

  checkGoldRateStatus(): void {
    this.goldRateService.getCurrentGoldRate().subscribe({
      next: (response: any) => {
        // Check if gold rate exists and is up to date
        let goldRate = null;
        
        if (response?.data?.data) {
          goldRate = Array.isArray(response.data.data) ? response.data.data[0] : response.data.data;
        } else if (response?.data) {
          goldRate = Array.isArray(response.data) ? response.data[0] : response.data;
        }

        if (!goldRate || !goldRate.ratePerGram) {
          // No gold rate found
          this.showGoldRateAlert = true;
          this.goldRateNeedsUpdate = true;
          return;
        }

        // Check if rate date is today
        if (goldRate.rateDate) {
          const today = new Date().toISOString().split('T')[0];
          const rateDate = goldRate.rateDate.split('T')[0];
          
          if (rateDate !== today) {
            // Rate is not for today
            this.showGoldRateAlert = true;
            this.goldRateNeedsUpdate = true;
          } else {
            this.showGoldRateAlert = false;
            this.goldRateNeedsUpdate = false;
          }
        } else {
          // No date specified, show alert
          this.showGoldRateAlert = true;
          this.goldRateNeedsUpdate = true;
        }
      },
      error: (err) => {
        // If error (including 404), show alert
        if (err.status === 404 || err.status === 0) {
          this.showGoldRateAlert = true;
          this.goldRateNeedsUpdate = true;
        }
      }
    });
  }

  navigateToGoldRate(): void {
    this.router.navigate(['/gold-rate']);
  }

  dismissGoldRateAlert(): void {
    this.showGoldRateAlert = false;
  }
}
