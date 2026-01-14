import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-cash-split',
  templateUrl: './cash-split.component.html',
  styleUrls: ['./cash-split.component.css']
})
export class CashSplitComponent implements OnInit {
  @Input() customerId!: string;
  @Input() loanApplicationId!: string;
  @Input() customerName: string = 'N/A';
  @Output() stepCompleted = new EventEmitter<void>();

  form!: FormGroup;
  isSaving = false;
  isLoading = false;
  isEditMode = false;
  isDataAvailable = false;
  formLoaded = false;
  loanAccountNumber: string | null = null;
  disbursedAmount: number = 0;
  requiredAmount: number = 0;
  existingCashSplits: any[] = []; // Store original data to track deletions
  cashSplitData: any[] = []; // Store loaded data for view mode

  paymentModeOptions = ['Cash', 'Bank Transfer'];

  // Payment mode mapping: UI -> API
  private paymentModeMap: { [key: string]: string } = {
    'Cash': 'CASH',
    'Bank Transfer': 'BANK_TRANSFER'
  };

  // Payment mode mapping: API -> UI
  reversePaymentModeMap: { [key: string]: string } = {
    'CASH': 'Cash',
    'BANK_TRANSFER': 'Bank Transfer'
  };

  constructor(
    private fb: FormBuilder,
    private personalService: PersonalDetailsService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadLoanAccountNumber();
    this.initForm();
    this.loadDisbursementAmount();
    this.loadCashSplitData();
  }

  initForm(): void {
    this.form = this.fb.group({
      cashSplits: this.fb.array([])
    });
    
    // Add custom validator for duplicate payment modes
    this.form.valueChanges.subscribe(() => {
      this.validateDuplicatePaymentModes();
    });
  }

  validateDuplicatePaymentModes(): void {
    const paymentModes = this.cashSplits.controls
      .map(control => control.get('paymentMode')?.value)
      .filter(mode => mode && mode !== '');
    
    const uniqueModes = new Set(paymentModes);
    
    // Mark each control with duplicate error if needed
    this.cashSplits.controls.forEach((control, index) => {
      const mode = control.get('paymentMode')?.value;
      if (mode && paymentModes.filter(m => m === mode).length > 1) {
        control.get('paymentMode')?.setErrors({ duplicate: true });
      } else if (control.get('paymentMode')?.hasError('duplicate')) {
        const errors = control.get('paymentMode')?.errors;
        if (errors) {
          delete errors['duplicate'];
          const hasOtherErrors = Object.keys(errors).length > 0;
          control.get('paymentMode')?.setErrors(hasOtherErrors ? errors : null);
        }
      }
    });
  }

  get cashSplits(): FormArray {
    return this.form.get('cashSplits') as FormArray;
  }

  loadLoanAccountNumber(): void {
    if (this.customerId) {
      const stored = localStorage.getItem(`loanAccountNumber_${this.customerId}`);
      if (stored) {
        this.loanAccountNumber = stored;
      }
    }
    if (!this.loanAccountNumber && this.loanApplicationId) {
      this.loanAccountNumber = this.loanApplicationId;
    }
  }

  loadDisbursementAmount(): void {
    if (!this.customerId || !this.loanAccountNumber) {
      return;
    }

    // Get disbursement amount from GL Scheme Selection
    this.personalService.getSchemeSelectionDetails(this.customerId, this.loanAccountNumber).subscribe({
      next: (response) => {
        const data = response?.data;
        if (data) {
          const schemeData = data.goldLoanSchemeCalculation || data;
          // Get disbursement amount - try multiple possible field names
          const disbursementAmt = schemeData.loanDisbusrsementAmount || 
                                  schemeData.loanDisbursementAmount ||
                                  schemeData.loanAmountNeedToBeDisbursed ||
                                  schemeData.disbursedAmount ||
                                  0;
          
          if (disbursementAmt > 0) {
            this.disbursedAmount = parseFloat(disbursementAmt);
            this.requiredAmount = parseFloat(disbursementAmt);
          }
        }
      },
      error: (error) => {
        console.log('Disbursement amount not available:', error);
      }
    });
  }

  addRow(): void {
    if (this.cashSplits.length >= 2) {
      this.toastService.showWarning('Maximum 2 payment modes allowed');
      return;
    }

    const row = this.fb.group({
      paymentMode: ['', Validators.required],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      referenceNo: [''],
      remarks: [''],
      isExisting: [false] // Track if this is existing data
    });
    this.cashSplits.push(row);
    
    row.get('paymentMode')?.valueChanges.subscribe(() => {
      this.validateDuplicatePaymentModes();
    });
    
    // Mark form as touched to trigger validation
    this.form.markAsTouched();
  }

