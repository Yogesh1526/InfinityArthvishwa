import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ViewChild, AfterViewInit } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';
import { resolveScheduleRebateSuggestion } from '../../schedule-rebate.util';
import {
  buildInterestInstallmentOptions,
  remainingInterestForScheduleRow,
  totalOverdueUnpaidInterestFromSchedule,
  totalRemainingInterestFromSchedule
} from '../../schedule-interest.util';

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
  /** Row id currently submitting to payInterestAmount */
  payingRowId: number | null = null;

  /** Pay-interest popup state (interest payment only) */
  showPayPopup = false;
  selectedPayRow: any = null;
  applyRebate = false;
  /** Row id currently downloading interest receipt */
  downloadingReceiptRowId: number | null = null;

  daysElapsed = 0;
  accruedInterest = 0;
  principalOutstanding = 0;
  totalOutstanding = 0;
  /** First unpaid installment's interest (minimum acceptable interest payment) */
  firstUnpaidInstallmentInterest = 0;

  private readonly baseColumns = [
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

  displayedColumns = [...this.baseColumns];

  constructor(
    private personalService: PersonalDetailsService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.updateDisplayedColumns();
    this.loadData();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['paymentType']) {
      this.updateDisplayedColumns();
    }
    if ((changes['customerId'] || changes['loanAccountNumber']) && !changes['customerId']?.firstChange) {
      this.loadData();
    }
  }

  private updateDisplayedColumns(): void {
    // Pay column only in loan-payment wizard (not loan-release, which passes paymentType '')
    this.displayedColumns =
      this.paymentType === 'PART_PAYMENT' || this.paymentType === 'INTEREST_PAYMENT'
        ? [...this.baseColumns, 'pay']
        : [...this.baseColumns];
  }

  /** True when interest for this installment is already settled */
  isInstallmentPaid(row: any): boolean {
    if (!row) return false;
    if (String(row.paymentPaidStatus || '').toUpperCase() === 'INTEREST_PAID') {
      return true;
    }
    return remainingInterestForScheduleRow(row) <= 0;
  }

  /** Show download for paid interest installments */
  canDownloadInterestReceipt(row: any): boolean {
    return !!row?.id && String(row.paymentPaidStatus || '').toUpperCase() === 'INTEREST_PAID';
  }

  downloadInterestReceipt(row: any): void {
    if (!row?.id || !this.canDownloadInterestReceipt(row)) {
      this.toastService.showWarning('Interest payment receipt is not available for this installment.');
      return;
    }
    const rowId = Number(row.id);
    this.downloadingReceiptRowId = rowId;

    const receiptNumber = row.payemntReceiptNumber;
    const fileName = receiptNumber
      ? `Interest_Payment_Receipt_${receiptNumber}.pdf`
      : `Interest_Payment_Receipt_${rowId}.pdf`;

    const request$ = receiptNumber
      ? this.personalService.downloadPaymentReceipt(receiptNumber)
      : this.personalService.downloadInterestReceiptByRepaymentId(rowId);

    request$.subscribe({
      next: (blob) => {
        this.downloadingReceiptRowId = null;
        if (!blob || blob.size === 0) {
          this.toastService.showError('Receipt file is empty.');
          return;
        }
        // If backend returned JSON error as blob, detect and show message
        if (blob.type && blob.type.indexOf('application/json') >= 0) {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const err = JSON.parse(String(reader.result || '{}'));
              this.toastService.showError(err?.message || 'Failed to download receipt.');
            } catch {
              this.toastService.showError('Failed to download receipt.');
            }
          };
          reader.readAsText(blob);
          return;
        }
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
        this.toastService.showSuccess('Interest payment receipt downloaded.');
        // Refresh so payemntReceiptNumber is stored after backfill generate
        if (!receiptNumber) {
          this.loadData();
        }
      },
      error: (err: any) => {
        this.downloadingReceiptRowId = null;
        console.error('Error downloading interest receipt:', err);
        this.toastService.showError(
          err?.error?.message || err?.message || 'Failed to download interest payment receipt.'
        );
      }
    });
  }

  /**
   * Pay is enabled only for the earliest unpaid installment in schedule order
   * (row N when rows 0..N-1 are all paid).
   */
  canPayInstallment(row: any): boolean {
    if (
      (this.paymentType !== 'PART_PAYMENT' && this.paymentType !== 'INTEREST_PAYMENT') ||
      !row ||
      this.isInstallmentPaid(row)
    ) {
      return false;
    }
    if (this.payingRowId != null) {
      return false;
    }
    const idx = this.scheduleData.findIndex((r) => r?.id === row.id);
    if (idx < 0) return false;
    for (let i = 0; i < idx; i++) {
      if (!this.isInstallmentPaid(this.scheduleData[i])) {
        return false;
      }
    }
    return true;
  }

  private num(v: any): number {
    return v != null && v !== '' ? Number(v) : 0;
  }

  /** Gross interest due — mirrors backend resolveGrossInterestDue */
  getGrossInterestAmount(row: any): number {
    if (this.num(row?.interestAddedToPrinciple) > 0) {
      return Math.ceil(this.num(row.interestAddedToPrinciple));
    }
    if (this.num(row?.totalInterestDueAmount) > 0) {
      return Math.ceil(this.num(row.totalInterestDueAmount));
    }
    if (this.num(row?.monthlyInterestAmount) > 0) {
      return Math.ceil(this.num(row.monthlyInterestAmount));
    }
    return 0;
  }

  private isOverdueOrDueToday(row: any): boolean {
    const dueRaw = row?.interestPayDueDate;
    const due = dueRaw ? new Date(dueRaw) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return !due || isNaN(due.getTime()) || due.getTime() <= today.getTime();
  }

  /**
   * Rebate used by backend resolveRebateAmount:
   * - applyRebate true → request rebate or monthly rebate
   * - applyRebate false → 0 if overdue/due today, else monthly rebate
   */
  getEffectiveRebateAmount(row: any, applyRebate: boolean): number {
    const monthlyRebate = this.num(row?.monthlyRebateInterestAmount);
    if (applyRebate) {
      return monthlyRebate;
    }
    return this.isOverdueOrDueToday(row) ? 0 : monthlyRebate;
  }

  /** Amount customer must pay after effective rebate */
  getPayableInterestAmount(row: any, applyRebate: boolean = false): number {
    const gross = this.getGrossInterestAmount(row);
    const rebate = this.getEffectiveRebateAmount(row, applyRebate);
    return Math.max(0, Math.ceil(gross - rebate));
  }

  openPayPopup(row: any): void {
    if (!this.canPayInstallment(row)) {
      return;
    }
    if (this.getGrossInterestAmount(row) <= 0) {
      this.toastService.showWarning('No interest due for this installment.');
      return;
    }
    this.selectedPayRow = row;
    this.applyRebate = false;
    this.showPayPopup = true;
  }

  closePayPopup(): void {
    if (this.payingRowId != null) {
      return;
    }
    this.showPayPopup = false;
    this.selectedPayRow = null;
    this.applyRebate = false;
  }

  /** Submit payInterestAmount from popup */
  confirmPayInterest(): void {
    const row = this.selectedPayRow;
    if (!row || !this.canPayInstallment(row)) {
      return;
    }

    const interestAmount = this.getGrossInterestAmount(row);
    const payableAmount = this.getPayableInterestAmount(row, this.applyRebate);

    if (interestAmount <= 0 || payableAmount <= 0) {
      this.toastService.showWarning('No interest due for this installment.');
      return;
    }

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const paymentPaidDate =
      `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
      `T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    // Match backend PayInterestRequest — paidInterestAmount is gross; rebate applied when applyRebate is true
    const payload = {
      id: Number(row.id),
      paymentMode: 'CASH',
      interestAmount,
      paidInterestAmount: interestAmount,
      rebateAmount: this.applyRebate ? this.num(row?.monthlyRebateInterestAmount) : 0.0,
      applyRebate: this.applyRebate === true,
      customerId: this.customerId,
      loanAccountNo: this.loanAccountNumber,
      paymentPaidDate
    };

    this.payingRowId = Number(row.id);
    this.personalService.payInterestAmount(payload).subscribe({
      next: (res: any) => {
        this.payingRowId = null;
        const code = res?.code ?? res?.status;
        if (code === 200 || code === 201) {
          this.toastService.showSuccess(res?.message || 'Interest paid successfully.');
          this.showPayPopup = false;
          this.selectedPayRow = null;
          this.applyRebate = false;
          this.loadData();
        } else {
          this.toastService.showError(res?.message || 'Failed to pay interest amount.');
        }
      },
      error: (err: any) => {
        this.payingRowId = null;
        console.error('Error paying interest amount:', err);
        this.toastService.showError(
          err?.error?.message || err?.message || 'Failed to pay interest amount. Please try again.'
        );
      }
    });
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

    // Part payment: Interest due (till date) = unpaid + due date before today only.
    // Other flows (e.g. loan release) keep full remaining interest sum.
    this.accruedInterest =
      this.paymentType === 'PART_PAYMENT'
        ? totalOverdueUnpaidInterestFromSchedule(schedule)
        : totalRemainingInterestFromSchedule(schedule);
    this.totalOutstanding = this.principalOutstanding + this.accruedInterest;

    const instOpts = buildInterestInstallmentOptions(schedule);
    // Earliest installment that still has interest due (for fallbacks)
    this.firstUnpaidInstallmentInterest = instOpts.length > 0 ? instOpts[0].remaining : 0;
  }

  /** Attach schedule rows + suggested rebate (as of today) for loan-payment interest step */
  private enrichOutstandingWithScheduleRebate(): void {
    if (!this.outstandingData) return;
    if (this.scheduleData?.length > 0) {
      this.outstandingData.repaymentScheduleRows = this.scheduleData.map((r) => ({ ...r }));
      const meta = resolveScheduleRebateSuggestion(this.scheduleData, new Date(), {});
      this.outstandingData.scheduleSuggestedRebateAmount = meta?.amount ?? null;
      this.outstandingData.scheduleSuggestedRebateDueDate = meta?.dueDate ?? null;
      this.outstandingData.waiverInterestDueDate =
        meta?.dueDate ?? this.outstandingData.waiverInterestDueDate ?? null;
    } else {
      this.outstandingData.repaymentScheduleRows = [];
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

  /** Same sources as payment-entry “Net disbursed amount” (outstanding API). */
  getNetDisbursedAmount(): number {
    const d = this.outstandingData;
    if (!d) return 0;
    const raw =
      d.totalScanctionedAmount ||
      d.totalSanctionedAmount ||
      d.netDisbursedAmount ||
      d.principalOutstanding;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
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
