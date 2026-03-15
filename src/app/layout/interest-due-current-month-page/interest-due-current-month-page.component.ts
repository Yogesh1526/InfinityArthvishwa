import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { PersonalDetailsService, PaymentPendingItem } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';
import {
  RepaymentScheduleDialogComponent,
  RepaymentScheduleDialogData
} from '../repayment-schedule-dialog/repayment-schedule-dialog.component';

export interface PaymentPendingGroupedRow {
  customerId: string;
  customerName: string;
  mobileNumber: string;
  loans: {
    loanAccountNumber: string;
    dueDate: string;
    dueAmount: number;
    interestAmount: number;
    rebateInterestAmount: number;
  }[];
  totalDueAmount: number;
  loanCount: number;
}

@Component({
  selector: 'app-interest-due-current-month-page',
  templateUrl: './interest-due-current-month-page.component.html',
  styleUrls: ['./interest-due-current-month-page.component.css']
})
export class InterestDueCurrentMonthPageComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns: string[] = [
    'srNo',
    'customerId',
    'customerName',
    'mobileNumber',
    'loanCount',
    'loans',
    'totalDueAmount'
  ];

  dataSource = new MatTableDataSource<PaymentPendingGroupedRow>([]);
  isLoading = false;
  errorMessage: string | null = null;
  searchText = '';

  totalRecords = 0;
  totalDueAmount = 0;
  uniqueCustomers = 0;

  constructor(
    private personalService: PersonalDetailsService,
    private toastService: ToastService,
    private router: Router,
    private dialog: MatDialog
  ) {
    this.dataSource.filterPredicate = this.createFilterPredicate();
  }

  ngOnInit(): void {
    this.loadPaymentPendingList();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private createFilterPredicate(): (row: PaymentPendingGroupedRow, filter: string) => boolean {
    return (row: PaymentPendingGroupedRow, filter: string) => {
      const term = (filter || '').trim().toLowerCase();
      if (!term) return true;
      const id = (row.customerId || '').toLowerCase();
      const name = (row.customerName || '').toLowerCase();
      const mobile = (row.mobileNumber || '').toLowerCase();
      const loanNumbers = (row.loans || []).map(l => (l.loanAccountNumber || '').toLowerCase());
      return id.includes(term) ||
        name.includes(term) ||
        mobile.includes(term) ||
        loanNumbers.some(ln => ln.includes(term));
    };
  }

  applySearch(): void {
    this.dataSource.filter = this.searchText;
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  clearSearch(): void {
    this.searchText = '';
    this.applySearch();
  }

  loadPaymentPendingList(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.personalService.getPaymentPendingCustomerList().subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res?.code === 200 && Array.isArray(res?.data)) {
          const grouped = this.groupByCustomer(res.data);
          this.dataSource.data = grouped;
          this.updateSummary(res.data, grouped);
        } else {
          this.dataSource.data = [];
          this.updateSummary([], []);
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.dataSource.data = [];
        this.updateSummary([], []);
        this.errorMessage = err?.error?.message || 'Failed to load pending payment list.';
        this.toastService.showError(this.errorMessage ?? 'Failed to load pending payment list.');
      }
    });
  }

  /** Compute due amount from API fields: interest - rebate */
  private getDueAmount(item: PaymentPendingItem): number {
    const interest = item.interestAmount ?? 0;
    const rebate = item.rebateInterestAmount ?? 0;
    return Math.max(0, interest - rebate);
  }

  private groupByCustomer(items: PaymentPendingItem[]): PaymentPendingGroupedRow[] {
    const map = new Map<string, PaymentPendingGroupedRow>();
    for (const item of items) {
      const key = item.customerId;
      const dueAmount = this.getDueAmount(item);
      if (!map.has(key)) {
        map.set(key, {
          customerId: item.customerId,
          customerName: item.customerName ?? '',
          mobileNumber: item.mobileNumber ?? '',
          loans: [],
          totalDueAmount: 0,
          loanCount: 0
        });
      }
      const row = map.get(key)!;
      row.loans.push({
        loanAccountNumber: item.loanAccountNumber,
        dueDate: item.dueDate,
        dueAmount,
        interestAmount: item.interestAmount,
        rebateInterestAmount: item.rebateInterestAmount
      });
      row.totalDueAmount += dueAmount;
      row.loanCount = row.loans.length;
    }
    return Array.from(map.values());
  }

  private updateSummary(raw: PaymentPendingItem[], grouped: PaymentPendingGroupedRow[]): void {
    this.totalRecords = raw.length;
    this.totalDueAmount = raw.reduce((sum, r) => sum + this.getDueAmount(r), 0);
    this.uniqueCustomers = grouped.length;
  }

  viewCustomerProfile(row: PaymentPendingGroupedRow): void {
    if (!row?.customerId) {
      return;
    }
    this.router.navigate(['/customer-profile', row.customerId]);
  }

  viewLoanPayment(row: PaymentPendingGroupedRow, loan: PaymentPendingGroupedRow['loans'][number]): void {
    if (!row?.customerId || !loan?.loanAccountNumber) {
      return;
    }
    this.router.navigate(['/loan-payment', row.customerId], {
      queryParams: {
        loanAccount: loan.loanAccountNumber,
        type: 'interest'
      }
    });
  }

  openRepaymentScheduleDialog(row: PaymentPendingGroupedRow, loan: PaymentPendingGroupedRow['loans'][number]): void {
    if (!row?.customerId || !loan?.loanAccountNumber) return;
    const data: RepaymentScheduleDialogData = {
      customerId: row.customerId,
      loanAccountNumber: loan.loanAccountNumber,
      customerName: row.customerName || undefined
    };
    this.dialog.open(RepaymentScheduleDialogComponent, {
      width: '96vw',
      maxWidth: '1280px',
      maxHeight: '90vh',
      data
    });
  }

  formatDate(dateString?: string | null): string {
    if (!dateString) return '–';
    const d = new Date(dateString);
    return isNaN(d.getTime())
      ? '–'
      : d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  formatCurrency(amount?: number | null): string {
    if (amount == null) return '–';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  }
}
