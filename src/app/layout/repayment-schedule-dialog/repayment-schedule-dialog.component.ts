import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';

export interface RepaymentScheduleDialogData {
  customerId: string;
  loanAccountNumber: string;
  customerName?: string;
}

@Component({
  selector: 'app-repayment-schedule-dialog',
  templateUrl: './repayment-schedule-dialog.component.html',
  styleUrls: ['./repayment-schedule-dialog.component.css']
})
export class RepaymentScheduleDialogComponent implements OnInit {
  scheduleData: any[] = [];
  dataSource = new MatTableDataSource<any>([]);
  isLoading = true;
  errorMessage: string | null = null;

  displayedColumns = [
    'id',
    'schemeName',
    'openingPrincipal',
    'monthlyInterestAmount',
    'totalInterestDueAmount',
    'monthlyRebateInterestAmount',
    'interestPayDueDate',
    'paymentPaidAmount',
    'paymentType',
    'interestPaidAmount',
    'principlePaidAmount',
    'closingPrincipal',
    'paymentPaidDate'
  ];

  constructor(
    public dialogRef: MatDialogRef<RepaymentScheduleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RepaymentScheduleDialogData,
    private personalService: PersonalDetailsService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadSchedule();
  }

  loadSchedule(): void {
    if (!this.data?.customerId || !this.data?.loanAccountNumber) {
      this.errorMessage = 'Customer ID and loan account are required.';
      this.isLoading = false;
      return;
    }
    this.isLoading = true;
    this.errorMessage = null;
    this.personalService.getPaymentDetails(this.data.customerId, this.data.loanAccountNumber).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res?.code === 200 && Array.isArray(res?.data)) {
          this.scheduleData = res.data;
          this.dataSource.data = this.scheduleData;
        } else {
          this.scheduleData = [];
          this.dataSource.data = [];
          this.errorMessage = 'No schedule data for this account.';
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.scheduleData = [];
        this.dataSource.data = [];
        this.errorMessage = err?.error?.message || 'Could not load repayment schedule.';
        this.toastService.showError(this.errorMessage ?? 'Could not load repayment schedule.');
      }
    });
  }

  getTitle(): string {
    const name = this.data?.customerName ? ` – ${this.data.customerName}` : '';
    return `Repayment schedule${name} (${this.data?.loanAccountNumber || ''})`;
  }

  close(): void {
    this.dialogRef.close();
  }

  formatCurrency(amount: any): string {
    const n = amount != null && amount !== '' ? Number(amount) : 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(n);
  }

  formatDate(dateVal: string | null | undefined): string {
    if (dateVal == null || dateVal === '') return '–';
    const d = new Date(dateVal);
    return isNaN(d.getTime()) ? '–' : d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
