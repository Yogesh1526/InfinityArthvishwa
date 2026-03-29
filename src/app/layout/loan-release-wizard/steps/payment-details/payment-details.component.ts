import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-payment-details',
  templateUrl: './payment-details.component.html',
  styleUrls: ['./payment-details.component.css']
})
export class PaymentDetailsComponent implements OnInit, OnChanges {
  @Input() customerId!: string;
  @Input() loanAccountNumber!: string;
  @Input() outstandingData: any;
  @Output() stepCompleted = new EventEmitter<void>();
  @Output() paymentCompleted = new EventEmitter<any>();

  Math = Math;
  paymentForm!: FormGroup;
  isLoading = false;
  isPaymentProcessed = false;
  isSaved = false;
  savedData: any = null;

  paymentModes = [
    { value: 'CASH', label: 'Cash' },
    { value: 'NEFT', label: 'NEFT/RTGS' },
    { value: 'UPI', label: 'UPI' },
    { value: 'CHEQUE', label: 'Cheque' },
    { value: 'DD', label: 'Demand Draft' },
    { value: 'ONLINE', label: 'Online Banking' }
  ];

  constructor(
    private fb: FormBuilder,
    private personalService: PersonalDetailsService,
    private toastService: ToastService
  ) {}

  /** localStorage key for persisting saved state */
  private get savedStateKey(): string {
    return `payment_saved_${this.customerId}_${this.loanAccountNumber}`;
  }

  ngOnInit(): void {
    this.initForm();
    this.restoreSavedState();
    this.loadExistingPayment();
  }

  /**
   * Same figure as Outstanding Details "Total Outstanding Amount" (API field), not schedule-table-derived totals.
   */
  getTotalOutstandingAmountDue(): number {
    const d = this.outstandingData;
    if (!d) return 0;
    const raw = d.totalOutstandingAmount ?? d.totalOutstanding;
    const n = Number(raw);
    return !isNaN(n) && n >= 0 ? n : 0;
  }

  /** Amount Due card: net after rebate when rebate applies, else gross total outstanding. */
  getDisplayAmountDue(): number {
    if (this.paymentForm?.get('applyRebate')?.value && this.getRebateAmountNumber() > 0) {
      return this.getNetAmountDue();
    }
    return this.getTotalOutstandingAmountDue();
  }

  /** Schedule row suggestion (from repayment schedule step / outstanding payload). */
  getScheduleSuggestedRebate(): number {
    const v = this.outstandingData?.scheduleSuggestedRebateAmount;
    if (v == null || v === '') return 0;
    const n = Number(v);
    return !isNaN(n) && n > 0 ? n : 0;
  }

  getScheduleSuggestedRebateDueDate(): string | null {
    return this.outstandingData?.scheduleSuggestedRebateDueDate || null;
  }

  getWaiverInterestDueDateForApi(): string | null {
    const fromSchedule = this.getScheduleSuggestedRebateDueDate();
    if (fromSchedule) return String(fromSchedule).trim() || null;
    const raw = this.outstandingData?.waiverInterestDueDate;
    if (raw == null || raw === '') return null;
    return String(raw).trim() || null;
  }

  isScheduleRebateReadonly(): boolean {
    return (
      !!this.paymentForm?.get('applyRebate')?.value &&
      this.getScheduleSuggestedRebate() > 0
    );
  }

  private syncRebateFromScheduleIfNeeded(): void {
    if (!this.paymentForm?.get('applyRebate')?.value || this.getScheduleSuggestedRebate() <= 0) {
      return;
    }
    this.paymentForm.patchValue({ rebateAmount: this.getScheduleSuggestedRebate() }, { emitEvent: false });
  }

