import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';
import { resolveScheduleRebateSuggestion } from '../../schedule-rebate.util';
import { buildInterestInstallmentOptions } from '../../schedule-interest.util';

@Component({
  selector: 'app-payment-entry',
  templateUrl: './payment-entry.component.html',
  styleUrls: ['./payment-entry.component.css']
})
export class PaymentEntryComponent implements OnInit, OnChanges {
  @Input() customerId!: string;
  @Input() loanAccountNumber!: string;
  @Input() paymentType: 'PART_PAYMENT' | 'INTEREST_PAYMENT' | '' = '';
  @Input() outstandingData: any;
  @Output() stepCompleted = new EventEmitter<void>();
  @Output() paymentCompleted = new EventEmitter<any>();

  Math = Math;
  paymentForm!: FormGroup;
  isLoading = false;
  isPaymentProcessed = false;

  /** Cached for mat-select — do not rebuild in template each CD (was freezing UI). */
  backwardInstallmentOptions: { value: string; label: string }[] = [];

  /** Cached — which schedule installment this interest payment applies to (previous / current / future month). */
  interestInstallmentSelectOptions: { value: string; label: string; remaining: number }[] = [];

  paymentModes = [
    { value: 'CASH', label: 'Cash', icon: 'payments' },
    { value: 'NEFT', label: 'NEFT/RTGS', icon: 'account_balance' },
    { value: 'UPI', label: 'UPI', icon: 'smartphone' },
    { value: 'CHEQUE', label: 'Cheque', icon: 'description' },
    { value: 'DD', label: 'Demand Draft', icon: 'receipt' },
    { value: 'ONLINE', label: 'Online Banking', icon: 'language' }
  ];

