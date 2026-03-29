import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ViewChild, AfterViewInit } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-repayment-schedule-summary',
  templateUrl: './repayment-schedule-summary.component.html',
  styleUrls: ['./repayment-schedule-summary.component.css']
})
export class RepaymentScheduleSummaryComponent implements OnInit, OnChanges, AfterViewInit {
  @ViewChild(MatSort) sort!: MatSort;

  @Input() customerId!: string;
  @Input() loanAccountNumber!: string;
  @Input() paymentType: 'PART_PAYMENT' | 'INTEREST_PAYMENT' | '' = '';
  @Output() stepCompleted = new EventEmitter<void>();
  @Output() dataLoaded = new EventEmitter<any>();

  scheduleData: any[] = [];
  dataSource = new MatTableDataSource<any>([]);
  outstandingData: any = null;
  isLoading = false;
  isSaving = false;
  isConfirmed = false;

  daysElapsed = 0;
  accruedInterest = 0;
  principalOutstanding = 0;
  totalOutstanding = 0;
  /** First unpaid installment's interest (minimum acceptable interest payment) */
  firstUnpaidInstallmentInterest = 0;

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
    private personalService: PersonalDetailsService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['customerId'] || changes['loanAccountNumber']) && !changes['customerId']?.firstChange) {
      this.loadData();
    }
  }

  loadData(): void {
    if (!this.customerId || !this.loanAccountNumber) return;

    this.isLoading = true;

    // Load repayment schedule first; derive principal/accrued/total from it for payment step
    this.personalService.getPaymentDetails(this.customerId, this.loanAccountNumber).subscribe({
      next: (res: any) => {
        if (res?.code === 200 && Array.isArray(res?.data)) {
          this.scheduleData = res.data;
          this.dataSource = new MatTableDataSource(this.scheduleData);
          if (this.sort) this.dataSource.sort = this.sort;
          this.deriveOutstandingFromSchedule(this.scheduleData);
        } else {
          this.scheduleData = [];
          this.dataSource = new MatTableDataSource<any>([]);
        }
        this.loadOutstandingDetails();
      },
      error: (err: any) => {
        console.error('Error loading payment details:', err);
        this.scheduleData = [];
        this.dataSource = new MatTableDataSource<any>([]);
        this.toastService.showWarning('Could not load repayment schedule. Proceeding with outstanding details.');
        this.loadOutstandingDetails();
      }
    });
  }

  /** Derive principal outstanding, accrued (remaining) interest and total from repayment schedule API data */
  private deriveOutstandingFromSchedule(schedule: any[]): void {
    if (!schedule || schedule.length === 0) return;

    const num = (v: any) => (v != null && v !== '' ? Number(v) : 0);

    // Principal outstanding = latest closing principal (fallback to opening)
    const lastRow = schedule[schedule.length - 1];
    this.principalOutstanding = num(lastRow.closingPrincipal) || num(lastRow.openingPrincipal) || 0;

    // Remaining interest = total interest due (all rows) - total interest already paid
    const totalInterestDue = schedule.reduce(
      (sum, row) => sum + num(row.totalInterestDueAmount),
      0
    );
    // Use interestPaidAmount when set; else use Paid column (paymentPaidAmount) when it's interest-only (principlePaidAmount === 0)
    const totalInterestPaid = schedule.reduce((sum, row) => {
      const interestPaid = num(row.interestPaidAmount);
      const paymentPaid = num(row.paymentPaidAmount);
      const principalPaid = num(row.principlePaidAmount);
      if (interestPaid > 0) return sum + interestPaid;
      if (paymentPaid > 0 && principalPaid === 0) return sum + paymentPaid; // Paid column = interest payment
      return sum;
    }, 0);

    this.accruedInterest = Math.max(totalInterestDue - totalInterestPaid, 0);
    this.totalOutstanding = this.principalOutstanding + this.accruedInterest;

    // First unpaid installment interest = first row with no/little payment → use as min interest payment
    const firstUnpaid = schedule.find(
      (r) => num(r.paymentPaidAmount) === 0 || r.paymentPaidAmount == null || r.paymentPaidAmount === ''
    );
    this.firstUnpaidInstallmentInterest = firstUnpaid
      ? num(firstUnpaid.totalInterestDueAmount) || num(firstUnpaid.monthlyInterestAmount) || 0
      : 0;
  }

  /**
   * Monthly rebate from schedule for payment / waiver UI.
   * 1) Prefer unpaid row with due in **current month**, due date **already passed**, rebate &gt; 0 (late pay).
   * 2) Else use unpaid row with due in **current month** and rebate &gt; 0 (e.g. pay March interest in March before due date; Feb row missing and March is the current-month line).
   */
  private computeScheduleSuggestedRebate(schedule: any[]): { amount: number; dueDate: string } | null {
    const num = (v: any) => (v != null && v !== '' ? Number(v) : 0);
    const isUnpaid = (r: any) =>
      num(r.paymentPaidAmount) === 0 || r.paymentPaidAmount == null || r.paymentPaidAmount === '';

    const unpaidRows = schedule.filter(isUnpaid);
    if (!unpaidRows.length) return null;

    const now = new Date();
    const cy = now.getFullYear();
    const cm = now.getMonth();
    const todayDay = new Date(cy, cm, now.getDate());

    const parseDue = (r: any): Date | null => {
      const raw = r.interestPayDueDate;
      if (!raw) return null;
      const d = new Date(raw);
      return isNaN(d.getTime()) ? null : d;
    };

    const inCurrentMonth = (d: Date) => d.getFullYear() === cy && d.getMonth() === cm;

    type Cand = { row: any; due: Date; dueRaw: string; rebate: number };
    const candidates: Cand[] = [];
    for (const row of unpaidRows) {
      const due = parseDue(row);
      if (!due || !inCurrentMonth(due)) continue;
      const rebate = num(row.monthlyRebateInterestAmount);
      if (rebate <= 0) continue;
      candidates.push({ row, due, dueRaw: String(row.interestPayDueDate), rebate });
    }

    if (!candidates.length) return null;

    candidates.sort((a, b) => a.due.getTime() - b.due.getTime());

    const dueDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const late = candidates.find((c) => dueDay(c.due) < todayDay);
    const pick = late ?? candidates[0];

    return { amount: pick.rebate, dueDate: pick.dueRaw };
  }

  /** Attach readonly suggested rebate fields for loan-payment interest step */
  private enrichOutstandingWithScheduleRebate(): void {
    if (!this.outstandingData) return;
    if (this.scheduleData?.length > 0) {
      const meta = this.computeScheduleSuggestedRebate(this.scheduleData);
      this.outstandingData.scheduleSuggestedRebateAmount = meta?.amount ?? null;
      this.outstandingData.scheduleSuggestedRebateDueDate = meta?.dueDate ?? null;
      this.outstandingData.waiverInterestDueDate =
        meta?.dueDate ?? this.outstandingData.waiverInterestDueDate ?? null;
    } else {
      this.outstandingData.scheduleSuggestedRebateAmount = null;
      this.outstandingData.scheduleSuggestedRebateDueDate = null;
    }
  }

  private loadOutstandingDetails(): void {
    this.personalService.getOutstandingLoanAmountDetails(this.customerId, this.loanAccountNumber).subscribe({
      next: (res: any) => {
        if (res?.code === 200 && res?.data) {
          const data = res.data;
          this.outstandingData = { ...data };

          if (data.loanStartDate) {
            const startDate = new Date(data.loanStartDate);
            const today = new Date();
            this.daysElapsed = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          } else {
            this.daysElapsed = 0;
          }

          if (this.scheduleData.length > 0) {
            this.deriveOutstandingFromSchedule(this.scheduleData);
          } else {
            this.firstUnpaidInstallmentInterest = 0;
            this.principalOutstanding = data.totalOutstandingAmount != null ? Number(data.totalOutstandingAmount) : 0;
            if (data.dailyInterestRate != null && this.daysElapsed > 0) {
              this.accruedInterest =
                Math.round((this.principalOutstanding * Number(data.dailyInterestRate) * this.daysElapsed) / 100 * 100) / 100;
            } else {
              this.accruedInterest = data.accruedInterest != null ? Number(data.accruedInterest) : 0;
            }
            this.totalOutstanding = this.principalOutstanding + this.accruedInterest;
          }

          this.outstandingData.accruedInterest = this.accruedInterest;
          this.outstandingData.principalOutstanding = this.principalOutstanding;
          this.outstandingData.totalOutstanding = this.totalOutstanding;
          this.outstandingData.daysElapsed = this.daysElapsed;
          this.outstandingData.firstUnpaidInstallmentInterest = this.firstUnpaidInstallmentInterest;

          this.enrichOutstandingWithScheduleRebate();
          this.dataLoaded.emit(this.outstandingData);
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error loading outstanding details:', err);
        this.isLoading = false;
        if (this.scheduleData.length > 0) {
          this.deriveOutstandingFromSchedule(this.scheduleData);
          this.outstandingData = this.outstandingData || {};
          this.outstandingData.accruedInterest = this.accruedInterest;
          this.outstandingData.principalOutstanding = this.principalOutstanding;
          this.outstandingData.totalOutstanding = this.totalOutstanding;
          this.outstandingData.daysElapsed = this.daysElapsed;
          this.outstandingData.firstUnpaidInstallmentInterest = this.firstUnpaidInstallmentInterest;
          this.enrichOutstandingWithScheduleRebate();
          this.dataLoaded.emit(this.outstandingData);
        } else {
          this.toastService.showError('Failed to load outstanding details. Please try again.');
        }
      }
    });
  }

  confirmAndProceed(): void {
    if (this.scheduleData.length === 0) {
      this.toastService.showWarning('No repayment schedule data to save. Please refresh or ensure schedule is loaded.');
      return;
    }
    this.isSaving = true;

    // Attach totalDuePendingInterestAmount (same as accruedInterest / Interest due till date)
    const payload = this.scheduleData.map(row => ({
      ...row,
      totalDuePendingInterestAmount: this.accruedInterest
    }));

    this.personalService.saveRepaymentScheduleDetails(payload).subscribe({
      next: (res: any) => {
        this.isSaving = false;
        const code = res?.code ?? res?.status;
        const isSuccess = code === 200 || code === 201 || res == null;
        if (isSuccess) {
          this.isConfirmed = true;
          this.toastService.showSuccess('Repayment schedule details saved successfully.');
          this.stepCompleted.emit();
        } else {
          this.toastService.showError(res?.message || 'Failed to save repayment schedule details.');
        }
      },
      error: (err: any) => {
        this.isSaving = false;
        console.error('Error saving repayment schedule details:', err);
        this.toastService.showError(err?.error?.message || err?.message || 'Failed to save repayment schedule details. Please try again.');
      }
    });
  }

  validateStep(): boolean {
    if (!this.isConfirmed) {
      this.toastService.showWarning('Please confirm the repayment schedule details before proceeding.');
      return false;
    }
    return true;
  }

  getPaymentTypeLabel(): string {
    if (this.paymentType === 'PART_PAYMENT') return 'Part Payment';
    if (this.paymentType === 'INTEREST_PAYMENT') return 'Interest Payment';
    return '';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  refreshData(): void {
    this.loadData();
  }
}