  /**
   * When rebate applies, payment amount = net due after discount (same idea as loan-payment wizard).
   */
  private syncPaymentAmountToNetAfterRebate(): void {
    if (!this.paymentForm?.get('applyRebate')?.value) return;
    const payCtrl = this.paymentForm.get('paymentAmount');
    if (!payCtrl) return;
    const gross = this.getTotalOutstandingAmountDue();
    let net = this.getNetAmountDue();
    if (net > gross) net = gross;
    const rounded = Math.round(Math.max(0, net) * 100) / 100;
    payCtrl.setValue(rounded, { emitEvent: false });
    payCtrl.updateValueAndValidity({ emitEvent: false });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['outstandingData'] && this.paymentForm) {
      this.syncRebateFromScheduleIfNeeded();
      this.updateRebateValidators();
      this.syncPaymentAmountToNetAfterRebate();
    }
  }

  private updatePaymentAmountValidators(): void {
    const paymentAmount = this.paymentForm?.get('paymentAmount');
    if (!paymentAmount) return;
    const apply = !!this.paymentForm.get('applyRebate')?.value;

    if (apply) {
      const gross = this.getTotalOutstandingAmountDue();
      paymentAmount.setValidators([
        Validators.required,
        (c: AbstractControl): ValidationErrors | null => {
          const v = Number(c.value) || 0;
          const net = this.getNetAmountDue();
          if (v > gross + 0.01) return { maxAmount: true };
          if (Math.abs(v - net) > 0.02) return { mustMatchNet: true };
          return null;
        }
      ]);
    } else {
      paymentAmount.setValidators([Validators.required, Validators.min(1)]);
    }
    paymentAmount.updateValueAndValidity({ emitEvent: false });
  }

  /**
   * Initialize the payment form
   */
  initForm(): void {
    const totalAmount = this.getTotalOutstandingAmountDue();

    this.paymentForm = this.fb.group({
      paymentMode: ['', Validators.required],
      paymentAmount: [totalAmount, [Validators.required, Validators.min(1)]],
      transactionReference: [''],
      bankName: [''],
      chequeNumber: [''],
      chequeDate: [''],
      upiId: [''],
      remarks: [''],
      paymentDate: [new Date().toISOString().split('T')[0], Validators.required],
      applyRebate: [false],
      rebateAmount: [null as number | null],
      rebateReason: ['']
    });

    this.paymentForm.get('paymentMode')?.valueChanges.subscribe(mode => {
      this.updateValidators(mode);
    });

    this.paymentForm.get('applyRebate')?.valueChanges.subscribe((checked) => {
      if (checked) {
        const sug = this.getScheduleSuggestedRebate();
        if (sug > 0) {
          this.paymentForm.patchValue({ rebateAmount: sug }, { emitEvent: false });
        }
      } else {
        this.paymentForm.patchValue({ rebateAmount: null, rebateReason: '' }, { emitEvent: false });
        this.paymentForm
          .get('paymentAmount')
          ?.setValue(this.getTotalOutstandingAmountDue(), { emitEvent: false });
      }
      this.updateRebateValidators();
      this.syncPaymentAmountToNetAfterRebate();
    });

    this.paymentForm.get('rebateAmount')?.valueChanges.subscribe(() => {
      if (this.paymentForm.get('applyRebate')?.value) {
        this.syncPaymentAmountToNetAfterRebate();
        this.updatePaymentAmountValidators();
      }
    });

    this.paymentForm.get('paymentAmount')?.valueChanges.subscribe(() => {
      if (this.paymentForm.get('applyRebate')?.value) {
        this.paymentForm.get('rebateAmount')?.updateValueAndValidity({ emitEvent: false });
      }
    });

    this.updateRebateValidators();
  }

  /** Amount customer must pay after rebate (net due for closure). */
  getNetAmountDue(): number {
    const base = this.getTotalOutstandingAmountDue();
    if (!this.paymentForm.get('applyRebate')?.value) {
      return base;
    }
    const rebate = Number(this.paymentForm.get('rebateAmount')?.value) || 0;
    return Math.max(0, base - rebate);
  }

  private updateRebateValidators(): void {
    const apply = !!this.paymentForm.get('applyRebate')?.value;
    const rebateAmountCtrl = this.paymentForm.get('rebateAmount');
    const rebateReasonCtrl = this.paymentForm.get('rebateReason');
    if (!rebateAmountCtrl || !rebateReasonCtrl) return;

    if (apply) {
      rebateAmountCtrl.setValidators([
        Validators.required,
        Validators.min(0.01),
        (c: AbstractControl): ValidationErrors | null => {
          const max = this.getTotalOutstandingAmountDue();
          const v = Number(c.value);
          if (max > 0 && v > max) return { rebateTooHigh: true };
          return null;
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

  /**
   * Load existing payment details from GET API
   */
  loadExistingPayment(): void {
    if (!this.customerId || !this.loanAccountNumber) return;

    this.personalService.getRepaymentDetails(this.customerId, this.loanAccountNumber).subscribe({
      next: (res: any) => {
        if (res?.data) {
          this.savedData = res.data;
          this.patchFormWithSavedData(res.data);
          this.markAsSaved();
        }
      },
      error: () => {
        // No existing data - form stays editable
        // Check localStorage for previously saved state
        if (this.isSaved) {
          // Was saved in this session but GET may have failed
          // Keep saved state from localStorage
        }
      }
    });
  }

  /**
   * Patch form with saved data from API
   */
  patchFormWithSavedData(data: any): void {
    const applyRebate = !!(data.applyRebate ?? (Number(data.rebateAmount) > 0));
    this.paymentForm.patchValue({
      paymentMode: data.paymentMode || '',
      paymentAmount: data.repaymentAmount || 0,
      paymentDate: data.paymentDate || new Date().toISOString().split('T')[0],
      applyRebate,
      rebateAmount: data.rebateAmount != null ? Number(data.rebateAmount) : null,
      rebateReason: data.rebateReason || ''
    });
    this.savedData = data;
    this.updateRebateValidators();
    this.syncPaymentAmountToNetAfterRebate();
  }

  /**
   * Update form validators based on payment mode
   */
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

  /**
   * Get payment mode label
   */
  getPaymentModeLabel(): string {
    const mode = this.paymentModes.find(m => m.value === this.paymentForm.get('paymentMode')?.value);
    return mode?.label || this.savedData?.paymentMode || '';
  }

  /**
   * Process enabled when amount rules satisfied (net due when rebate, else at least total outstanding).
   */
  isAmountMatching(): boolean {
    const paymentAmount = Number(this.paymentForm.get('paymentAmount')?.value) || 0;
    if (!this.paymentForm.get('applyRebate')?.value) {
      return paymentAmount >= this.getTotalOutstandingAmountDue();
    }
    return Math.abs(paymentAmount - this.getNetAmountDue()) < 0.02;
  }

  /**
   * Get difference amount (payment vs net due after rebate)
   */
  getDifferenceAmount(): number {
    const paymentAmount = Number(this.paymentForm.get('paymentAmount')?.value) || 0;
    return paymentAmount - this.getNetAmountDue();
  }

  getRebateAmountNumber(): number {
    if (!this.paymentForm.get('applyRebate')?.value) return 0;
    return Number(this.paymentForm.get('rebateAmount')?.value) || 0;
  }

  /**
   * Process payment - call POST API
   */
  processPayment(): void {
    if (this.isSaved) return;

    if (this.paymentForm.invalid) {
      Object.keys(this.paymentForm.controls).forEach(key => {
        this.paymentForm.get(key)?.markAsTouched();
      });
      this.toastService.showWarning('Please fill all required fields.');
      return;
    }

    if (!this.isAmountMatching()) {
      this.toastService.showWarning(
        this.paymentForm.get('applyRebate')?.value
          ? 'Payment amount must be equal to or greater than the net amount due (after rebate).'
          : 'Payment amount must be equal to or greater than the outstanding amount.'
      );
      return;
    }

    const applyRebate = !!this.paymentForm.get('applyRebate')?.value;
    const rebateAmount = applyRebate ? Number(this.paymentForm.get('rebateAmount')?.value) || 0 : null;
    const rebateReason = applyRebate ? (this.paymentForm.get('rebateReason')?.value || '').trim() : null;
    const waiverDue = applyRebate ? this.getWaiverInterestDueDateForApi() : null;
    const waiverFlag: 'Yes' | 'No' = applyRebate ? 'Yes' : 'No';

    if (applyRebate && (!rebateReason || rebateReason.length < 5)) {
      this.toastService.showWarning('Please enter a rebate reason (at least 5 characters).');
      return;
    }
    if (applyRebate && (!rebateAmount || rebateAmount <= 0)) {
      this.toastService.showWarning('Please enter a valid rebate amount.');
      return;
    }

    this.isLoading = true;

    const payload = {
      customerId: this.customerId,
      loanAccountNumber: this.loanAccountNumber,
      repaymentAmount: Number(this.paymentForm.get('paymentAmount')?.value),
      paymentMode: this.paymentForm.get('paymentMode')?.value,
      paymentType: 'Total Repayment',
      paymentStatus: 'SUCCESS',
      rebateAmount: applyRebate ? rebateAmount : null,
      rebateReason: applyRebate ? rebateReason : null,
      waiverFlag,
      discountAmount: applyRebate ? rebateAmount : null,
      waiverInterestDueDate: waiverDue
    };

    this.personalService.saveRepaymentDetails(payload).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.savedData = { ...payload, ...(res?.data && typeof res.data === 'object' ? res.data : {}) };
        this.markAsSaved();
        this.persistSavedState();
        this.paymentCompleted.emit(this.savedData);
        this.toastService.showSuccess('Payment processed successfully!');
      },
      error: (err: any) => {
        this.isLoading = false;
        const errorMsg = err?.error?.message || 'Failed to process payment. Please try again.';
        this.toastService.showError(errorMsg);
      }
    });
  }

  /**
   * Mark as saved - set flags and emit events
   */
  private markAsSaved(): void {
    this.isSaved = true;
    this.isPaymentProcessed = true;
    this.stepCompleted.emit();
  }

  /**
   * Persist saved state to localStorage
   */
  private persistSavedState(): void {
    if (this.customerId && this.loanAccountNumber) {
      localStorage.setItem(this.savedStateKey, 'true');
    }
  }

  /**
   * Restore saved state from localStorage
   */
  private restoreSavedState(): void {
    if (this.customerId && this.loanAccountNumber) {
      const saved = localStorage.getItem(this.savedStateKey);
      if (saved === 'true') {
        this.isSaved = true;
        this.isPaymentProcessed = true;
      }
    }
  }

  /**
   * Validate step before navigation
   */
  validateStep(): boolean {
    if (this.isSaved) return true;
    if (!this.isPaymentProcessed) {
      this.toastService.showWarning('Please process the payment before proceeding.');
      return false;
    }
    return true;
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  }

  /**
   * Check if a field is invalid
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.paymentForm.get(fieldName);
    return field ? field.invalid && field.touched : false;
  }

  formatScheduleDueShort(): string {
    const d = this.getScheduleSuggestedRebateDueDate();
    if (!d) return '';
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '';
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