  constructor(
    private fb: FormBuilder,
    private personalService: PersonalDetailsService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['outstandingData']?.currentValue) {
      this.rebuildBackwardInstallmentOptions();
      this.rebuildInterestInstallmentOptions();
    }
    if ((changes['paymentType'] || changes['outstandingData']) && this.paymentForm) {
      if (this.paymentType === 'PART_PAYMENT') {
        this.paymentForm.patchValue(
          {
            applyRebate: false,
            rebateAmount: null,
            rebateReason: '',
            useBackwardRebate: false,
            rebateAnchorDueDate: null,
            interestInstallmentDueDate: null
          },
          { emitEvent: false }
        );
      }
      if (this.paymentType === 'INTEREST_PAYMENT') {
        this.ensureInterestInstallmentSelection();
      }
      this.updateInterestInstallmentValidators();
      this.updateAmountDefaults();
      this.syncRebateFromScheduleIfNeeded();
      this.updateRebateValidators();
      this.syncPaymentAmountToEffectiveInterest();
    }
  }

  initForm(): void {
    // Set default amount based on payment type
    let defaultAmount = 0;
    if (this.paymentType === 'INTEREST_PAYMENT') {
      defaultAmount = this.getAccruedInterest();
    }

    this.paymentForm = this.fb.group({
      paymentMode: ['', Validators.required],
      paymentAmount: [defaultAmount, [Validators.required, Validators.min(this.getMinimumAmount())]],
      transactionReference: [''],
      bankName: [''],
      chequeNumber: [''],
      chequeDate: [''],
      upiId: [''],
      remarks: [''],
      paymentDate: [new Date().toISOString().split('T')[0], Validators.required],
      applyRebate: [false],
      rebateAmount: [null as number | null],
      rebateReason: [''],
      useBackwardRebate: [false],
      rebateAnchorDueDate: [null as string | null],
      interestInstallmentDueDate: [null as string | null]
    });

    this.paymentForm.get('paymentMode')?.valueChanges.subscribe(mode => {
      this.updateValidators(mode);
    });

    this.paymentForm.get('applyRebate')?.valueChanges.subscribe((checked) => {
      if (checked) {
        const sug = this.getScheduleSuggestedRebate();
        if (this.paymentType === 'INTEREST_PAYMENT' && sug > 0) {
          this.paymentForm.patchValue({ rebateAmount: sug }, { emitEvent: false });
        }
      } else {
        this.paymentForm.patchValue(
          {
            rebateAmount: null,
            rebateReason: '',
            useBackwardRebate: false,
            rebateAnchorDueDate: null
          },
          { emitEvent: false }
        );
        if (this.paymentType === 'INTEREST_PAYMENT') {
          const pay = this.paymentForm.get('paymentAmount');
          pay?.setValue(this.getAccruedInterest(), { emitEvent: false });
        }
      }
      this.updateRebateValidators();
      this.syncPaymentAmountToEffectiveInterest();
    });

    this.paymentForm.get('paymentDate')?.valueChanges.subscribe(() => {
      if (this.paymentType !== 'INTEREST_PAYMENT') return;
      if (this.paymentForm.get('applyRebate')?.value) {
        this.syncRebateFromScheduleIfNeeded();
        this.updateRebateValidators();
        this.syncPaymentAmountToEffectiveInterest();
      } else {
        this.suggestInterestInstallmentForPaymentDateMonth();
        this.updateAmountDefaults();
        this.updatePaymentAmountValidators();
      }
    });

    this.paymentForm.get('interestInstallmentDueDate')?.valueChanges.subscribe(() => {
      if (this.paymentType !== 'INTEREST_PAYMENT') return;
      queueMicrotask(() => {
        if (!this.paymentForm) return;
        this.syncRebateFromScheduleIfNeeded();
        this.updateRebateValidators();
        this.updateAmountDefaults();
        this.syncPaymentAmountToEffectiveInterest();
        this.updatePaymentAmountValidators();
      });
    });

    this.paymentForm.get('useBackwardRebate')?.valueChanges.subscribe((useBackward) => {
      // Only clear anchor when turning backward off; avoid extra patchValue on check (re-entrancy with Material).
      if (!useBackward) {
        this.paymentForm.patchValue({ rebateAnchorDueDate: null }, { emitEvent: false });
      }
      // Defer: checkbox + mat-select appearing same tick can loop change detection / overlay focus.
      queueMicrotask(() => {
        if (!this.paymentForm) return;
        if (this.paymentType === 'INTEREST_PAYMENT' && this.paymentForm.get('applyRebate')?.value) {
          this.syncRebateFromScheduleIfNeeded();
          this.updateRebateValidators();
          this.syncPaymentAmountToEffectiveInterest();
        }
      });
    });

    this.paymentForm.get('rebateAnchorDueDate')?.valueChanges.subscribe(() => {
      if (this.paymentType === 'INTEREST_PAYMENT' && this.paymentForm.get('applyRebate')?.value) {
        this.syncRebateFromScheduleIfNeeded();
        this.updateRebateValidators();
        this.syncPaymentAmountToEffectiveInterest();
      }
    });

    this.paymentForm.get('rebateAmount')?.valueChanges.subscribe(() => {
      if (this.paymentType === 'INTEREST_PAYMENT' && this.paymentForm.get('applyRebate')?.value) {
        this.syncPaymentAmountToEffectiveInterest();
        this.updatePaymentAmountValidators();
      }
    });

    this.paymentForm.get('paymentAmount')?.valueChanges.subscribe(() => {
      if (this.paymentType === 'INTEREST_PAYMENT' && this.paymentForm.get('applyRebate')?.value) {
        this.paymentForm.get('rebateAmount')?.updateValueAndValidity({ emitEvent: false });
      }
    });

    this.updateValidators('');
    this.rebuildBackwardInstallmentOptions();
    this.rebuildInterestInstallmentOptions();
    if (this.paymentType === 'INTEREST_PAYMENT') {
      this.ensureInterestInstallmentSelection();
    }
    this.updateInterestInstallmentValidators();
    this.updateAmountDefaults();
    this.updateRebateValidators();
  }

  trackByBackwardOption(_index: number, opt: { value: string; label: string }): string {
    return opt.value;
  }

  trackByInterestInstallment(_index: number, opt: { value: string; label: string }): string {
    return opt.value;
  }

  /** True when schedule is loaded and at least one row has rebate (cached list non-empty). */
  showBackwardRebateUi(): boolean {
    return this.backwardInstallmentOptions.length > 0;
  }

  /** Interest payment: show installment picker when schedule has any installment with interest remaining. */
  showInterestInstallmentPicker(): boolean {
    return this.paymentType === 'INTEREST_PAYMENT' && this.interestInstallmentSelectOptions.length > 0;
  }

  private rebuildBackwardInstallmentOptions(): void {
    this.backwardInstallmentOptions = this.computeBackwardInstallmentOptions();
  }

  private rebuildInterestInstallmentOptions(): void {
    const rows = this.getRepaymentScheduleRows();
    const raw = buildInterestInstallmentOptions(rows);
    this.interestInstallmentSelectOptions = raw.map((o) => ({
      value: o.value,
      remaining: o.remaining,
      label: `${this.formatInstallmentDueHeading(o.value)} — ${this.formatCurrency(o.remaining)} due`
    }));
  }

  private formatInstallmentDueHeading(iso: string): string {
    const dt = new Date(iso);
    if (isNaN(dt.getTime())) return iso;
    return `Due ${dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }

  /**
   * Remaining interest for the selected schedule installment (or portfolio total when no row picker).
   * Used for amount defaults, caps, rebate, and validation for this payment.
   */
  getInterestPaymentBasis(): number {
    const opts = this.interestInstallmentSelectOptions;
    if (!opts.length) return this.outstandingData?.accruedInterest || 0;
    const key = this.paymentForm?.get('interestInstallmentDueDate')?.value;
    if (key != null && key !== '') {
      const hit = opts.find((o) => o.value === key);
      if (hit) return hit.remaining;
    }
    return opts[0].remaining;
  }

  private ensureInterestInstallmentSelection(): void {
    if (!this.paymentForm || this.paymentType !== 'INTEREST_PAYMENT') return;
    const opts = this.interestInstallmentSelectOptions;
    if (!opts.length) return;
    const cur = this.paymentForm.get('interestInstallmentDueDate')?.value;
    const valid = cur != null && cur !== '' && opts.some((o) => o.value === cur);
    if (!valid) {
      const pick = this.pickDefaultInterestInstallmentDueDate();
      if (pick) {
        this.paymentForm.patchValue({ interestInstallmentDueDate: pick }, { emitEvent: false });
      }
    }
  }

  /** Prefer installment whose due falls in the same calendar month as payment date; else earliest with balance. */
  private pickDefaultInterestInstallmentDueDate(): string | null {
    const opts = this.interestInstallmentSelectOptions;
    if (!opts.length) return null;
    const pd = this.parsePaymentDateFromForm();
    if (pd) {
      const py = pd.getFullYear();
      const pm = pd.getMonth();
      for (const o of opts) {
        const d = new Date(o.value);
        if (!isNaN(d.getTime()) && d.getFullYear() === py && d.getMonth() === pm) {
          return o.value;
        }
      }
    }
    return opts[0].value;
  }

  /** When payment date changes, prefer the installment due in that calendar month (if any). */
  private suggestInterestInstallmentForPaymentDateMonth(): void {
    if (!this.paymentForm || !this.interestInstallmentSelectOptions.length) return;
    const pick = this.pickDefaultInterestInstallmentDueDate();
    if (pick) {
      this.paymentForm.patchValue({ interestInstallmentDueDate: pick }, { emitEvent: false });
    }
  }

  private updateInterestInstallmentValidators(): void {
    if (!this.paymentForm) return;
    const c = this.paymentForm.get('interestInstallmentDueDate');
    if (!c) return;
    if (this.paymentType === 'INTEREST_PAYMENT' && this.interestInstallmentSelectOptions.length > 0) {
      c.setValidators([Validators.required]);
    } else {
      c.clearValidators();
      c.setValue(null, { emitEvent: false });
    }
    c.updateValueAndValidity({ emitEvent: false });
  }

  private computeBackwardInstallmentOptions(): { value: string; label: string }[] {
    const rows = this.getRepaymentScheduleRows();
    if (!rows.length) return [];
    const num = (v: any) => (v != null && v !== '' ? Number(v) : 0);
    const parseDue = (raw: any): Date | null => {
      if (!raw) return null;
      const d = new Date(raw);
      return isNaN(d.getTime()) ? null : d;
    };
    const items = rows
      .filter((r: any) => num(r.monthlyRebateInterestAmount) > 0 && r.interestPayDueDate)
      .map((r: any) => ({
        value: String(r.interestPayDueDate),
        due: parseDue(r.interestPayDueDate)!,
        rebate: num(r.monthlyRebateInterestAmount)
      }))
      .filter((x) => x.due)
      .sort((a, b) => b.due.getTime() - a.due.getTime());
    return items.map((i) => ({
      value: i.value,
      label: `Due ${i.due.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })} — ${this.formatCurrency(i.rebate)}`
    }));
  }

  /** Rows copied from repayment schedule (for payment-date / backward rebate resolution). */
  private getRepaymentScheduleRows(): any[] {
    return Array.isArray(this.outstandingData?.repaymentScheduleRows)
      ? this.outstandingData.repaymentScheduleRows
      : [];
  }

  /** Template: show backward rebate only when schedule rows were loaded with outstanding data. */
  hasScheduleRebateRows(): boolean {
    return this.getRepaymentScheduleRows().length > 0;
  }

  private parsePaymentDateFromForm(): Date | null {
    const raw = this.paymentForm?.get('paymentDate')?.value;
    if (!raw) return null;
    const s = String(raw);
    const d = new Date(s.length <= 10 ? `${s}T12:00:00` : s);
    return isNaN(d.getTime()) ? null : d;
  }

  /**
   * Resolved rebate + waiver due date from schedule + payment date (or backward anchor).
   * When schedule rows exist, this is the source of truth for the interest step.
   */
  private getResolvedScheduleRebateMeta(): { amount: number; dueDate: string } | null {
    if (this.paymentType !== 'INTEREST_PAYMENT' || !this.paymentForm) return null;
    const rows = this.getRepaymentScheduleRows();
    if (!rows.length) return null;
    const pd = this.parsePaymentDateFromForm();
    if (!pd) return null;
    const backward = !!this.paymentForm.get('useBackwardRebate')?.value;
    const anchor = this.paymentForm.get('rebateAnchorDueDate')?.value;
    if (backward) {
      if (anchor == null || anchor === '') return null;
      return resolveScheduleRebateSuggestion(rows, pd, {
        backwardMode: true,
        anchorDueDateIso: String(anchor)
      });
    }
    return resolveScheduleRebateSuggestion(rows, pd, {});
  }

  /** Schedule row: monthly rebate from resolver or legacy outstanding fields. */
  getScheduleSuggestedRebate(): number {
    const rows = this.getRepaymentScheduleRows();
    if (rows.length && this.paymentType === 'INTEREST_PAYMENT') {
      const meta = this.getResolvedScheduleRebateMeta();
      return meta && meta.amount > 0 ? meta.amount : 0;
    }
    const v = this.outstandingData?.scheduleSuggestedRebateAmount;
    if (v == null || v === '') return 0;
    const n = Number(v);
    return !isNaN(n) && n > 0 ? n : 0;
  }

  getScheduleSuggestedRebateDueDate(): string | null {
    const rows = this.getRepaymentScheduleRows();
    if (rows.length && this.paymentType === 'INTEREST_PAYMENT') {
      return this.getResolvedScheduleRebateMeta()?.dueDate ?? null;
    }
    return this.outstandingData?.scheduleSuggestedRebateDueDate || null;
  }

  /** Due date for waiver/discount line on payPartPaymentAndInterestAmount (schedule-derived or API field). */
  getWaiverInterestDueDateForApi(): string | null {
    const fromResolved = this.getScheduleSuggestedRebateDueDate();
    if (fromResolved) return String(fromResolved).trim() || null;
    const raw = this.outstandingData?.waiverInterestDueDate;
    if (raw == null || raw === '') return null;
    return String(raw).trim() || null;
  }

  /** Read-only rebate when resolver yields an amount (automatic or backward with anchor). */
  isScheduleRebateReadonly(): boolean {
    if (this.paymentType !== 'INTEREST_PAYMENT' || !this.paymentForm?.get('applyRebate')?.value) {
      return false;
    }
    if (this.paymentForm.get('useBackwardRebate')?.value) {
      const hasAnchor = !!this.paymentForm.get('rebateAnchorDueDate')?.value;
      return hasAnchor && this.getScheduleSuggestedRebate() > 0;
    }
    return this.getScheduleSuggestedRebate() > 0;
  }

  private syncRebateFromScheduleIfNeeded(): void {
    if (this.paymentType !== 'INTEREST_PAYMENT' || !this.paymentForm?.get('applyRebate')?.value) {
      return;
    }
    const sug = this.getScheduleSuggestedRebate();
    if (sug > 0) {
      this.paymentForm.patchValue({ rebateAmount: sug }, { emitEvent: false });
      return;
    }
    if (this.paymentForm.get('useBackwardRebate')?.value) {
      this.paymentForm.patchValue({ rebateAmount: null }, { emitEvent: false });
    }
  }

  /**
   * When rebate applies, amount field and API paymentAmount = effective interest due (accrued − rebate).
   */
  private syncPaymentAmountToEffectiveInterest(): void {
    if (this.paymentType !== 'INTEREST_PAYMENT' || !this.paymentForm) return;
    if (!this.paymentForm.get('applyRebate')?.value) return;
    const payCtrl = this.paymentForm.get('paymentAmount');
    if (!payCtrl) return;
    let eff = this.getEffectiveAccruedInterestForPayment();
    const maxPay = this.getMaxAmount();
    if (eff > maxPay) eff = maxPay;
    const rounded = Math.round(Math.max(0, eff) * 100) / 100;
    payCtrl.setValue(rounded, { emitEvent: false });
    payCtrl.updateValueAndValidity({ emitEvent: false });
  }

  private updatePaymentAmountValidators(): void {
    const paymentAmount = this.paymentForm?.get('paymentAmount');
    if (!paymentAmount) return;
    const apply =
      !!this.paymentForm.get('applyRebate')?.value && this.paymentType === 'INTEREST_PAYMENT';

    if (apply) {
      const maxPay = this.getMaxAmount();
      paymentAmount.setValidators([
        Validators.required,
        (c: AbstractControl): ValidationErrors | null => {
          const v = Number(c.value) || 0;
          const eff = this.getEffectiveAccruedInterestForPayment();
          if (v > maxPay + 0.01) return { maxAmount: true };
          if (Math.abs(v - eff) > 0.02) return { mustMatchEffective: true };
          return null;
        }
      ]);
    } else {
      paymentAmount.setValidators([Validators.required, Validators.min(this.getMinimumAmount())]);
    }
    paymentAmount.updateValueAndValidity({ emitEvent: false });
  }

  /** Process button — amount rules + form valid (payment is clamped after rebate so this stays consistent). */
  canProcessPayment(): boolean {
    if (!this.paymentForm) return false;
    return this.isAmountValid() && this.paymentForm.valid;
  }

  /** Max rebate: interest payment → accrued interest; part payment → principal outstanding */
  getRebateCap(): number {
    if (this.paymentType === 'INTEREST_PAYMENT') {
      return Math.max(0, this.getAccruedInterest());
    }
    return Math.max(0, this.getPrincipalOutstanding());
  }

  getRebateAmountNumber(): number {
    if (!this.paymentForm.get('applyRebate')?.value) return 0;
    return Number(this.paymentForm.get('rebateAmount')?.value) || 0;
  }

  /**
   * Interest due after rebate (for validation & split). Part payment ignores rebate here.
   */
  getEffectiveAccruedInterestForPayment(): number {
    const accrued = this.getAccruedInterest();
    if (this.paymentType !== 'INTEREST_PAYMENT' || !this.paymentForm.get('applyRebate')?.value) {
      return accrued;
    }
    return Math.max(0, accrued - this.getRebateAmountNumber());
  }

  private updateRebateValidators(): void {
    if (!this.paymentForm) return;
    const apply =
      !!this.paymentForm.get('applyRebate')?.value && this.paymentType === 'INTEREST_PAYMENT';
    const rebateAmountCtrl = this.paymentForm.get('rebateAmount');
    const rebateReasonCtrl = this.paymentForm.get('rebateReason');
    const anchorCtrl = this.paymentForm.get('rebateAnchorDueDate');
    if (!rebateAmountCtrl || !rebateReasonCtrl) return;

    const backward =
      apply && !!this.paymentForm.get('useBackwardRebate')?.value && this.getRepaymentScheduleRows().length > 0;
    if (anchorCtrl) {
      if (backward) {
        anchorCtrl.setValidators([Validators.required]);
      } else {
        anchorCtrl.clearValidators();
        if (!this.paymentForm.get('useBackwardRebate')?.value) {
          anchorCtrl.setValue(null, { emitEvent: false });
        }
      }
      anchorCtrl.updateValueAndValidity({ emitEvent: false });
    }

    if (apply) {
      rebateAmountCtrl.setValidators([
        Validators.required,
        Validators.min(0.01),
        (c: AbstractControl): ValidationErrors | null => {
          const max = this.getRebateCap();
          const v = Number(c.value);
          if (max > 0 && v > max) return { rebateTooHigh: true };
          return null;
        },
        (c: AbstractControl): ValidationErrors | null => {
          if (this.paymentType !== 'INTEREST_PAYMENT') return null;
          const rebate = Number(c.value) || 0;
          const min = this.getMinimumAmount();
          const eff = this.getAccruedInterest() - rebate;
          if (min <= 0 || eff >= min) return null;
          const pay = Number(this.paymentForm.get('paymentAmount')?.value) || 0;
          if (pay >= min) return null;
          if (Math.abs(pay - eff) < 0.02) return null;
          return { rebateLeavesBelowMin: true };
        }
      ]);
      rebateReasonCtrl.setValidators([
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(500)
      ]);
    } else {
      rebateAmountCtrl.clearValidators();
      rebateReasonCtrl.clearValidators();
      rebateAmountCtrl.setValue(null);
      rebateReasonCtrl.setValue('');
    }
    rebateAmountCtrl.updateValueAndValidity({ emitEvent: false });
    rebateReasonCtrl.updateValueAndValidity({ emitEvent: false });
    this.updatePaymentAmountValidators();
  }

  private updateAmountDefaults(): void {
    const paymentAmount = this.paymentForm.get('paymentAmount');
    if (!paymentAmount) return;

    const apply =
      !!this.paymentForm.get('applyRebate')?.value && this.paymentType === 'INTEREST_PAYMENT';
    const defaultAmount =
      this.paymentType === 'INTEREST_PAYMENT'
        ? apply
          ? this.getEffectiveAccruedInterestForPayment()
          : this.getAccruedInterest()
        : paymentAmount.value;

    this.updatePaymentAmountValidators();

    if (this.paymentType === 'INTEREST_PAYMENT') {
      paymentAmount.setValue(defaultAmount, { emitEvent: false });
      paymentAmount.updateValueAndValidity({ emitEvent: false });
    }
  }

  updateValidators(mode: string): void {
    const transactionRef = this.paymentForm.get('transactionReference');
    const bankName = this.paymentForm.get('bankName');
    const chequeNumber = this.paymentForm.get('chequeNumber');
    const chequeDate = this.paymentForm.get('chequeDate');
    const upiId = this.paymentForm.get('upiId');

    transactionRef?.clearValidators();
    bankName?.clearValidators();
    chequeNumber?.clearValidators();
    chequeDate?.clearValidators();
    upiId?.clearValidators();

    switch (mode) {
      case 'NEFT':
      case 'ONLINE':
        transactionRef?.setValidators([Validators.required]);
        bankName?.setValidators([Validators.required]);
        break;
      case 'CHEQUE':
      case 'DD':
        chequeNumber?.setValidators([Validators.required]);
        chequeDate?.setValidators([Validators.required]);
        bankName?.setValidators([Validators.required]);
        break;
      case 'UPI':
        upiId?.setValidators([Validators.required]);
        transactionRef?.setValidators([Validators.required]);
        break;
    }

    transactionRef?.updateValueAndValidity();
    bankName?.updateValueAndValidity();
    chequeNumber?.updateValueAndValidity();
    chequeDate?.updateValueAndValidity();
    upiId?.updateValueAndValidity();
  }

  /** Get amount helpers */
  private getPrincipalOutstanding(): number {
    return this.outstandingData?.principalOutstanding || 0;
  }

  /**
   * Interest bucket for this payment (selected installment remaining, or total portfolio interest if no picker).
   */
  private getAccruedInterest(): number {
    return this.getInterestPaymentBasis();
  }

  /** Minimum interest = ₹1 when paying by installment (partial OK); else legacy first-unpaid / total rules */
  getMinimumAmount(): number {
    if (this.paymentType === 'INTEREST_PAYMENT') {
      if (this.interestInstallmentSelectOptions.length > 0) return 1;
      const firstUnpaid = this.outstandingData?.firstUnpaidInstallmentInterest ?? 0;
      const accrued = this.outstandingData?.accruedInterest || 0;
      if (firstUnpaid > 0) return firstUnpaid;
      return accrued > 0 ? accrued : 1;
    }
    return 1;
  }

  /** Get maximum payable amount (quick actions / apply cap) */
  getMaxAmount(): number {
    if (this.paymentType === 'INTEREST_PAYMENT') {
      return this.getEffectiveAccruedInterestForPayment() + this.getPrincipalOutstanding();
    }
    return this.getPrincipalOutstanding();
  }

  /** Check if entered amount is valid */
  isAmountValid(): boolean {
    const amount = Number(this.paymentForm.get('paymentAmount')?.value) || 0;
    const min = this.getMinimumAmount();

    if (this.paymentType === 'INTEREST_PAYMENT') {
      const maxPay = this.getMaxAmount();
      const apply = !!this.paymentForm.get('applyRebate')?.value;
      if (apply) {
        const eff = this.getEffectiveAccruedInterestForPayment();
        return amount <= maxPay + 1e-6 && Math.abs(amount - eff) < 0.02;
      }
      const effectiveAccrued = this.getEffectiveAccruedInterestForPayment();
      if (effectiveAccrued < min && amount < min) {
        return false;
      }
      return amount >= min && amount <= maxPay;
    }
    return amount >= min;
  }

  getAmountInfo(): { label: string; amount: number; type: string } {
    const amount = this.paymentForm.get('paymentAmount')?.value || 0;

    if (this.paymentType === 'INTEREST_PAYMENT') {
      const interestDue = this.getEffectiveAccruedInterestForPayment();
      const split = this.getInterestSplit();
      const remainingInterest = Math.max(interestDue - split.interestPortion, 0);
      if (remainingInterest > 0) {
        return { label: 'Interest Remaining', amount: remainingInterest, type: 'warning' };
      }
      if (split.principalPortion > 0) {
        return {
          label: 'Principal After Payment',
          amount: Math.max(this.getPrincipalOutstanding() - split.principalPortion, 0),
          type: 'success'
        };
      }
      return { label: 'Interest Cleared', amount: 0, type: 'success' };
    }

    // Part payment
    const remaining = this.getPrincipalOutstanding() - amount;
    return {
      label: 'New Principal Balance',
      amount: Math.max(remaining, 0),
      type: remaining > 0 ? 'info' : 'success'
    };
  }

  getInterestSplit(): { interestPortion: number; principalPortion: number } {
    const amount = this.paymentForm.get('paymentAmount')?.value || 0;
    if (this.paymentType === 'INTEREST_PAYMENT') {
      const interestCap = this.getEffectiveAccruedInterestForPayment();
      const interestPortion = Math.min(amount, interestCap);
      const principalPortion = Math.max(amount - interestPortion, 0);
      return { interestPortion, principalPortion };
    }
    return { interestPortion: 0, principalPortion: Math.min(amount, this.getPrincipalOutstanding()) };
  }

  getQuickAmountOptions(): { label: string; amount: number; description: string }[] {
    const principal = this.getPrincipalOutstanding();
    const interest = this.getEffectiveAccruedInterestForPayment();
    if (this.paymentType === 'INTEREST_PAYMENT') {
      const instLabel =
        this.interestInstallmentSelectOptions.length > 0 ? 'Selected installment' : 'Interest due';
      return [
        { label: instLabel, amount: interest, description: 'Interest for chosen installment (after rebate)' },
        {
          label: 'Interest + 10%',
          amount: Math.min(interest + principal * 0.1, this.getMaxAmount()),
          description: 'Reduce principal after clearing interest'
        },
        {
          label: 'Full Outstanding',
          amount: this.getMaxAmount(),
          description: 'Clear interest and principal'
        }
      ].filter(option => option.amount > 0);
    }

    return [
      { label: '25%', amount: Math.round(principal * 0.25), description: 'Quarter of principal' },
      { label: '50%', amount: Math.round(principal * 0.5), description: 'Half of principal' },
      { label: '75%', amount: Math.round(principal * 0.75), description: 'Aggressive part payment' }
    ].filter(option => option.amount > 0);
  }

  applyQuickAmount(amount: number): void {
    if (!amount) return;
    this.paymentForm.get('paymentAmount')?.setValue(Math.min(amount, this.getMaxAmount()));
  }

  getComplianceReminders(): { icon: string; label: string; helper: string; status: 'ok' | 'warn' }[] {
    const amount = this.paymentForm.get('paymentAmount')?.value || 0;
    const mode = this.paymentForm.get('paymentMode')?.value || '';
    const reminders: { icon: string; label: string; helper: string; status: 'ok' | 'warn' }[] = [];
    const cashLimit = 199999;

    if (mode === 'CASH') {
      const withinLimit = amount <= cashLimit;
      reminders.push({
        icon: 'payments',
        label: withinLimit ? 'Cash within RBI threshold' : 'Cash exceeds daily limit',
        helper: `₹${cashLimit.toLocaleString('en-IN')} max per customer per day`,
        status: withinLimit ? 'ok' : 'warn'
      });
    } else if (mode) {
      reminders.push({
        icon: 'account_balance',
        label: 'Bank instrument selected',
        helper: 'Ensure UTR / cheque details captured',
        status: 'ok'
      });
    }

    if (this.paymentType === 'INTEREST_PAYMENT') {
      const target = this.getEffectiveAccruedInterestForPayment();
      const interestCovered = amount >= target;
      reminders.push({
        icon: 'trending_up',
        label: interestCovered ? 'Interest fully covered' : 'Interest pending',
        helper: interestCovered
          ? 'Any excess will reduce principal immediately'
          : 'Collect full accrued interest to keep account current',
        status: interestCovered ? 'ok' : 'warn'
      });
    } else {
      reminders.push({
        icon: 'insights',
        label: amount > 0 ? 'Principal will reduce' : 'Enter amount to project balance',
        helper: amount > 0
          ? `Projected balance ${this.formatCurrency(Math.max(this.getPrincipalOutstanding() - amount, 0))}`
          : 'Helps lower future interest',
        status: amount > 0 ? 'ok' : 'warn'
      });
    }

    return reminders;
  }

  processPayment(): void {
    if (this.isPaymentProcessed) return;

    if (this.paymentForm.invalid) {
      Object.keys(this.paymentForm.controls).forEach(key => {
        this.paymentForm.get(key)?.markAsTouched();
      });
      this.toastService.showWarning('Please fill all required fields.');
      return;
    }

    if (!this.isAmountValid()) {
      const amount = this.paymentForm.get('paymentAmount')?.value || 0;

      if (this.paymentType === 'INTEREST_PAYMENT') {
        const effective = this.getEffectiveAccruedInterestForPayment();
        const minInstallment = this.getMinimumAmount();
        if (effective < minInstallment && amount < minInstallment) {
          this.toastService.showWarning(
            'Rebate is too high: either increase the payment amount to at least the minimum installment or reduce the rebate.'
          );
        } else if (amount > this.getMaxAmount()) {
          this.toastService.showWarning(
            `Amount cannot exceed ${this.formatCurrency(this.getMaxAmount())} (interest due after rebate plus principal outstanding).`
          );
        } else if (amount < minInstallment && minInstallment > 0) {
          this.toastService.showWarning(
            this.interestInstallmentSelectOptions.length > 0
              ? `Enter at least ${this.formatCurrency(minInstallment)} toward this payment (partial installment payments are allowed).`
              : `Pay at least the first unpaid installment interest of ${this.formatCurrency(minInstallment)}.`
          );
        } else {
          this.toastService.showWarning('Enter a valid interest payment amount.');
        }
      } else {
        this.toastService.showWarning('Please enter a payment amount greater than zero.');
      }
      return;
    }

    const applyRebate =
      !!this.paymentForm.get('applyRebate')?.value && this.paymentType === 'INTEREST_PAYMENT';
    const rebateAmount = applyRebate ? Number(this.paymentForm.get('rebateAmount')?.value) || 0 : null;
    const rebateReason = applyRebate ? (this.paymentForm.get('rebateReason')?.value || '').trim() : null;

    if (applyRebate && (!rebateReason || rebateReason.length < 5)) {
      this.toastService.showWarning('Please enter a rebate reason (at least 5 characters).');
      return;
    }
    if (applyRebate && (!rebateAmount || rebateAmount <= 0)) {
      this.toastService.showWarning('Please enter a valid rebate amount.');
      return;
    }

    this.isLoading = true;

    const paymentTypeLabel = this.paymentType === 'PART_PAYMENT' ? 'Part Payment' : 'Interest Payment';
    const paymentDateRaw = this.paymentForm.get('paymentDate')?.value;
    const paymentDateTime = typeof paymentDateRaw === 'string' && paymentDateRaw.includes('T')
      ? paymentDateRaw
      : `${paymentDateRaw}T00:00:00`;

    const waiverDue = applyRebate ? this.getWaiverInterestDueDateForApi() : null;
    const waiverFlag: 'Yes' | 'No' = applyRebate ? 'Yes' : 'No';
    const apiPayload = {
      loanAccountNumber: this.loanAccountNumber,
      customerId: this.customerId,
      paymentAmount: Number(this.paymentForm.get('paymentAmount')?.value),
      paymentType: this.paymentType as 'PART_PAYMENT' | 'INTEREST_PAYMENT',
      paymentDate: paymentDateTime,
      rebateAmount: applyRebate ? rebateAmount : null,
      rebateReason: applyRebate ? rebateReason : null,
      waiverFlag,
      discountAmount: applyRebate ? rebateAmount : null,
      waiverInterestDueDate: waiverDue
    };

    const split = this.getInterestSplit();
    this.personalService.payPartPaymentAndInterestAmount(apiPayload).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.isPaymentProcessed = true;
        const result = {
          ...apiPayload,
          ...(res?.data && typeof res.data === 'object' ? res.data : {}),
          interestComponent: split.interestPortion,
          principalComponent: split.principalPortion,
          projectedPrincipalBalance: Math.max(
            this.getPrincipalOutstanding() - split.principalPortion,
            0
          )
        };
        this.paymentCompleted.emit(result);
        this.stepCompleted.emit();
        this.toastService.showSuccess(`${paymentTypeLabel} processed successfully!`);
      },
      error: (err: any) => {
        this.isLoading = false;
        const errorMsg = err?.error?.message || 'Failed to process payment. Please try again.';
        this.toastService.showError(errorMsg);
      }
    });
  }

  validateStep(): boolean {
    if (!this.isPaymentProcessed) {
      this.toastService.showWarning('Please process the payment before proceeding.');
      return false;
    }
    return true;
  }

  getPaymentTypeLabel(): string {
    if (this.paymentType === 'PART_PAYMENT') return 'Part Payment';
    if (this.paymentType === 'INTEREST_PAYMENT') return 'Interest Payment';
    return '';
  }

  getPaymentModeLabel(): string {
    const mode = this.paymentModes.find(m => m.value === this.paymentForm.get('paymentMode')?.value);
    return mode?.label || '';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  }

  formatScheduleDueShort(): string {
    const d = this.getScheduleSuggestedRebateDueDate();
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '';
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.paymentForm.get(fieldName);
    return field ? field.invalid && field.touched : false;
  }
}
