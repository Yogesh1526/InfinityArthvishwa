import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { GoldRateService } from 'src/app/services/gold-rate.service';
import { LoaderService } from 'src/app/services/loader.service';

interface LoanAccountDetail {
  loanAccountNumber?: string;
  loanAccountNo?: string;
  goldLoanAccountNumber?: string;
  tempLoanAccountNumber?: string;
  customerId?: string;
  netDisbursedAmount?: number;
  loanDate?: string;
  disbusalDate?: string;
  disbursalDate?: string;
  loanStatus?: string;
}

interface LoanApplication {
  id: number;
  customerId: string;
  tempLoanAccountNumber: string;
  /** Every account number for this customer, including additional loans. */
  loanAccountNumbers: string[];
  name: string;
  mobileNumber: string;
  alternateMobileNumber: string;
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

  /** Until first customer list response — keeps empty/error UI from showing during fetch (global loader + local fallback). */
  isLoading = false;

  hasError: boolean = false;
  errorMessage: string = '';
  hasData: boolean = false;

  // Gold rate alert
  showGoldRateAlert: boolean = false;
  goldRateNeedsUpdate: boolean = false;

  constructor(
    private router: Router,
    private loanService: PersonalDetailsService,
    private goldRateService: GoldRateService,
    public loaderService: LoaderService
  ) {}

  ngOnInit(): void {
    this.loadCustomerDetails();
    this.checkGoldRateStatus();
  }

  loadCustomerDetails(refresh = false): void {
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';
    this.hasData = false;

    this.loanService
      .getAllCustomerDetails({ refresh })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
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
    const loanDateRaw = activeLoan?.disbusalDate ?? activeLoan?.disbursalDate ?? activeLoan?.loanDate
      ?? firstLoan?.disbusalDate ?? firstLoan?.disbursalDate ?? firstLoan?.loanDate
      ?? c.loanDisbusDate ?? c.loanDate ?? c.createdDate ?? c.applicationDate;
    const loanAccountNumbers = this.collectLoanAccountNumbers(c, loanDetails);

    return {
      id: c.id,
      customerId: c.customerId ?? 'N/A',
      tempLoanAccountNumber: loanAccountNumbers[0] ?? 'N/A',
      loanAccountNumbers,
      name: this.buildFullName(c.firstName, c.middleName, c.lastName),
      mobileNumber: c.mobileNumber ?? 'N/A',
      alternateMobileNumber: c.alternateMobileNumber ?? '',
      loanDate: this.formatLoanDate(loanDateRaw),
      loanAmount: loanAmount != null ? Number(loanAmount) : null,
      createdBy: c.createdBy ?? 'N/A',
      status: c.applicationStatus ?? 'N/A',
      isDisbursed,
      loanAccountDetailsDto: loanDetails
    };
  }

  private collectLoanAccountNumbers(customer: any, loanDetails: LoanAccountDetail[]): string[] {
    const values: string[] = [];
    const push = (value: unknown) => {
      const text = (value ?? '').toString().trim();
      if (text && text.toUpperCase() !== 'N/A') {
        values.push(text);
      }
    };

    push(customer?.tempLoanAccountNumber);
    push(customer?.loanAccountNo);
    push(customer?.loanAccountNumber);
    push(customer?.goldLoanAccountNumber);

    const lists = [loanDetails, customer?.loanAccountDetailsDtoList, customer?.loanAccounts];
    for (const list of lists) {
      if (!Array.isArray(list)) {
        continue;
      }
      for (const item of list) {
        push(item?.loanAccountNumber);
        push(item?.loanAccountNo);
        push(item?.goldLoanAccountNumber);
        push(item?.tempLoanAccountNumber);
      }
    }

    const seen = new Set<string>();
    const unique: string[] = [];
    for (const value of values) {
      const key = value.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      unique.push(value);
    }
    return unique;
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
    this.loadCustomerDetails(true);
  }


  onSearchChange(value: string): void {
    this.filterText = value;
    this.currentPage = 1;
  }

  clearSearch(): void {
    this.filterText = '';
    this.currentPage = 1;
  }

  get filteredLoans(): LoanApplication[] {
    const text = this.filterText.trim().toLowerCase();
    return this.loanList.filter(loan => {
      const matchStatus = this.selectedStatus === 'All' || this.matchesStatusFilter(loan, this.selectedStatus);
      return matchStatus && this.matchesSearch(loan, text);
    });
  }

  private matchesSearch(loan: LoanApplication, text: string): boolean {
    if (!text) {
      return true;
    }
    const mobileDigits = text.replace(/\D/g, '');
    const mobile = (loan.mobileNumber || '').toLowerCase();
    const alternate = (loan.alternateMobileNumber || '').toLowerCase();
    const mobileMatch = mobile.includes(text)
      || alternate.includes(text)
      || (mobileDigits.length >= 3 && (
        mobile.replace(/\D/g, '').includes(mobileDigits)
        || alternate.replace(/\D/g, '').includes(mobileDigits)
      ));

    return (loan.name || '').toLowerCase().includes(text)
      || (loan.customerId || '').toLowerCase().includes(text)
      || mobileMatch
      || (loan.loanAccountNumbers || []).some(accountNo => accountNo.toLowerCase().includes(text));
  }

  /** When the query is a loan account, show that account instead of only the first one. */
  displayAccountNumber(loan: LoanApplication): string {
    const text = this.filterText.trim().toLowerCase();
    if (text) {
      const matched = (loan.loanAccountNumbers || []).find(accountNo => accountNo.toLowerCase().includes(text));
      if (matched) {
        return matched;
      }
    }
    return loan.tempLoanAccountNumber;
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