  getAvailablePaymentModes(index: number): string[] {
    const selectedModes = this.cashSplits.controls
      .map((control, i) => i !== index ? control.get('paymentMode')?.value : null)
      .filter(mode => mode && mode !== '');
    return this.paymentModeOptions.filter(mode => !selectedModes.includes(mode));
  }

  removeRow(index: number): void {
    if (this.cashSplits.length > 0) {
      const control = this.cashSplits.at(index);
      const isExisting = control.get('isExisting')?.value;
      const paymentMode = control.get('paymentMode')?.value;
      const amount = control.get('amount')?.value;

      // If it's an existing row, delete from backend
      if (isExisting && paymentMode && amount && this.customerId && this.loanAccountNumber) {
        const apiPaymentMode = this.paymentModeMap[paymentMode] || paymentMode;
        this.personalService.deleteCashSplitDetails(
          this.customerId,
          this.loanAccountNumber,
          apiPaymentMode,
          parseFloat(amount)
        ).subscribe({
          next: () => {
            this.toastService.showSuccess('Payment mode deleted successfully');
            this.cashSplits.removeAt(index);
            // Update available options for remaining rows
            this.cashSplits.controls.forEach(ctrl => {
              ctrl.get('paymentMode')?.updateValueAndValidity({ emitEvent: false });
            });
            if (this.cashSplits.length === 0) {
              this.addRow();
            }
          },
          error: (error) => {
            const errorMessage = error?.error?.message || error?.message || 'Failed to delete payment mode';
            this.toastService.showError(errorMessage);
          }
        });
      } else {
        // Just remove from form if it's a new row
        this.cashSplits.removeAt(index);
        // Update available options for remaining rows
        this.cashSplits.controls.forEach(ctrl => {
          ctrl.get('paymentMode')?.updateValueAndValidity({ emitEvent: false });
        });
        if (this.cashSplits.length === 0) {
          this.addRow();
        }
      }
    }
  }

