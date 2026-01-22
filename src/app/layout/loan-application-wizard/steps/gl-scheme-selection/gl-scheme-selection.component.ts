import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-gl-scheme-selection',
  templateUrl: './gl-scheme-selection.component.html',
  styleUrls: ['./gl-scheme-selection.component.css']
})
export class GlSchemeSelectionComponent implements OnInit, OnChanges {
  @Input() customerId!: string;
  @Input() loanApplicationId!: string;
  @Output() stepCompleted = new EventEmitter<void>();

  form!: FormGroup;
  isEditMode = false;
  isDataAvailable = false;
  formLoaded = false;
  isLoading = false;
  isSaving = false;
  isUpdating = false;
  loanAccountNumber: string | null = null;
  schemeData: any = null; // Store the full response data
  repaymentSchedules: any[] = []; // Store repayment schedules array
  loanAmount: number | null = null;
  processingFees: number | null = null;
  displayedColumns: string[] = [
    'installmentNumber',
    'dueDate',
    'openingPrincipal',
    'numberOfDays',
    'interestAfterRebate',
    'rebateInterest',
    'dailyInterestAfterRebate',
    'dailyRebateInterest'
  ];

  tenureOptions = [
    '1 YEAR'
  ];

  repaymentFrequencyOptions = [
    '1 MONTH',
    // '2 MONTH',
    // '3 MONTH'
  ];

  schemeNameOptions = [
    'DP01',
    'DP02',
    'DP03',
    'DP04',
    'DP05'
  ];

  constructor(
    private fb: FormBuilder,
    private personalService: PersonalDetailsService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadStoredLoanAccountNumber();
    if (this.customerId) {
      this.loadSchemeDetails();
    } else if (this.loanApplicationId) {
      this.loanAccountNumber = this.loanApplicationId;
      this.loadSchemeDetails();
    } else {
      this.isEditMode = true;
      this.formLoaded = true;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['customerId'] && changes['customerId'].currentValue && !changes['customerId'].firstChange) {
      this.loadStoredLoanAccountNumber();
      this.loadSchemeDetails();
    } else if (changes['loanApplicationId'] && changes['loanApplicationId'].currentValue && !this.customerId) {
      this.loanAccountNumber = this.loanApplicationId;
      this.loadSchemeDetails();
    }
  }

  /**
   * Load loanAccountNumber from localStorage using customerId as key
   */
  loadStoredLoanAccountNumber(): void {
    if (this.customerId) {
      const stored = localStorage.getItem(`loanAccountNumber_${this.customerId}`);
      if (stored) {
        this.loanAccountNumber = stored;
      }
    }
    // Fallback to loanApplicationId if it's a valid loan account number
    if (!this.loanAccountNumber && this.loanApplicationId && 
        (this.loanApplicationId.startsWith('AP') || this.loanApplicationId.startsWith('GL'))) {
      this.loanAccountNumber = this.loanApplicationId;
    }
  }

  /**
   * Get the loan account number to use for API calls
   */
  getLoanAccountNumber(): string | null {
    return this.loanAccountNumber || this.loanApplicationId || null;
  }

  initForm(): void {
    this.form = this.fb.group({
      tenure: ['', Validators.required],
      repaymentFrequency: ['', Validators.required],
      schemeName: ['', Validators.required],
      loanPurpose: ['', Validators.required]
    });
  }

