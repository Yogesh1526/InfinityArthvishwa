import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';

interface LoanApplication {
  id: number;
  name: string;
  status: 'Approved' | 'Rejected' | 'Disbursed' | 'Abandoned' | 'Pending';
  loanAppNo: string;
  customerId: string;
  loanProduct: string;
  leadProduct: string;
  workflowStage: string;
  sourcingChannel: string;
  anchor: string;
  office: string;
  amountRequested: number;
  date: string;
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
  abandonedCount = 0;

  pageSize = 10;
  currentPage = 1;

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
            name: `${c.firstName} ${c.middleName ?? ''} ${c.lastName}`.trim(),
            status: this.mapStatus(c.applicationStatus),
            loanAppNo: c.loanAccountNo ?? 'N/A',
            customerId: c.customerId ?? 'N/A',
            loanProduct: c.loanProduct ?? 'Gold Loan',
            leadProduct: c.leadProduct ?? 'N/A',
            workflowStage: c.workflowStage ?? 'Initial',
            sourcingChannel: c.sourcingChannel ?? 'Walk-in',
            anchor: c.anchor ?? 'N/A',
            office: c.office ?? 'N/A',
            amountRequested: Number(c.loanAccountNo?.match(/\d+/)?.[0] ?? '0'),
            date: c.submittedDate ?? 'N/A'
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

  retryLoad(): void {
    this.loadCustomerDetails();
  }

  mapStatus(apiStatus: string): 'Approved' | 'Rejected' | 'Disbursed' | 'Abandoned' | 'Pending' {
    switch (apiStatus) {
      case 'SUBMITTED': return 'Pending';
      case 'APPROVED': return 'Approved';
      case 'REJECTED': return 'Rejected';
      case 'DISBURSED': return 'Disbursed';
      case 'ABANDONED': return 'Abandoned';
      default: return 'Pending';
    }
  }

  get filteredLoans(): LoanApplication[] {
    const text = this.filterText.toLowerCase();
    return this.loanList.filter(loan => {
      const matchStatus = this.selectedStatus === 'All' || loan.status === this.selectedStatus;
      const matchText = loan.name.toLowerCase().includes(text) || loan.id.toString().includes(text);
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
    // Use customerId for navigation, fallback to loanAppNo if customerId is not available
    const idToUse = loan.customerId && loan.customerId !== 'N/A' ? loan.customerId : loan.loanAppNo;
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
    this.abandonedCount = this.loanList.filter(l => l.status === 'Abandoned').length;
  }
}
