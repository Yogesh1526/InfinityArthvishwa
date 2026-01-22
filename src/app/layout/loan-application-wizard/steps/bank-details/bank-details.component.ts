import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-bank-details',
  templateUrl: './bank-details.component.html',
  styleUrls: ['./bank-details.component.css']
})
export class BankDetailsComponent implements OnInit {
  @Input() customerId!: string;
  @Input() loanApplicationId!: string;
  @Output() stepCompleted = new EventEmitter<void>();

  form!: FormGroup;
  isEditMode = false;
  isDataAvailable = false;
  formLoaded = false;
  bankDetailsId: number | null = null;
  pennyDropStatus: 'pending' | 'success' | 'failed' | null = null;
  isRefreshing = false;
  existingBankData: any = null; // Store existing data for update

  accountTypeOptions = ['Savings Account', 'Current Account', 'Salary Account', 'Fixed Deposit'];
  accountPurposeOptions = ['Loan Disbursement', 'Repayment', 'Both'];

  constructor(
    private fb: FormBuilder,
    private bankService: PersonalDetailsService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initForm();
    if (this.customerId) {
      this.loadBankDetails();
    } else {
      this.isEditMode = true;
      this.formLoaded = true;
    }
  }

  initForm(): void {
    this.form = this.fb.group({
      bankName: ['', Validators.required],
      accountNumber: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
      accountHolderName: ['', Validators.required],
      accountType: ['', Validators.required],
      ifsc: ['', [Validators.required, Validators.pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)]],
      branch: [''],
      accountPurpose: ['', Validators.required],
      pennyDropVerificationStatus: ['Pending']
    });
  }

  loadBankDetails(): void {
    if (!this.customerId) {
      this.isEditMode = true;
      this.formLoaded = true;
      return;
    }

    this.bankService.getBankDetails(this.customerId).subscribe({
      next: (res: any) => {
        // Handle array response
        let data = null;
        if (res && res.data) {
          if (Array.isArray(res.data) && res.data.length > 0) {
            data = res.data[0]; // Get first bank detail
          } else if (!Array.isArray(res.data)) {
            data = res.data;
          }
        }

        if (data) {
          this.bankDetailsId = data.id;
          this.existingBankData = data; // Store for update
          this.isDataAvailable = true;
          this.isEditMode = false;
          
          // Load form data
          this.form.patchValue({
            bankName: data.bankName || '',
            accountNumber: data.accountNumber || '',
            accountHolderName: data.accountHolderName || '',
            accountType: data.accountType || '',
            ifsc: data.ifsc || '',
            branch: data.branch || '',
            accountPurpose: data.accountPurpose || 'Loan Disbursement',
            pennyDropVerificationStatus: data.pennyDropVerificationStatus || 'Pending'
          });

          // Load penny drop status and normalize it
          const rawStatus = data.pennyDropVerificationStatus || 'Pending';
          if (rawStatus === 'Verified' || rawStatus === 'success' || rawStatus === 'Success') {
            this.pennyDropStatus = 'success';
          } else if (rawStatus === 'Failed' || rawStatus === 'failed' || rawStatus === 'Fail') {
            this.pennyDropStatus = 'failed';
          } else {
            this.pennyDropStatus = 'pending';
          }
        } else {
          this.isEditMode = true;
          this.isDataAvailable = false;
          this.existingBankData = null;
        }
        this.formLoaded = true;
      },
      error: (err: any) => {
        // If 404 or no data, allow user to create new
        if (err.status === 404 || err.status === 0) {
          this.isEditMode = true;
          this.isDataAvailable = false;
        } else {
          const errorMsg = err?.error?.message || 'Failed to load bank details. Please try again.';
          this.toastService.showError(errorMsg);
        }
        this.formLoaded = true;
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
      this.loadBankDetails();
    } else {
      this.form.reset();
      this.isEditMode = false;
    }
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

    // Build payload according to API requirements
    const payload: any = {
      customerId: this.customerId,
      bankName: this.form.value.bankName,
      accountNumber: this.form.value.accountNumber,
      accountHolderName: this.form.value.accountHolderName,
      accountType: this.form.value.accountType,
      ifsc: this.form.value.ifsc,
      branch: this.form.value.branch || '',
      accountPurpose: this.form.value.accountPurpose,
      pennyDropVerificationStatus: this.form.value.pennyDropVerificationStatus || 'Pending'
    };

    // For update, include id and other fields from existing data
    if (this.bankDetailsId && this.existingBankData) {
      payload.id = this.bankDetailsId;
      payload.createdBy = this.existingBankData.createdBy || null;
      payload.createdDate = this.existingBankData.createdDate || null;
      payload.updatedBy = this.existingBankData.updatedBy || null;
      payload.updatedDate = this.existingBankData.updatedDate || null;
    }

    const request = this.bankDetailsId
      ? this.bankService.updateBankDetails(payload)
      : this.bankService.saveBankDetails(payload);

    request.subscribe({
      next: (res: any) => {
        this.toastService.showSuccess('Bank details saved successfully!');
        // Handle response
        if (res?.data) {
          this.bankDetailsId = res.data.id || this.bankDetailsId;
          this.existingBankData = res.data; // Store for future updates
          // Update penny drop status
          const rawStatus = res.data.pennyDropVerificationStatus || 'Pending';
          if (rawStatus === 'Verified' || rawStatus === 'success' || rawStatus === 'Success') {
            this.pennyDropStatus = 'success';
          } else if (rawStatus === 'Failed' || rawStatus === 'failed' || rawStatus === 'Fail') {
            this.pennyDropStatus = 'failed';
          } else {
            this.pennyDropStatus = 'pending';
          }
        }
        this.isEditMode = false;
        this.isDataAvailable = true;
        this.form.disable();
        this.stepCompleted.emit();
        // Reload to get updated data
        this.loadBankDetails();
      },
      error: (err: any) => {
        const errorMsg = err?.error?.message || 'Failed to save bank details. Please try again.';
        this.toastService.showError(errorMsg);
      }
    });
  }

  // refreshPennyDropStatus(): void {
  //   if (!this.loanApplicationId || !this.bankDetailsId) {
  //     return;
  //   }

  //   this.isRefreshing = true;
  //   this.bankService.refreshPennyDropStatus(this.loanApplicationId).subscribe({
  //     next: (res: any) => {
  //       // Handle both response formats and normalize status values
  //       let status: string = 'pending';
  //       if (res?.data) {
  //         if (Array.isArray(res.data) && res.data.length > 0) {
  //           status = res.data[0].pennyDropVerificationStatus || res.data[0].pennyDropStatus || 'pending';
  //         } else if (!Array.isArray(res.data)) {
  //           status = res.data.pennyDropVerificationStatus || res.data.pennyDropStatus || 'pending';
  //         }
  //       }
        
  //       // Normalize status to match the type definition
  //       let normalizedStatus: 'pending' | 'success' | 'failed' | null = 'pending';
  //       if (status === 'Verified' || status === 'success' || status === 'Success') {
  //         normalizedStatus = 'success';
  //         this.toastService.showSuccess('Penny drop verification successful!');
  //       } else if (status === 'Failed' || status === 'failed' || status === 'Fail') {
  //         normalizedStatus = 'failed';
  //         this.toastService.showWarning('Penny drop verification failed. Please check the account details.');
  //       } else {
  //         normalizedStatus = 'pending';
  //       }
        
  //       this.pennyDropStatus = normalizedStatus;
  //       this.isRefreshing = false;
  //     },
  //     error: (err: any) => {
  //       this.isRefreshing = false;
  //       const errorMsg = err?.error?.message || 'Failed to refresh penny drop status.';
  //       this.toastService.showError(errorMsg);
  //     }
  //   });
  // }

  onDelete(): void {
    if (!this.bankDetailsId || !this.loanApplicationId) {
      return;
    }

    if (confirm('Are you sure you want to delete these bank details?')) {
      this.bankService.deleteBankDetails(this.loanApplicationId, this.bankDetailsId).subscribe({
        next: () => {
          this.toastService.showSuccess('Bank details deleted successfully!');
          this.bankDetailsId = null;
          this.isDataAvailable = false;
          this.isEditMode = true;
          this.form.reset();
          this.form.enable();
          this.pennyDropStatus = null;
          this.stepCompleted.emit();
        },
        error: (err: any) => {
          const errorMsg = err?.error?.message || 'Failed to delete bank details. Please try again.';
          this.toastService.showError(errorMsg);
        }
      });
    }
  }

  getPennyDropStatusIcon(): string {
    switch (this.pennyDropStatus) {
      case 'success':
        return 'check_circle';
      case 'failed':
        return 'cancel';
      default:
        return 'schedule';
    }
  }

  getPennyDropStatusColor(): string {
    switch (this.pennyDropStatus) {
      case 'success':
        return 'primary';
      case 'failed':
        return 'warn';
      default:
        return '';
    }
  }

  getPennyDropStatusText(): string {
    switch (this.pennyDropStatus) {
      case 'success':
        return 'Verified';
      case 'failed':
        return 'Failed';
      default:
        return 'Pending';
    }
  }

  validateStep(): boolean {
    // If form is already saved (not in edit mode), allow navigation
    if (!this.isEditMode && this.isDataAvailable) {
      return true;
    }
    // If in edit mode, validate form
    if (this.isEditMode) {
      this.form.markAllAsTouched();
      if (!this.form.valid) {
        this.toastService.showWarning('Please fill all required fields correctly.');
        return false;
      }
    }
    return true;
  }
}