  loadSchemeDetails(): void {
    if (!this.customerId) {
      this.isEditMode = true;
      this.formLoaded = true;
      return;
    }

    const accountNumber = this.getLoanAccountNumber();
    if (!accountNumber) {
      this.isEditMode = true;
      this.formLoaded = true;
      return;
    }

    this.isLoading = true;
    this.personalService.getSchemeSelectionDetails(this.customerId, accountNumber).pipe(
      catchError((err: any) => {
        // If no data exists, that's okay - enable edit mode
        return of({ data: null });
      })
    ).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.formLoaded = true;
        
        if (res?.data) {
          // Store the goldLoanSchemeCalculation data
          this.schemeData = res.data.goldLoanSchemeCalculation || res.data;
          // Store repayment schedules array
          this.repaymentSchedules = res.data.repaymentSchedules || [];
          this.isDataAvailable = true;
          this.isEditMode = false;
          
          // Populate form with existing data from goldLoanSchemeCalculation
          const calculationData = res.data.goldLoanSchemeCalculation || res.data;
          this.form.patchValue({
            tenure: calculationData.tenureMonths || calculationData.tenure || '',
            repaymentFrequency: calculationData.repaymentFrequency || '',
            schemeName: calculationData.schemeName || '',
            loanPurpose: calculationData.endUse || calculationData.loanPurpose || ''
          });
          
          this.form.disable();
          this.stepCompleted.emit();
        } else {
          // No existing data, enable edit mode
          this.isEditMode = true;
          this.isDataAvailable = false;
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.formLoaded = true;
        this.isEditMode = true;
        this.isDataAvailable = false;
      }
    });
  }

  onSubmit(): void {
    if (!this.form.valid) {
      this.toastService.showWarning('Please fill all required fields correctly.');
      return;
    }

    if (!this.customerId) {
      this.toastService.showError('Customer ID is required.');
      return;
    }

    const accountNumber = this.getLoanAccountNumber();
    if (!accountNumber) {
      this.toastService.showError('Loan Account Number is required.');
      return;
    }

    const payload = {
      tenure: this.form.value.tenure,
      repaymentFrequency: this.form.value.repaymentFrequency,
      schemeName: this.form.value.schemeName,
      loanPurpose: this.form.value.loanPurpose
    };

    this.isSaving = true;
    this.personalService.saveGoldLoanSchemeSelection(this.customerId, accountNumber, payload).subscribe({
      next: (res: any) => {
        this.isSaving = false;
        this.toastService.showSuccess('GL Scheme selection saved successfully!');
        // Reload the data after saving to get the complete response with repayment schedules
        this.loadSchemeDetails();
      },
      error: (err: any) => {
        this.isSaving = false;
        const errorMsg = err?.error?.message || 'Failed to save GL scheme selection. Please try again.';
        this.toastService.showError(errorMsg);
      }
    });
  }

  onCancel(): void {
    if (this.isDataAvailable && this.schemeData) {
      this.isEditMode = false;
      // Reload the data
      this.loadSchemeDetails();
    } else {
      this.form.reset();
      this.isEditMode = false;
    }
  }

  formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(value);
  }

  formatNumber(value: number | null | undefined, decimals: number = 2): string {
    if (value === null || value === undefined) return '0';
    return value.toFixed(decimals);
  }

  formatPercent(value: number | null | undefined, decimals: number = 2): string {
    if (value === null || value === undefined) return '0%';
    return `${value.toFixed(decimals)}%`;
  }

  onUpdateLoanAmount(): void {
    if (!this.loanAmount || this.loanAmount <= 0) {
      this.toastService.showWarning('Please enter a valid loan amount.');
      return;
    }

    if (!this.customerId) {
      this.toastService.showError('Customer ID is required.');
      return;
    }

    const accountNumber = this.getLoanAccountNumber();
    if (!accountNumber) {
      this.toastService.showError('Loan Account Number is required.');
      return;
    }

    this.isUpdating = true;
    this.personalService.updateGlSchemeSelection(
      this.customerId, 
      accountNumber, 
      this.loanAmount!,
      undefined,
      this.processingFees || undefined
    ).subscribe({
      next: (res: any) => {
        this.isUpdating = false;
        this.toastService.showSuccess('GL Scheme updated successfully!');
        // Reload the data after updating to get the updated response
        this.loadSchemeDetails();
        this.loanAmount = null;
        this.processingFees = null;
      },
      error: (err: any) => {
        this.isUpdating = false;
        const errorMsg = err?.error?.message || 'Failed to update GL scheme. Please try again.';
        this.toastService.showError(errorMsg);
      }
    });
  }

  validateStep(): boolean {
    // Loan amount and processing fee are required
    if (!this.isDataAvailable) {
      this.toastService.showWarning('Please save the GL scheme selection first.');
      return false;
    }
    
    // Check if loan amount and processing fee exist in the scheme data
    const schemeData = this.schemeData?.goldLoanSchemeCalculation || this.schemeData;
    if (!schemeData) {
      this.toastService.showWarning('Please complete the GL scheme selection.');
      return false;
    }
    
    if (!schemeData.loanAmount || schemeData.loanAmount <= 0) {
      this.toastService.showWarning('Loan amount is required. Please update the loan amount.');
      return false;
    }
    
    if (!schemeData.processingFees || schemeData.processingFees <= 0) {
      this.toastService.showWarning('Processing fee is required. Please update the processing fee.');
      return false;
    }
    
    return true;
  }
}
