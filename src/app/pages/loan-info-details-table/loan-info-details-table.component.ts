import { Component, OnInit } from '@angular/core';

interface LoanApplication {
  id: number;
  name: string;
  status: 'Approved' | 'Rejected' | 'Disbursed' | 'Abandoned' | 'Pending';
  loanAmount: number;
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

  ngOnInit(): void {
    this.loanList = [
      { id: 101, name: 'Amit Kumar', status: 'Approved', loanAmount: 50000, date: '2025-07-01' },
      { id: 102, name: 'Priya Sharma', status: 'Rejected', loanAmount: 30000, date: '2025-07-03' },
      { id: 103, name: 'Ravi Mehta', status: 'Disbursed', loanAmount: 75000, date: '2025-07-05' },
      { id: 104, name: 'Sunita Verma', status: 'Abandoned', loanAmount: 40000, date: '2025-07-07' },
      { id: 105, name: 'Rajesh Singh', status: 'Approved', loanAmount: 65000, date: '2025-07-08' },
      { id: 106, name: 'Neha Roy', status: 'Pending', loanAmount: 25000, date: '2025-07-09' },
      { id: 101, name: 'Amit Kumar', status: 'Approved', loanAmount: 50000, date: '2025-07-01' },
      { id: 102, name: 'Priya Sharma', status: 'Rejected', loanAmount: 30000, date: '2025-07-03' },
      { id: 103, name: 'Ravi Mehta', status: 'Disbursed', loanAmount: 75000, date: '2025-07-05' },
      { id: 104, name: 'Sunita Verma', status: 'Abandoned', loanAmount: 40000, date: '2025-07-07' },
      { id: 105, name: 'Rajesh Singh', status: 'Approved', loanAmount: 65000, date: '2025-07-08' },
      { id: 106, name: 'Neha Roy', status: 'Pending', loanAmount: 25000, date: '2025-07-09' }
    ];
    this.updateCounts();
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
    alert(`Editing loan ID: ${loan.id}`);
  }

  deleteLoan(loanId: number): void {
    this.loanList = this.loanList.filter(loan => loan.id !== loanId);
    this.updateCounts();
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages || 1;
    }
  }

  addNewLoan(): void {
    alert('Redirecting to Add New Loan form...');
  }

  updateCounts(): void {
    this.loanCount = this.loanList.length;
    this.approvedCount = this.loanList.filter(l => l.status === 'Approved').length;
    this.rejectedCount = this.loanList.filter(l => l.status === 'Rejected').length;
    this.disbursedCount = this.loanList.filter(l => l.status === 'Disbursed').length;
    this.abandonedCount = this.loanList.filter(l => l.status === 'Abandoned').length;
  }
}