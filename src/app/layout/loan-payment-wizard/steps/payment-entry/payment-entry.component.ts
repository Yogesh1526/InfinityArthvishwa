import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';

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
    if ((changes['paymentType'] || changes['outstandingData']) && this.paymentForm) {
      this.updateAmountDefaults();
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
      paymentDate: [new Date().toISOString().split('T')[0], Validators.required]
    });

    this.paymentForm.get('paymentMode')?.valueChanges.subscribe(mode => {
      this.updateValidators(mode);
    });

    this.updateValidators('');
    this.updateAmountDefaults();
  }

  private updateAmountDefaults(): void {
    const paymentAmount = this.paymentForm.get('paymentAmount');
    if (!paymentAmount) return;

    const defaultAmount =
      this.paymentType === 'INTEREST_PAYMENT' ? this.getAccruedInterest() : paymentAmount.value;

    const validators = [Validators.required, Validators.min(this.getMinimumAmount())];
    paymentAmount.setValidators(validators);
    paymentAmount.updateValueAndValidity({ emitEvent: false });

    if (this.paymentType === 'INTEREST_PAYMENT') {
      paymentAmount.setValue(defaultAmount, { emitEvent: false });
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

  private getAccruedInterest(): number {
    return this.outstandingData?.accruedInterest || 0;
  }

  private getMinimumAmount(): number {
    if (this.paymentType === 'INTEREST_PAYMENT') {
      const interest = this.getAccruedInterest();
      return interest > 0 ? interest : 1;
    }
    return 1;
  }

  /** Get maximum payable amount */
  getMaxAmount(): number {
    if (this.paymentType === 'INTEREST_PAYMENT') {
      return this.getAccruedInterest() + this.getPrincipalOutstanding();
    }
    return this.getPrincipalOutstanding();
  }

  /** Check if entered amount is valid */
  isAmountValid(): boolean {
    const amount = this.paymentForm.get('paymentAmount')?.value || 0;
    const min = this.getMinimumAmount();

    if (this.paymentType === 'INTEREST_PAYMENT') {
      return amount >= min && amount <= this.getMaxAmount();
    }
    return amount >= min && amount <= this.getMaxAmount();
  }

  getAmountInfo(): { label: string; amount: number; type: string } {
    const amount = this.paymentForm.get('paymentAmount')?.value || 0;
    const maxAmount = this.getMaxAmount();

    if (this.paymentType === 'INTEREST_PAYMENT') {
      const interestDue = this.getAccruedInterest();
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
      const interestPortion = Math.min(amount, this.getAccruedInterest());
      const principalPortion = Math.max(amount - interestPortion, 0);
      return { interestPortion, principalPortion };
    }
    return { interestPortion: 0, principalPortion: Math.min(amount, this.getPrincipalOutstanding()) };
  }

  getQuickAmountOptions(): { label: string; amount: number; description: string }[] {
    const principal = this.getPrincipalOutstanding();
    const interest = this.getAccruedInterest();
    if (this.paymentType === 'INTEREST_PAYMENT') {
      return [
        { label: 'Interest Due', amount: interest, description: 'Clears accrued interest' },
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
      const interestCovered = amount >= this.getAccruedInterest();
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
      if (this.paymentType === 'INTEREST_PAYMENT') {
        this.toastService.showWarning('Interest payment cannot exceed the outstanding (interest + principal) cap.');
      } else {
        this.toastService.showWarning('Part payment amount cannot exceed the principal outstanding.');
      }
      return;
    }

    this.isLoading = true;

    const paymentTypeLabel = this.paymentType === 'PART_PAYMENT' ? 'Part Payment' : 'Interest Payment';
    const paymentDateRaw = this.paymentForm.get('paymentDate')?.value;
    const paymentDateTime = typeof paymentDateRaw === 'string' && paymentDateRaw.includes('T')
      ? paymentDateRaw
      : `${paymentDateRaw}T00:00:00`;

    const apiPayload = {
      loanAccountNumber: this.loanAccountNumber,
      customerId: this.customerId,
      paymentAmount: Number(this.paymentForm.get('paymentAmount')?.value),
      paymentType: this.paymentType as 'PART_PAYMENT' | 'INTEREST_PAYMENT',
      paymentDate: paymentDateTime
    };

    const split = this.getInterestSplit();
    this.personalService.payPartPaymentAndInterestAmount(apiPayload).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.isPaymentProcessed = true;
        const result = {
          ...(res?.data || apiPayload),
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

  isFieldInvalid(fieldName: string): boolean {
    const field = this.paymentForm.get(fieldName);
    return field ? field.invalid && field.touched : false;
  }
}
