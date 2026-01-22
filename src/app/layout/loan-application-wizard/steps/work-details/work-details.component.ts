import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-work-details',
  templateUrl: './work-details.component.html',
  styleUrls: ['./work-details.component.css']
})
export class WorkDetailsComponent implements OnInit, OnChanges {
  form: FormGroup;
  formLoaded = false;
  isEditable = false;
  isDataAvailable = false;
  workDetailsId: number | null = null;
  @Input() customerId!: string;
  @Input() customerNumericId!: number;
  @Input() loanApplicationId!: string;
  @Output() stepCompleted = new EventEmitter<void>();

  // Dropdown options
  customerSegmentOptions = [
    'Self Employed Professional',
    'Self Employed Non-Professional',
    'Salaried',
    'Business',
    'Retired',
    'Student',
    'Housewife',
    'Other'
  ];

  occupationOptions = [
    'Construction Manager',
    'Software Engineer',
    'Doctor',
    'Lawyer',
    'Teacher',
    'Accountant',
    'Engineer',
    'Business Owner',
    'Manager',
    'Sales Executive',
    'Other'
  ];

  experienceOptions = [
    'Less than 1 Year',
    '1 Year',
    '2 Years',
    '3 Years',
    '4 Years',
    '5 Years',
    '6 Years',
    '7 Years',
    '8 Years',
    '9 Years',
    '10 Years',
    '11 Years',
    '12 Years',
    '13 Years',
    '14 Years',
    '15 Years',
    '16 Years',
    '17 Years',
    '18 Years',
    '19 Years',
    '20+ Years'
  ];

  annualIncomeOptions = [
    'Less than 1 Lakh',
    '1 Lakh - 2 Lakh',
    '2 Lakh - 3 Lakh',
    '3 Lakh - 4 Lakh',
    '4 Lakh - 5 Lakh',
    '5 Lakh - 6 Lakh',
    '6 Lakh - 7 Lakh',
    '7 Lakh - 8 Lakh',
    '8 Lakh - 9 Lakh',
    '9 Lakh - 10 Lakh',
    '10 Lakh - 15 Lakh',
    '15 Lakh - 20 Lakh',
    '20 Lakh - 25 Lakh',
    '25 Lakh - 30 Lakh',
    '30 Lakh+'
  ];

  constructor(
    private fb: FormBuilder,
    private workDetailsService: PersonalDetailsService,
    private toastService: ToastService
  ) {
    this.form = this.fb.group({
      customerSegment: ['', Validators.required],
      occupation: ['', Validators.required],
      experienceInCurrentJob: ['', Validators.required],
      annualIncome: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    if (this.customerId) {
      this.loadWorkDetails(this.customerId);
    } else {
      this.isEditable = true;
      this.formLoaded = true;
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['customerId'] && changes['customerId'].currentValue && !changes['customerId'].firstChange) {
      this.loadWorkDetails(this.customerId);
    }
  }

  loadWorkDetails(customerId: string) {
    if (!customerId) {
      this.isEditable = true;
      this.formLoaded = true;
      return;
    }
    this.workDetailsService.getWorkDetailsByCustomerId(customerId).subscribe({
      next: (response) => {
        // Handle different response structures
        let data = null;
        if (response) {
          if (response.data) {
            data = Array.isArray(response.data) ? response.data[0] : response.data;
          } else if (response.id) {
            data = response;
          }
        }

        if (data && data.id) {
          this.workDetailsId = data.id;
          this.form.patchValue({
            customerSegment: data.customerSegment || '',
            occupation: data.occupation || '',
            experienceInCurrentJob: data.experienceInCurrentJob || '',
            annualIncome: data.annualIncome || ''
          });
          this.isDataAvailable = true;
          this.form.disable();
        } else {
          this.isEditable = true;
        }
        this.formLoaded = true;
      },
      error: () => {
        this.isEditable = true;
        this.formLoaded = true;
      }
    });
  }

  onEdit() {
    this.isEditable = true;
    this.form.enable();
  }

  onCancel() {
    if (this.isDataAvailable) {
      this.isEditable = false;
      this.form.disable();
      this.loadWorkDetails(this.customerId);
    } else {
      this.form.reset();
      this.isEditable = false;
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

  onSubmit() {
    this.form.markAllAsTouched();
    if (!this.form.valid) {
      this.toastService.showWarning('Please fill all required fields correctly.');
      return;
    }

    const payload: any = {
      customerSegment: this.form.value.customerSegment,
      occupation: this.form.value.occupation,
      experienceInCurrentJob: this.form.value.experienceInCurrentJob,
      annualIncome: this.form.value.annualIncome,
      customerId: this.customerId
    };

    if (this.workDetailsId) {
      // Update existing work details
      payload.id = this.workDetailsId;
      this.workDetailsService.updateWorkDetails(payload).subscribe({
        next: (response) => {
          this.toastService.showSuccess('Work details updated successfully!');
          this.isEditable = false;
          this.isDataAvailable = true;
          this.form.disable();
          this.stepCompleted.emit();
        },
        error: (err) => {
          const errorMsg = err?.error?.message || 'Failed to update work details. Please try again.';
          this.toastService.showError(errorMsg);
        }
      });
    } else {
      // Create new work details
      this.workDetailsService.saveWorkDetails(payload).subscribe({
        next: (response) => {
          // Store the ID from response
          if (response && response.data) {
            this.workDetailsId = response.data.id || response.data[0]?.id;
          } else if (response && response.id) {
            this.workDetailsId = response.id;
          }
          this.toastService.showSuccess('Work details saved successfully!');
          this.isEditable = false;
          this.isDataAvailable = true;
          this.form.disable();
          this.stepCompleted.emit();
        },
        error: (err) => {
          const errorMsg = err?.error?.message || 'Failed to save work details. Please try again.';
          this.toastService.showError(errorMsg);
        }
      });
    }
  }

  onDelete() {
    if (this.workDetailsId && this.loanApplicationId) {
      if (confirm('Are you sure you want to delete these work details?')) {
        this.workDetailsService.deleteWorkDetails(this.workDetailsId, this.loanApplicationId).subscribe({
          next: () => {
            this.toastService.showSuccess('Work details deleted successfully!');
            this.workDetailsId = null;
            this.isDataAvailable = false;
            this.form.reset();
            this.isEditable = true;
            this.form.enable();
          },
          error: (err) => {
            const errorMsg = err?.error?.message || 'Failed to delete work details. Please try again.';
            this.toastService.showError(errorMsg);
          }
        });
      }
    }
  }
}
