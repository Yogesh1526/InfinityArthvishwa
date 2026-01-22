import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-nominee',
  templateUrl: './nominee.component.html',
  styleUrls: ['./nominee.component.css']
})
export class NomineeComponent implements OnInit {

  @Input() customerId!: string;
  @Input() loanApplicationId!: string;
  @Output() stepCompleted = new EventEmitter<void>();

  form: FormGroup;
  isEditable = false;
  isDataAvailable = false;
  formLoaded = false;

  nomineeId: number | null = null;

  genderOptions = ['Male', 'Female', 'Other'];
  relationshipOptions = ['Spouse', 'Father', 'Mother', 'Brother', 'Sister', 'Friend', 'Other'];

  constructor(
    private fb: FormBuilder,
    private nomineeService: PersonalDetailsService,
    private toastService: ToastService
  ) {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      relationship: ['', Validators.required],
      gender: ['', Validators.required],
      mobileNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      dob: ['', Validators.required],
      age: ['']
    });
  }

  ngOnInit(): void {
    // Subscribe to DOB changes to auto-calculate age
    this.form.get('dob')?.valueChanges.subscribe((dob) => {
      if (dob) {
        const age = this.calculateAge(dob);
        this.form.patchValue({ age: age }, { emitEvent: false });
      }
    });

    if (this.customerId) {
      this.loadNominee();
    } else {
      this.isEditable = true;
      this.formLoaded = true;
    }
  }

  /**
   * Calculate age from date of birth
   */
  calculateAge(dob: Date | string): number {
    const birthDate = new Date(dob);
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    // If birthday hasn't occurred this year, subtract 1
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age > 0 ? age : 0;
  }

  loadNominee(): void {
    this.nomineeService.getNomineeByCustomerId(this.customerId).subscribe({
      next: (res) => {
        // Handle different response structures
        let nominee = null;
        if (res) {
          if (res.data) {
            nominee = Array.isArray(res.data) ? res.data[0] : res.data;
          } else if (res.id) {
            nominee = res;
          }
        }

        if (nominee && nominee.id) {
          this.nomineeId = nominee.id;
          const nameParts = nominee.nomineeName?.split(' ') || ['', ''];
          this.form.patchValue({
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            relationship: nominee.relationShip || '',
            gender: nominee.gender || '',
            dob: nominee.dob || '',
            mobileNumber: nominee.phoneNo || '',
            age: nominee.age || ''
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

  onEdit(): void {
    this.isEditable = true;
    this.form.enable();
  }

  onCancel(): void {
    if (this.isDataAvailable) {
      this.isEditable = false;
      this.form.disable();
      this.loadNominee();
    } else {
      this.form.reset();
      this.isEditable = false;
    }
  }

  onDelete(): void {
    if (this.nomineeId && this.loanApplicationId) {
      if (confirm('Are you sure you want to delete this nominee?')) {
        this.nomineeService.deleteNominee(this.loanApplicationId, this.nomineeId).subscribe({
          next: () => {
            this.toastService.showSuccess('Nominee deleted successfully!');
            this.nomineeId = null;
            this.isDataAvailable = false;
            this.form.reset();
            this.isEditable = true;
            this.form.enable();
          },
          error: (err) => {
            const errorMsg = err?.error?.message || 'Failed to delete nominee. Please try again.';
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

    const payload: any = {
      nomineeName: `${this.form.value.firstName} ${this.form.value.lastName}`.trim(),
      relationShip: this.form.value.relationship,
      age: this.form.value.age || null,
      phoneNo: parseInt(this.form.value.mobileNumber),
      gender: this.form.value.gender,
      customerId: this.customerId
    };

    if (this.nomineeId) {
      // Update existing nominee
      payload.id = this.nomineeId;
      this.nomineeService.updateNominee(payload).subscribe({
        next: () => {
          this.toastService.showSuccess('Nominee details updated successfully!');
          this.isEditable = false;
          this.isDataAvailable = true;
          this.form.disable();
          this.stepCompleted.emit();
        },
        error: (err) => {
          const errorMsg = err?.error?.message || 'Failed to update nominee details. Please try again.';
          this.toastService.showError(errorMsg);
        }
      });
    } else {
      // Create new nominee
      this.nomineeService.saveNominee(payload).subscribe({
        next: (response) => {
          // Store the ID from response
          if (response && response.data) {
            this.nomineeId = response.data.id || response.data[0]?.id;
          } else if (response && response.id) {
            this.nomineeId = response.id;
          }
          this.toastService.showSuccess('Nominee details saved successfully!');
          this.isEditable = false;
          this.isDataAvailable = true;
          this.form.disable();
          this.stepCompleted.emit();
        },
        error: (err) => {
          const errorMsg = err?.error?.message || 'Failed to save nominee details. Please try again.';
          this.toastService.showError(errorMsg);
        }
      });
    }
  }
}
