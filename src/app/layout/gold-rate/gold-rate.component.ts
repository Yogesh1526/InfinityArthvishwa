import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { GoldRateService, GoldRate } from '../../services/gold-rate.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-gold-rate',
  templateUrl: './gold-rate.component.html',
  styleUrls: ['./gold-rate.component.css']
})
export class GoldRateComponent implements OnInit {
  goldRateForm: FormGroup;
  currentGoldRate: GoldRate | null = null;
  isLoading = false;
  isSaving = false;
  todayDate: string;

  constructor(
    private fb: FormBuilder,
    private goldRateService: GoldRateService,
    private toastService: ToastService
  ) {
    this.todayDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    this.goldRateForm = this.fb.group({
      ratePerGram: ['', [Validators.required, Validators.min(0.01), Validators.pattern(/^\d+(\.\d{1,2})?$/)]]
    });
  }

  ngOnInit(): void {
    this.loadCurrentGoldRate();
  }

  loadCurrentGoldRate(): void {
    this.isLoading = true;
    this.goldRateService.getCurrentGoldRate().subscribe({
      next: (response: any) => {
        this.isLoading = false;
        // Handle nested response structure: response.data.data
        let goldRate = null;
        
        if (response?.data?.data) {
          // Nested structure: { code: 200, data: { code: 200, data: {...} } }
          goldRate = Array.isArray(response.data.data) ? response.data.data[0] : response.data.data;
        } else if (response?.data) {
          // Direct data structure: { code: 200, data: {...} }
          goldRate = Array.isArray(response.data) ? response.data[0] : response.data;
        } else if (response && typeof response === 'object' && response.ratePerGram) {
          // Direct object
          goldRate = response;
        } else if (Array.isArray(response) && response.length > 0) {
          // Array response
          goldRate = response[0];
        }
        
        if (goldRate && goldRate.ratePerGram) {
          this.currentGoldRate = goldRate;
          this.goldRateForm.patchValue({
            ratePerGram: goldRate.ratePerGram || ''
          });
        } else {
          // No existing rate, form is ready for new entry
          this.currentGoldRate = null;
        }
      },
      error: (err) => {
        this.isLoading = false;
        // If 404, it means no rate exists yet - that's okay
        if (err.status !== 404) {
          this.toastService.showError('Failed to load current gold rate');
          console.error('Error loading gold rate:', err);
        }
        this.currentGoldRate = null;
      }
    });
  }

  onSubmit(): void {
    if (this.goldRateForm.invalid) {
      this.goldRateForm.markAllAsTouched();
      this.toastService.showWarning('Please enter a valid gold rate');
      return;
    }

    this.isSaving = true;
    const ratePerGram = parseFloat(this.goldRateForm.value.ratePerGram);
    
    // Extract ID from current gold rate if it exists
    const rid = this.currentGoldRate?.id;

    // Call save/update with ID if available
    this.goldRateService.saveOrUpdateGoldRate(ratePerGram, rid).subscribe({
      next: (response: any) => {
        this.isSaving = false;
        if (response?.code === 200 || response?.success || response?.data) {
          const message = rid ? 'Gold rate updated successfully!' : 'Gold rate saved successfully!';
          this.toastService.showSuccess(message);
          this.loadCurrentGoldRate();
        } else {
          this.toastService.showError(response?.message || 'Failed to save gold rate');
        }
      },
      error: (err) => {
        this.isSaving = false;
        const errorMsg = err?.error?.message || 'Failed to save gold rate. Please try again.';
        this.toastService.showError(errorMsg);
        console.error('Error saving gold rate:', err);
      }
    });
  }
  
  get ratePerGramControl() {
    return this.goldRateForm.get('ratePerGram');
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  }
}

