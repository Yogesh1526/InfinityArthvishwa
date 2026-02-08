import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-payment-details',
  templateUrl: './payment-details.component.html',
  styleUrls: ['./payment-details.component.css']
})
export class PaymentDetailsComponent implements OnInit {
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
   * Initialize the payment form
   */
  initForm(): void {
    const totalAmount = this.outstandingData?.totalOutstanding || 0;

    this.paymentForm = this.fb.group({
      paymentMode: ['', Validators.required],
      paymentAmount: [totalAmount, [Validators.required, Validators.min(1)]],
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
    this.paymentForm.patchValue({
      paymentMode: data.paymentMode || '',
      paymentAmount: data.repaymentAmount || 0,
      paymentDate: data.paymentDate || new Date().toISOString().split('T')[0]
    });
    this.savedData = data;
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
   * Check if payment amount matches outstanding
   */
  isAmountMatching(): boolean {
    const paymentAmount = this.paymentForm.get('paymentAmount')?.value || 0;
    const outstanding = this.outstandingData?.totalOutstanding || 0;
    return paymentAmount >= outstanding;
  }

  /**
   * Get difference amount
   */
  getDifferenceAmount(): number {
    const paymentAmount = this.paymentForm.get('paymentAmount')?.value || 0;
    const outstanding = this.outstandingData?.totalOutstanding || 0;
    return paymentAmount - outstanding;
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
      this.toastService.showWarning('Payment amount must be equal to or greater than the outstanding amount.');
      return;
    }

    this.isLoading = true;

    // Build payload matching the API format
    const payload = {
      customerId: this.customerId,
      loanAccountNumber: this.loanAccountNumber,
      repaymentAmount: this.paymentForm.get('paymentAmount')?.value,
      paymentMode: this.paymentForm.get('paymentMode')?.value,
      paymentType: 'Total Repayment',
      paymentStatus: 'SUCCESS'
    };

    this.personalService.saveRepaymentDetails(payload).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.savedData = res?.data || payload;
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
}
