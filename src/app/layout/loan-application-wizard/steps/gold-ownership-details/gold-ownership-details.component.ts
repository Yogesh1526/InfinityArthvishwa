import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-gold-ownership-details',
  templateUrl: './gold-ownership-details.component.html',
  styleUrls: ['./gold-ownership-details.component.css']
})
export class GoldOwnershipDetailsComponent implements OnInit {
  @Input() customerId!: string;
  @Input() loanApplicationId!: string;
  @Output() stepCompleted = new EventEmitter<void>();
  @Output() loanAccountNumberUpdated = new EventEmitter<string>();

  form!: FormGroup;
  isEditable = false;
  isDataAvailable = false;
  formLoaded = false;
  goldOwnershipId: number | null = null;
  loanAccountNumber: string | null = null;
  goldOwnershipData: any = null;

  constructor(
    private fb: FormBuilder, 
    private goldService: PersonalDetailsService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      sourceOfJewellery: ['', Validators.required],
      yearOfPurchase: ['', Validators.required],
      storeNameAndLocation: ['', Validators.required],
      purposeOfPurchasing: ['', Validators.required]
    });

    // Load stored loanAccountNumber from localStorage
    this.loadStoredLoanAccountNumber();

    if (this.customerId) {
      this.loadGoldOwnershipDetails();
    } else {
      this.isEditable = true;
      this.formLoaded = true;
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
  }

  /**
   * Store loanAccountNumber in localStorage and emit to parent
   */
  storeLoanAccountNumber(loanAccountNumber: string): void {
    this.loanAccountNumber = loanAccountNumber;
    if (this.customerId) {
      localStorage.setItem(`loanAccountNumber_${this.customerId}`, loanAccountNumber);
    }
    // Emit to parent component so it can update loanApplicationId
    this.loanAccountNumberUpdated.emit(loanAccountNumber);
  }

  loadGoldOwnershipDetails(): void {
    if (!this.customerId) {
      this.isEditable = true;
      this.formLoaded = true;
      return;
    }

    // Priority: 1. Stored loanAccountNumber, 2. loanApplicationId (only if it's a valid loan account number)
    let accountNumber = this.loanAccountNumber;
    
    // Only use loanApplicationId if it's a valid loan account number (starts with AP or GL)
    if (!accountNumber && this.loanApplicationId && 
        (this.loanApplicationId.startsWith('AP') || this.loanApplicationId.startsWith('GL'))) {
      accountNumber = this.loanApplicationId;
    }

    // If we don't have a valid loan account number, don't call GET API
    if (!accountNumber) {
      this.isEditable = true;
      this.formLoaded = true;
      return;
    }

    this.goldService.getGoldOwnershipDetails(this.customerId, accountNumber).subscribe({
      next: (res) => {
        this.handleGoldOwnershipResponse(res);
      },
      error: (err) => {
        // If error, data might not exist yet
        this.isEditable = true;
        this.formLoaded = true;
      }
    });
  }

  handleGoldOwnershipResponse(res: any): void {
    let data = null;
    if (res) {
      if (res.data) {
        data = Array.isArray(res.data) ? res.data[0] : res.data;
      } else if (res.id) {
        data = res;
      }
    }

    if (data && data.id) {
      this.goldOwnershipId = data.id;
      // Store the loanAccountNumber from response
      if (data.loanAccountNumber) {
        this.storeLoanAccountNumber(data.loanAccountNumber);
      }
      this.goldOwnershipData = data;
      
      this.form.patchValue({
        sourceOfJewellery: data.sourceOfJewellery || '',
        yearOfPurchase: data.yearOfPurchase ? new Date(data.yearOfPurchase) : '',
        storeNameAndLocation: data.storeNameAndLocation || '',
        purposeOfPurchasing: data.purposeOfPurchasing || ''
      });
      
      this.isDataAvailable = true;
      this.form.disable();
    } else {
      this.isEditable = true;
    }
    this.formLoaded = true;
  }

  onEdit(): void {
    this.isEditable = true;
    this.form.enable();
  }

  onCancel(): void {
    if (this.isDataAvailable) {
      this.isEditable = false;
      this.form.disable();
      this.loadGoldOwnershipDetails();
    } else {
      this.form.reset();
      this.isEditable = false;
    }
  }

  onDelete(): void {
    if (this.goldOwnershipId && this.loanAccountNumber) {
      if (confirm('Are you sure you want to delete these gold ownership details?')) {
        this.goldService.deleteGoldOwnershipDetails(this.loanAccountNumber, this.goldOwnershipId).subscribe({
          next: () => {
            this.toastService.showSuccess('Gold ownership details deleted successfully!');
            this.goldOwnershipId = null;
            // Clear stored loanAccountNumber from localStorage
            if (this.customerId) {
              localStorage.removeItem(`loanAccountNumber_${this.customerId}`);
            }
            this.loanAccountNumber = null;
            this.goldOwnershipData = null;
            this.isDataAvailable = false;
            this.form.reset();
            this.isEditable = true;
            this.form.enable();
          },
          error: (err) => {
            const errorMsg = err?.error?.message || 'Failed to delete gold ownership details. Please try again.';
            this.toastService.showError(errorMsg);
          }
        });
      }
    }
  }

  validateStep(): boolean {
    // If form is already saved (not editable), allow navigation
    if (!this.isEditable && this.isDataAvailable) {
      return true;
    }
    // If in edit mode, validate form
    if (this.isEditable) {
      this.form.markAllAsTouched();
      if (!this.form.valid) {
        this.toastService.showWarning('Please fill all required fields correctly.');
        return false;
      }
    }
    return true;
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (!this.form.valid) {
      this.toastService.showWarning('Please fill all required fields correctly.');
      return;
    }

    const rawDate = this.form.value.yearOfPurchase;
    const formattedDate = rawDate ? new Date(rawDate).toISOString().split('T')[0] : '';

    if (this.goldOwnershipId) {
      // Update existing gold ownership
      const payload = {
        id: this.goldOwnershipId,
        loanAccountNumber: this.loanAccountNumber || this.loanApplicationId,
        customerId: this.customerId,
        sourceOfJewellery: this.form.value.sourceOfJewellery,
        yearOfPurchase: formattedDate,
        storeNameAndLocation: this.form.value.storeNameAndLocation,
        purposeOfPurchasing: this.form.value.purposeOfPurchasing
      };

      this.goldService.updateGoldOwnershipDetails(payload).subscribe({
        next: (response) => {
          this.toastService.showSuccess('Gold ownership details updated successfully!');
          this.isEditable = false;
          this.isDataAvailable = true;
          this.form.disable();
          this.loadGoldOwnershipDetails();
          this.stepCompleted.emit();
        },
        error: (err) => {
          const errorMsg = err?.error?.message || 'Failed to update gold ownership details. Please try again.';
          this.toastService.showError(errorMsg);
        }
      });
    } else {
      // Create new gold ownership
      const payload = {
        customerId: this.customerId,
        sourceOfJewellery: this.form.value.sourceOfJewellery,
        yearOfPurchase: formattedDate,
        storeNameAndLocation: this.form.value.storeNameAndLocation,
        purposeOfPurchasing: this.form.value.purposeOfPurchasing
      };

      this.goldService.saveGoldOwnershipDetails(payload).subscribe({
        next: (response) => {
          // Extract loan account number from response
          let newLoanAccountNumber: string | null = null;
          
          if (response && response.data) {
            newLoanAccountNumber = response.data.loanAccountNumber || response.data[0]?.loanAccountNumber;
            this.goldOwnershipId = response.data.id || response.data[0]?.id;
          } else if (response && response.loanAccountNumber) {
            newLoanAccountNumber = response.loanAccountNumber;
            this.goldOwnershipId = response.id;
          } else if (response && response.id) {
            this.goldOwnershipId = response.id;
          }

          // Store and emit the loan account number
          if (newLoanAccountNumber) {
            this.storeLoanAccountNumber(newLoanAccountNumber);
          }

          this.toastService.showSuccess('Gold ownership details saved successfully!');
          this.isEditable = false;
          this.isDataAvailable = true;
          this.form.disable();
          this.loadGoldOwnershipDetails();
          this.stepCompleted.emit();
        },
        error: (err) => {
          const errorMsg = err?.error?.message || 'Failed to save gold ownership details. Please try again.';
          this.toastService.showError(errorMsg);
        }
      });
    }
  }
}

