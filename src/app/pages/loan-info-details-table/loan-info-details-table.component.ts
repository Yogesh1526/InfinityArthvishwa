import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';

interface LoanApplication {
  id: number;
  customerId: string;
  tempLoanAccountNumber: string;
  name: string;
  mobileNumber: string;
  occupation: string;
  loanPurpose: string;
  createdBy: string;
  status: 'Approved' | 'Rejected' | 'Disbursed' | 'Abandoned' | 'Pending';
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

  constructor(
    private router: Router,
    private loanService: PersonalDetailsService
  ) {}

  ngOnInit(): void {
    this.loadCustomerDetails();
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
          this.loanList = customers.map((c: any) => ({
            id: c.id,
            customerId: c.customerId ?? 'N/A',
            tempLoanAccountNumber: c.tempLoanAccountNumber ?? c.loanAccountNo ?? 'N/A',
            name: this.buildFullName(c.firstName, c.middleName, c.lastName),
            mobileNumber: c.mobileNumber ?? 'N/A',
            occupation: c.occupation ?? 'N/A',
            loanPurpose: c.loanPurpose ?? 'N/A',
            createdBy: c.createdBy ?? 'N/A',
            status: this.mapStatus(c.applicationStatus)
          }));
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

  buildFullName(firstName: string, middleName: string, lastName: string): string {
    return [firstName, middleName, lastName]
      .filter(name => name && name.trim())
      .join(' ')
      .trim() || 'N/A';
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

  mapStatus(apiStatus: string): 'Approved' | 'Rejected' | 'Disbursed' | 'Abandoned' | 'Pending' {
    if (!apiStatus) return 'Pending';
    
    switch (apiStatus.toUpperCase()) {
      case 'ACTIVE':
      case 'SUBMITTED':
      case 'PENDING':
        return 'Pending';
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      case 'DISBURSED':
        return 'Disbursed';
      case 'ABANDONED':
        return 'Abandoned';
      default:
        return 'Pending';
    }
  }

  get filteredLoans(): LoanApplication[] {
    const text = this.filterText.toLowerCase();
    return this.loanList.filter(loan => {
      const matchStatus = this.selectedStatus === 'All' || loan.status === this.selectedStatus;
      const matchText = 
        loan.name.toLowerCase().includes(text) || 
        loan.customerId.toLowerCase().includes(text) ||
        loan.mobileNumber.includes(text) ||
        loan.tempLoanAccountNumber.toLowerCase().includes(text);
      return matchStatus && matchText;
    });
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
    // Use customerId for navigation, fallback to tempLoanAccountNumber if customerId is not available
    const idToUse = loan.customerId && loan.customerId !== 'N/A' ? loan.customerId : loan.tempLoanAccountNumber;
    if (idToUse && idToUse !== 'N/A') {
      this.router.navigate(['/loan-wizard', idToUse]);
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
    this.approvedCount = this.loanList.filter(l => l.status === 'Approved').length;
    this.rejectedCount = this.loanList.filter(l => l.status === 'Rejected').length;
    this.disbursedCount = this.loanList.filter(l => l.status === 'Disbursed').length;
    this.pendingCount = this.loanList.filter(l => l.status === 'Pending').length;
  }
}
