import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-reference-details',
  templateUrl: './reference-details.component.html',
  styleUrls: ['./reference-details.component.css']
})
export class ReferenceDetailsComponent implements OnInit {
  @Input() customerId!: string;
  @Input() loanApplicationId!: string;
  @Output() stepCompleted = new EventEmitter<void>();

  form!: FormGroup;
  isLoading = false;
  showForm = false;
  isEditMode = false;
  editingIndex: number | null = null;

  referenceList: any[] = [];

  relationshipOptions = [
    'Spouse', 'Father', 'Mother', 'Brother', 'Sister',
    'Friend', 'Colleague', 'Neighbour', 'Other'
  ];

  constructor(
    private fb: FormBuilder,
    private referenceService: PersonalDetailsService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.initForm();
    if (this.customerId) {
      this.fetchReferenceList();
    }
  }

  initForm(): void {
    this.form = this.fb.group({
      name: ['', Validators.required],
      mobileNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      relationship: ['', Validators.required],
      gender: ['', Validators.required]
    });
  }

  fetchReferenceList(): void {
    this.isLoading = true;
    this.referenceService.getReferenceDetailsByCustomerId(this.customerId).subscribe({
      next: (res) => {
        // Handle different response structures
        if (Array.isArray(res)) {
          this.referenceList = res;
        } else if (res?.data) {
          this.referenceList = Array.isArray(res.data) ? res.data : [res.data];
        } else {
          this.referenceList = [];
        }
        this.isLoading = false;
      },
      error: () => {
        this.referenceList = [];
        this.isLoading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.toastService.showWarning('Please fill all required fields correctly.');
      return;
    }

    const payload: any = {
      name: this.form.value.name,
      mobileNumber: this.form.value.mobileNumber,
      relationshipWithApplicant: this.form.value.relationship,
      gender: this.form.value.gender,
      customerId: this.customerId
    };

    if (this.isEditMode && this.editingIndex !== null) {
      // Update existing reference
      payload.id = this.referenceList[this.editingIndex].id;
      this.referenceService.updateReferenceDetails(payload).subscribe({
        next: () => {
          this.toastService.showSuccess('Reference details updated successfully!');
          this.showForm = false;
          this.isEditMode = false;
          this.editingIndex = null;
          this.form.reset();
          this.fetchReferenceList();
          this.stepCompleted.emit();
        },
        error: (err) => {
          const errorMsg = err?.error?.message || 'Failed to update reference details. Please try again.';
          this.toastService.showError(errorMsg);
        }
      });
    } else {
      // Create new reference
      this.referenceService.saveReferenceDetails(payload).subscribe({
        next: () => {
          this.toastService.showSuccess('Reference details saved successfully!');
          this.showForm = false;
          this.isEditMode = false;
          this.editingIndex = null;
          this.form.reset();
          this.fetchReferenceList();
          this.stepCompleted.emit();
        },
        error: (err) => {
          const errorMsg = err?.error?.message || 'Failed to save reference details. Please try again.';
          this.toastService.showError(errorMsg);
        }
      });
    }
  }

  editReference(ref: any, index: number): void {
    this.form.patchValue({
      name: ref.name,
      mobileNumber: ref.mobileNumber,
      relationship: ref.relationshipWithApplicant,
      gender: ref.gender || ''
    });
    this.showForm = true;
    this.isEditMode = true;
    this.editingIndex = index;
  }

  cancelForm(): void {
    this.showForm = false;
    this.isEditMode = false;
    this.editingIndex = null;
    this.form.reset();
  }

  deleteReference(ref: any, index: number): void {
    if (confirm('Are you sure you want to delete this reference?')) {
      if (ref.id && this.loanApplicationId) {
        this.referenceService.deleteReferenceDetails(this.loanApplicationId, ref.id).subscribe({
          next: () => {
            this.toastService.showSuccess('Reference deleted successfully!');
            this.fetchReferenceList();
          },
          error: (err) => {
            const errorMsg = err?.error?.message || 'Failed to delete reference. Please try again.';
            this.toastService.showError(errorMsg);
          }
        });
      }
    }
  }

  validateStep(): boolean {
    // At least 2 references are required
    if (this.referenceList.length < 2) {
      this.toastService.showWarning('At least 2 references are required. Please add more references.');
      return false;
    }
    return true;
  }
}
