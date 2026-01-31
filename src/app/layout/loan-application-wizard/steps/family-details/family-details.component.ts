import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-family-details',
  templateUrl: './family-details.component.html',
  styleUrls: ['./family-details.component.css']
})
export class FamilyDetailsComponent implements OnInit, OnChanges {

  @Input() customerId!: string;
  @Input() loanApplicationId!: string;

  form: FormGroup;
  isEditMode: boolean = true;
  familyDetails: any;

  @Output() stepCompleted = new EventEmitter<void>();

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private personalService: PersonalDetailsService,
    private toastService: ToastService
  ) {
    this.form = this.fb.group({
      spouseFirstName: [''],
      spouseLastName: [''],
      fatherFirstName: ['', Validators.required],
      fatherLastName: ['', Validators.required],
      motherFirstName: ['', Validators.required],
      motherLastName: ['', Validators.required]
    });
  }

  ngOnInit() {
    if (this.customerId) {
      this.fetchFamilyDetails(this.customerId);
  }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['customerId'] && changes['customerId'].currentValue && !changes['customerId'].firstChange) {
      this.fetchFamilyDetails(this.customerId);
    }
  }

  fetchFamilyDetails(customerId: any) {
    this.personalService.getFamilyDetailsById(customerId).subscribe({
      next: (res) => {
        // Handle different response structures
        let data = null;
        if (res) {
          if (res.data) {
            // Response has data property
            data = Array.isArray(res.data) ? res.data[0] : res.data;
          } else if (res.id) {
            // Response is the data object directly
            data = res;
          }
        }
        
        if (data && data.id) {
          this.familyDetails = data;
          this.isEditMode = false; // Show view mode
        } else {
          this.isEditMode = true; // Show form
        }
      },
      error: () => {
        this.isEditMode = true; // Show form on error
      }
    });
  }
  

  validateStep(): boolean {
    // If form is already saved (not in edit mode), allow navigation
    if (!this.isEditMode && this.familyDetails) {
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

  onSubmit() {
    this.form.markAllAsTouched();
    if (!this.form.valid) {
      this.toastService.showWarning('Please fill all required fields correctly.');
      return;
    }

    const formVal = this.form.value;
    // Spouse info is optional; pass "N/A" for both when unmarried/not provided
    const spouseFirstName = (formVal.spouseFirstName || '').trim();
    const spouseLastName = (formVal.spouseLastName || '').trim();
    const payload = {
      ...formVal,
      customerId: this.customerId,
      spouseFirstName: spouseFirstName || 'N/A',
      spouseLastName: spouseLastName || 'N/A',
    };

    // Check if we're updating existing family details
    if (this.familyDetails && this.familyDetails.id) {
      // Update existing family details
      payload.id = this.familyDetails.id;
      this.personalService.updateFamilyDetails(payload).subscribe({
        next: (response) => {
          this.familyDetails = { ...this.familyDetails, ...payload };
          this.isEditMode = false;
          this.toastService.showSuccess('Family details updated successfully!');
          this.stepCompleted.emit();
        },
        error: (err) => {
          const errorMsg = err?.error?.message || 'Failed to update family details. Please try again.';
          this.toastService.showError(errorMsg);
        }
      });
    } else {
      // Create new family details
      this.personalService.createFamilyDetails(payload).subscribe({
        next: (response) => {
          // Store the response data which should include the id
          // Handle different response structures
          if (response && response.data) {
            this.familyDetails = response.data;
          } else if (response && response.id) {
            this.familyDetails = response;
          } else {
            // If response doesn't have id, fetch again to get the created record
            this.fetchFamilyDetails(this.customerId);
          }
          this.isEditMode = false;
          this.toastService.showSuccess('Family details saved successfully!');
          this.stepCompleted.emit();
        },
        error: (err) => {
          const errorMsg = err?.error?.message || 'Failed to save family details. Please try again.';
          this.toastService.showError(errorMsg);
        }
      });
    }
  }

  editDetails() {
    if (this.familyDetails) {
      // Show empty for spouse when value is "N/A" so user can leave blank or fill in
      const spouseFirst = this.familyDetails.spouseFirstName;
      const spouseLast = this.familyDetails.spouseLastName;
      this.form.patchValue({
        spouseFirstName: (spouseFirst === 'N/A' || !spouseFirst) ? '' : spouseFirst,
        spouseLastName: (spouseLast === 'N/A' || !spouseLast) ? '' : spouseLast,
        fatherFirstName: this.familyDetails.fatherFirstName || '',
        fatherLastName: this.familyDetails.fatherLastName || '',
        motherFirstName: this.familyDetails.motherFirstName || '',
        motherLastName: this.familyDetails.motherLastName || ''
      });
    }
    this.isEditMode = true;
  }
}