  loadCashSplitData(): void {
    if (!this.customerId || !this.loanAccountNumber) {
      this.isEditMode = true;
      this.formLoaded = true;
      if (this.cashSplits.length === 0) {
        this.addRow();
      }
      return;
    }

    this.isLoading = true;
    this.personalService.getAllCashSplitDetails(this.customerId, this.loanAccountNumber).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.formLoaded = true;
        const data = response?.data || response || [];
        
        // Clear existing rows
        while (this.cashSplits.length > 0) {
          this.cashSplits.removeAt(0);
        }

        if (Array.isArray(data) && data.length > 0) {
          // Store original data for tracking
          this.existingCashSplits = [...data];
          this.cashSplitData = [...data];
          this.isDataAvailable = true;
          this.isEditMode = false;
          
          // Load existing data into form (for view mode)
          data.forEach((item: any) => {
            const row = this.fb.group({
              paymentMode: [this.reversePaymentModeMap[item.paymentMode] || item.paymentMode || '', Validators.required],
              amount: [item.paymentAmount || '', [Validators.required, Validators.min(0.01)]],
              referenceNo: [item.referenceNumber || ''],
              remarks: [item.remark || ''],
              isExisting: [true] // Mark as existing data
            });
            this.cashSplits.push(row);
          });

          // Disable form in view mode
          this.form.disable();

          // Set total amount from first item
          if (data[0]?.totalAmount) {
            this.requiredAmount = parseFloat(data[0].totalAmount) || 0;
            this.disbursedAmount = parseFloat(data[0].totalAmount) || 0;
          }
        } else {
          // No data, enable edit mode
          this.isDataAvailable = false;
          this.isEditMode = true;
          if (this.cashSplits.length === 0) {
            this.addRow();
          }
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.formLoaded = true;
        this.isDataAvailable = false;
        this.isEditMode = true;
        if (this.cashSplits.length === 0) {
          this.addRow();
        }
        if (error.status !== 404) {
          this.toastService.showError('Failed to load cash split data');
        }
      }
    });
  }

  onEdit(): void {
    this.isEditMode = true;
    this.form.enable();
  }

  onCancel(): void {
    if (this.isDataAvailable) {
      this.isEditMode = false;
      this.loadCashSplitData(); // Reload to reset form
    }
  }

  onDeleteRow(index: number, item: any): void {
    if (!this.customerId || !this.loanAccountNumber) {
      return;
    }

    const apiPaymentMode = item.paymentMode || this.paymentModeMap[item.paymentMode] || item.paymentMode;
    const cashAmount = parseFloat(item.paymentAmount || item.amount || 0);

    this.personalService.deleteCashSplitDetails(
      this.customerId,
      this.loanAccountNumber,
      apiPaymentMode,
      cashAmount
    ).subscribe({
      next: () => {
        this.toastService.showSuccess('Payment mode deleted successfully');
        this.loadCashSplitData(); // Reload data
      },
      error: (error) => {
        const errorMessage = error?.error?.message || error?.message || 'Failed to delete payment mode';
        this.toastService.showError(errorMessage);
      }
    });
  }

  getTotal(): number {
    return this.cashSplits.controls.reduce((sum, control) => {
      const amount = parseFloat(control.get('amount')?.value || '0');
      return sum + amount;
    }, 0);
  }

  isValid(): boolean {
    if (this.cashSplits.length === 0) return false;
    
    // Check if all rows have required fields (payment mode and amount)
    const allRowsFilled = this.cashSplits.controls.every(control => {
      const mode = control.get('paymentMode')?.value;
      const amount = control.get('amount')?.value;
      return mode && amount && parseFloat(amount) > 0;
    });

    if (!allRowsFilled) return false;

    // Check for duplicate payment modes
    const paymentModes = this.cashSplits.controls
      .map(control => control.get('paymentMode')?.value)
      .filter(mode => mode && mode !== '');
    
    const uniqueModes = new Set(paymentModes);
    if (paymentModes.length !== uniqueModes.size) {
      return false; // Duplicate payment modes found
    }

    // If disbursement amount is set, validate total matches
    if (this.requiredAmount > 0) {
      const total = this.getTotal();
      // Allow small rounding differences (0.01)
      return Math.abs(total - this.requiredAmount) < 0.01;
    }

    // If no disbursement amount set, just check that rows are filled
    return true;
  }

  hasMinimumData(): boolean {
    // Check if at least one row has some data
    return this.cashSplits.length > 0 && this.cashSplits.controls.some(control => {
      const mode = control.get('paymentMode')?.value;
      const amount = control.get('amount')?.value;
      return mode || amount;
    });
  }

  onSubmit(): void {
    if (!this.isValid()) {
      // Check for duplicate payment modes
      const paymentModes = this.cashSplits.controls
        .map(control => control.get('paymentMode')?.value)
        .filter(mode => mode && mode !== '');
      const uniqueModes = new Set(paymentModes);
      
      if (paymentModes.length !== uniqueModes.size) {
        this.toastService.showError('Each payment mode can only be used once. Please select different payment modes.');
        return;
      }

      if (this.requiredAmount > 0) {
        const total = this.getTotal();
        const difference = Math.abs(total - this.requiredAmount);
        if (difference >= 0.01) {
          this.toastService.showError(
            `Total payment amount (${this.formatCurrency(total)}) must equal Disbursement Amount (${this.formatCurrency(this.requiredAmount)}). Difference: ${this.formatCurrency(difference)}`
          );
        } else {
          this.toastService.showWarning('Please fill all required fields');
        }
      } else {
        this.toastService.showWarning('Please fill all required fields');
      }
      return;
    }

    if (!this.customerId || !this.loanAccountNumber) {
      this.toastService.showError('Customer ID and Loan Account Number are required');
      return;
    }

    this.isSaving = true;
    const totalAmount = this.getTotal();

    // Build array payload - each row becomes one entry
    const payload = this.cashSplits.value.map((row: any) => ({
      customerId: this.customerId,
      loanAccountNumber: this.loanAccountNumber,
      paymentMode: this.paymentModeMap[row.paymentMode] || row.paymentMode,
      paymentAmount: parseFloat(row.amount),
      referenceNumber: row.referenceNo || '',
      remark: row.remarks || '',
      totalAmount: totalAmount
    }));

    // Determine if we should use PUT (update) or POST (create)
    const hasExistingData = this.existingCashSplits.length > 0;
    const apiCall = hasExistingData 
      ? this.personalService.updateCashSplitDetails(payload)
      : this.personalService.saveCashSplit(payload);

    apiCall.subscribe({
      next: (response) => {
        this.isSaving = false;
        this.toastService.showSuccess(hasExistingData ? 'Cash split updated successfully!' : 'Cash split saved successfully!');
        this.requiredAmount = totalAmount;
        this.disbursedAmount = totalAmount;
        this.isEditMode = false;
        this.loadCashSplitData(); // Reload to show in view mode
        this.stepCompleted.emit();
      },
      error: (error) => {
        this.isSaving = false;
        const errorMessage = error?.error?.message || error?.message || (hasExistingData ? 'Failed to update cash split' : 'Failed to save cash split');
        this.toastService.showError(errorMessage);
      }
    });
  }

  formatCurrency(amount: number): string {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  getDifference(): number {
    return this.requiredAmount - this.getTotal();
  }

  abs(value: number): number {
    return Math.abs(value);
  }
}

