import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-tare-weight',
  templateUrl: './tare-weight.component.html',
  styleUrls: ['./tare-weight.component.css']
})
export class TareWeightComponent implements OnInit {
  @Input() customerId!: string;
  @Input() loanApplicationId!: string;
  @Output() stepCompleted = new EventEmitter<void>();

  form!: FormGroup;
  isEditMode = false;
  isDataAvailable = false;
  formLoaded = false;
  tareWeightId: number | null = null;
  loanAccountNumber: string | null = null;
  isLoading = false;
  isSaving = false;
  packetNumber: string = '';

  constructor(
    private fb: FormBuilder,
    private tareWeightService: PersonalDetailsService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadStoredLoanAccountNumber();
    this.initForm();
    if (this.customerId && this.getLoanAccountNumber()) {
      this.loadTareWeight();
      this.loadPacketNumber();
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
      tareWeight: ['', [Validators.required, Validators.min(0)]]
    });
  }

  loadPacketNumber(): void {
    if (!this.customerId || !this.getLoanAccountNumber()) {
      return;
    }

    // Load packet allotment to get packet number
    this.tareWeightService.getPacketAllotmentDetails(this.customerId, this.getLoanAccountNumber()!).pipe(
      catchError(err => of({ data: [] }))
    ).subscribe({
      next: (res: any) => {
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          const packetData = res.data[0];
          this.packetNumber = packetData.pocketNumber || packetData.packetId || packetData.packetNo || '';
        }
      },
      error: (err) => {
        // Silently handle
      }
    });
  }

  loadTareWeight(): void {
    if (!this.customerId || !this.getLoanAccountNumber()) {
      this.isEditMode = true;
      this.formLoaded = true;
      return;
    }

    this.isLoading = true;
    this.tareWeightService.getTareWeightById(this.customerId, this.getLoanAccountNumber()!).pipe(
      catchError(err => of({ data: [] }))
    ).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        // API returns data as an array
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          // Get the first item from the array
          const data = res.data[0];
          this.tareWeightId = data.id || null;
          this.isDataAvailable = true;
          this.isEditMode = false;
          this.form.patchValue({
            tareWeight: data.tareWeightInGrams || data.tareWeight || ''
          });
          this.form.disable();
          // Update packet number if available
          if (data.packetNo) {
            this.packetNumber = data.packetNo;
          }
        } else {
          this.isEditMode = true;
        }
        this.formLoaded = true;
      },
      error: (err: any) => {
        this.isLoading = false;
        this.isEditMode = true;
        this.formLoaded = true;
      }
    });
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

    if (!this.packetNumber) {
      this.toastService.showError('Packet Number is required. Please complete Packet Allotment first.');
      return;
    }

    const basePayload = {
      customerId: this.customerId,
      loanAccountNumber: this.getLoanAccountNumber()!,
      packetNo: this.packetNumber,
      tareWeightInGrams: parseFloat(this.form.value.tareWeight)
    };

    this.isSaving = true;

    if (this.tareWeightId) {
      // Update existing tare weight
      const updatePayload = {
        ...basePayload,
        id: this.tareWeightId
      };
      
      this.tareWeightService.updateTareWeight(updatePayload).subscribe({
        next: (res: any) => {
          this.isSaving = false;
          this.toastService.showSuccess('Tare weight updated successfully!');
          this.isEditMode = false;
          this.isDataAvailable = true;
          this.stepCompleted.emit();
          this.loadTareWeight();
        },
        error: (err: any) => {
          this.isSaving = false;
          const errorMsg = err?.error?.message || 'Failed to update tare weight. Please try again.';
          this.toastService.showError(errorMsg);
        }
      });
    } else {
      // Create new tare weight
      this.tareWeightService.saveTareWeight(basePayload).subscribe({
        next: (res: any) => {
          this.isSaving = false;
          this.toastService.showSuccess('Tare weight saved successfully!');
          this.tareWeightId = res?.data?.id || null;
          this.isEditMode = false;
          this.isDataAvailable = true;
          this.stepCompleted.emit();
          this.loadTareWeight();
        },
        error: (err: any) => {
          this.isSaving = false;
          const errorMsg = err?.error?.message || 'Failed to save tare weight. Please try again.';
          this.toastService.showError(errorMsg);
        }
      });
    }
  }

  onCancel(): void {
    if (this.isDataAvailable) {
      this.isEditMode = false;
      this.loadTareWeight();
    } else {
      this.form.reset();
      this.isEditMode = false;
    }
  }
}

