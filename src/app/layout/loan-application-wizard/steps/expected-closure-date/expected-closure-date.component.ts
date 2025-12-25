import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-expected-closure-date',
  templateUrl: './expected-closure-date.component.html',
  styleUrls: ['./expected-closure-date.component.css']
})
export class ExpectedClosureDateComponent implements OnInit {
  @Input() customerId!: string;
  @Input() loanApplicationId!: string;
  @Output() stepCompleted = new EventEmitter<void>();

  form!: FormGroup;
  isEditMode = false;
  isDataAvailable = false;
  formLoaded = false;
  closureDetailsId: number | null = null;
  loanAccountNumber: string | null = null;
  isLoading = false;
  isSaving = false;

  closureReasonOptions = [
    'Loan Repayment',
    'Loan Closure',
    'Customer Request',
    'Default',
    'Other'
  ];

  constructor(
    private fb: FormBuilder,
    private closureService: PersonalDetailsService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadStoredLoanAccountNumber();
    this.initForm();
    if (this.customerId && this.getLoanAccountNumber()) {
      this.loadClosureDetails();
    } else {
      this.isEditMode = true;
      this.formLoaded = true;
    }
  }

  loadStoredLoanAccountNumber(): void {
    if (this.customerId) {
      const stored = localStorage.getItem(`loanAccountNumber_${this.customerId}`);
      if (stored) {
        this.loanAccountNumber = stored;
      }
    }
    if (!this.loanAccountNumber && this.loanApplicationId &&
        (this.loanApplicationId.startsWith('AP') || this.loanApplicationId.startsWith('GL'))) {
      this.loanAccountNumber = this.loanApplicationId;
    }
  }

  getLoanAccountNumber(): string | null {
    return this.loanAccountNumber || this.loanApplicationId || null;
  }

  initForm(): void {
    this.form = this.fb.group({
      closureReason: ['', Validators.required],
      closureDate: ['', Validators.required]
    });
  }

  loadClosureDetails(): void {
    if (!this.customerId || !this.getLoanAccountNumber()) {
      this.isEditMode = true;
      this.formLoaded = true;
      return;
    }

    this.isLoading = true;
    // Assuming API endpoint exists - adjust as needed
    // this.closureService.getClosureDetails(this.customerId, this.getLoanAccountNumber()!).pipe(
    //   catchError(err => of({ data: null }))
    // ).subscribe({
    //   next: (res: any) => {
    //     this.isLoading = false;
    //     if (res?.data) {
    //       const data = res.data;
    //       this.closureDetailsId = data.id || null;
    //       this.isDataAvailable = true;
    //       this.isEditMode = false;
    //       this.form.patchValue({
    //         closureReason: data.closureReason || '',
    //         closureDate: data.closureDate ? new Date(data.closureDate) : ''
    //       });
    //       this.form.disable();
    //     } else {
    //       this.isEditMode = true;
    //     }
    //     this.formLoaded = true;
    //   },
    //   error: (err: any) => {
    //     this.isLoading = false;
    //     this.isEditMode = true;
    //     this.formLoaded = true;
    //   }
    // });
    
    // For now, just set form loaded
    this.isLoading = false;
    this.isEditMode = true;
    this.formLoaded = true;
  }

  onEdit(): void {
    this.isEditMode = true;
    this.form.enable();
  }

  onSubmit(): void {
    if (!this.form.valid) {
      this.toastService.showWarning('Please fill all required fields correctly.');
      return;
    }

    if (!this.customerId || !this.getLoanAccountNumber()) {
      this.toastService.showError('Customer ID and Loan Account Number are required.');
      return;
    }

    const payload = {
      closureReason: this.form.value.closureReason,
      closureDate: this.form.value.closureDate
    };

    // Format date if it's a Date object
    if (payload.closureDate instanceof Date) {
      payload.closureDate = payload.closureDate.toISOString().split('T')[0];
    }

    this.isSaving = true;
    // Assuming API endpoint exists - adjust as needed
    // this.closureService.saveClosureDetails(
    //   this.customerId,
    //   this.getLoanAccountNumber()!,
    //   payload
    // ).subscribe({
    //   next: (res: any) => {
    //     this.isSaving = false;
    //     this.toastService.showSuccess('Closure details saved successfully!');
    //     this.closureDetailsId = res?.data?.id || null;
    //     this.isEditMode = false;
    //     this.isDataAvailable = true;
    //     this.stepCompleted.emit();
    //     this.loadClosureDetails();
    //   },
    //   error: (err: any) => {
    //     this.isSaving = false;
    //     const errorMsg = err?.error?.message || 'Failed to save closure details. Please try again.';
    //     this.toastService.showError(errorMsg);
    //   }
    // });

    // Temporary success message
    this.isSaving = false;
    this.toastService.showSuccess('Closure details saved successfully!');
    this.isEditMode = false;
    this.isDataAvailable = true;
    this.stepCompleted.emit();
  }

  onCancel(): void {
    if (this.isDataAvailable) {
      this.isEditMode = false;
      this.loadClosureDetails();
    } else {
      this.form.reset();
      this.isEditMode = false;
    }
  }
}

