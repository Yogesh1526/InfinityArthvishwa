import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';

interface JewelleryItem {
  id: number;
  jewelleryName: string;
  quantity: number;
  grossWeight: number;
  stoneWeight: number;
  netWeight: number;
  karat: string;
  purity: number;
  netPurityWeight: number;
}

interface OriginalValues {
  stoneWeight: number;
  karat: string;
  purity: number;
}

@Component({
  selector: 'app-second-valuation',
  templateUrl: './second-valuation.component.html',
  styleUrls: ['./second-valuation.component.css']
})
export class SecondValuationComponent implements OnInit {
  @Input() customerId!: string;
  @Input() loanApplicationId!: string;
  @Output() stepCompleted = new EventEmitter<void>();

  loanAccountNumber: string | null = null;
  form: FormGroup;
  jewelleryItems: JewelleryItem[] = [];
  uploadedImageUrl: string | null = null;
  isValuationSaved = false;

  // Track original values to detect changes
  originalValues: OriginalValues[] = [];
  hasChanges = false;

  // Karat options same as first valuation
  karatOptions = [
    { value: '22HM', label: '22HM', min: 98, max: 100 },
    { value: '22', label: '22', min: 95, max: 97 },
    { value: '21', label: '21', min: 88, max: 94 },
    { value: '20', label: '20', min: 81, max: 87 },
    { value: '18', label: '18', min: 75, max: 80 }
  ];

  // Validation errors per item
  itemErrors: { stoneWeight: string; purity: string }[] = [];

  // Additional totals from API
  totalQuantity = 0;
  totalGrossWeight = 0;
  totalStoneWeight = 0;
  totalNetWeight = 0;
  totalNetPurityWeight = 0;

  displayedColumns: string[] = [
    'jewelleryName',
    'quantity',
    'grossWeight',
    'stoneWeight',
    'netWeight',
    'karat',
    'purity',
    'netPurityWeight'
  ];

  constructor(
    private fb: FormBuilder,
    private apiService: PersonalDetailsService,
    private toastService: ToastService
  ) {
    this.form = this.fb.group({
      items: this.fb.array([])
    });
  }

  get itemsFormArray(): FormArray {
    return this.form.get('items') as FormArray;
  }

  ngOnInit(): void {
    // Load stored loanAccountNumber from localStorage
    this.loadStoredLoanAccountNumber();
    this.loadSecondValuation();
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
   * Uses the same logic as getSecondValuationDetails
   */
  getLoanAccountNumber(): string | null {
    // Use stored loanAccountNumber or fallback to loanApplicationId
    return this.loanAccountNumber || this.loanApplicationId || null;
  }

  loadSecondValuation() {
    if (!this.customerId) {
      return;
    }

    // Use stored loanAccountNumber or fallback to loanApplicationId (same as PUT API)
    const accountNumber = this.getLoanAccountNumber();
    if (!accountNumber) {
      return;
    }

    this.apiService.getSecondValuationDetails(this.customerId, accountNumber).subscribe({
      next: (res) => {
        const apiItems = res?.data?.jewelleryItems || [];

        // Set totals from API response
        this.totalQuantity = res?.data?.totalQuantity || 0;
        this.totalGrossWeight = res?.data?.totalGrossWeight || 0;
        this.totalStoneWeight = res?.data?.totalStoneWeight || 0;
        this.totalNetWeight = res?.data?.totalNetWeight || 0;
        this.totalNetPurityWeight = res?.data?.totalNetPurityWeight || 0;

        this.itemsFormArray.clear();
        this.jewelleryItems = [];
        this.originalValues = [];
        this.itemErrors = [];
        this.hasChanges = false;

        apiItems.forEach((item: any) => {
          const gross = Number(item.grossWeight) || 0;
          const stone = Number(item.stoneWeight) || 0;
          const purity = Number(item.purity) || 0;
          const karat = item.karat || '';
          const netWeight = gross - stone;
          const netPurityWeight = (netWeight * purity) / 100;

          this.jewelleryItems.push({
            id: item.id,
            jewelleryName: item.jewelleryName,
            quantity: Number(item.quantity) || 0,
            grossWeight: gross,
            stoneWeight: stone,
            netWeight,
            karat,
            purity,
            netPurityWeight
          });

          // Store original values to track changes
          this.originalValues.push({
            stoneWeight: stone,
            karat,
            purity
          });

          // Initialize error object for this item
          this.itemErrors.push({ stoneWeight: '', purity: '' });

          const fg = this.fb.group({
            stoneWeight: [stone, Validators.required],
            karat: [karat, Validators.required],
            purity: [purity, Validators.required]
          });

          const idx = this.jewelleryItems.length - 1;

          // Listen for karat changes to update purity range validation
          fg.get('karat')?.valueChanges.subscribe(newKarat => {
            this.onKaratChange(idx, newKarat);
          });

          fg.valueChanges.subscribe(val => {
            const formIdx = this.itemsFormArray.controls.indexOf(fg);
            if (formIdx >= 0) {
              const current = this.jewelleryItems[formIdx];
              const newStone = Number(val.stoneWeight) || 0;
              const newKarat = val.karat || '';
              const newPurity = Number(val.purity) || 0;
              const newNetWeight = current.grossWeight - newStone;
              const newNetPurityWeight = (newNetWeight * newPurity) / 100;

              this.jewelleryItems[formIdx] = {
                ...current,
                stoneWeight: newStone,
                karat: newKarat,
                purity: newPurity,
                netWeight: newNetWeight,
                netPurityWeight: newNetPurityWeight
              };

              // Validate stone weight and purity
              this.validateStoneWeight(formIdx);
              this.validatePurity(formIdx);
              
              // Recalculate totals and check for changes
              this.recalculateTotals();
              this.checkForChanges();
            }
          });

          this.itemsFormArray.push(fg);
        });
      },
      error: err => {
        // Silently handle - no data means form is empty
      }
    });
    this.loadFirstValuationImage();

  }

  loadFirstValuationImage() {
    // this.apiService.getFirstValuationImage(this.loanApplicationId).subscribe({
    //   next: (imageBlob) => {
    //     const reader = new FileReader();
    //     reader.onload = () => {
    //       this.uploadedImageUrl = reader.result as string;
    //     };
    //     reader.readAsDataURL(imageBlob);
    //   },
    //   error: err => {
    //     // Silently handle - image may not exist yet
    //     this.uploadedImageUrl = null;
    //   }
    // });
  }

  submitAll() {
    if (this.form.invalid || this.hasValidationErrors()) {
      this.toastService.showWarning('Please correct the form fields before submitting.');
      return;
    }

    if (!this.hasChanges) {
      this.toastService.showWarning('Please make changes to at least one field before updating.');
      return;
    }

    // Use stored loanAccountNumber or fallback to loanApplicationId (same as GET API)
    const accountNumber = this.getLoanAccountNumber();
    
    if (!this.customerId || !accountNumber) {
      this.toastService.showError('Customer ID and Loan Account Number are required.');
      return;
    }
  
    const updatedItems = this.jewelleryItems.map((item, idx) => {
      const formVal = this.itemsFormArray.at(idx).value;
      return {
        id: item.id,
        jewelleryName: item.jewelleryName,
        quantity: item.quantity,
        grossWeight: item.grossWeight,
        stoneWeight: Number(formVal.stoneWeight),
        netWeight: item.grossWeight - Number(formVal.stoneWeight),
        karat: formVal.karat,
        purity: Number(formVal.purity)
      };
    });
  
    this.apiService.updateSecondValuation(this.customerId, accountNumber, updatedItems).subscribe({
      next: res => {
        this.toastService.showSuccess('Second valuation updated successfully!');
        this.isValuationSaved = true;
        this.hasChanges = false;
        this.stepCompleted.emit();
        // Optionally refresh the data or update UI
        this.loadSecondValuation();
      },
      error: err => {
        const errorMsg = err?.error?.message || 'Failed to update valuation. Please try again.';
        this.toastService.showError(errorMsg);
      }
    });
  }
  
  getTotal(field: keyof JewelleryItem): number {
    return this.jewelleryItems.reduce((acc, item) => acc + Number(item[field] || 0), 0);
  }

  getFormControl(index: number, field: string): FormControl {
    return this.itemsFormArray.at(index).get(field) as FormControl;
  }

  recalculateTotals(): void {
    this.totalQuantity = this.jewelleryItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    this.totalGrossWeight = this.jewelleryItems.reduce((sum, item) => sum + (item.grossWeight || 0), 0);
    this.totalStoneWeight = this.jewelleryItems.reduce((sum, item) => sum + (item.stoneWeight || 0), 0);
    this.totalNetWeight = this.jewelleryItems.reduce((sum, item) => sum + (item.netWeight || 0), 0);
    this.totalNetPurityWeight = this.jewelleryItems.reduce((sum, item) => sum + (item.netPurityWeight || 0), 0);
  }

  /**
   * Check if any field has changed from original values
   */
  checkForChanges(): void {
    this.hasChanges = this.jewelleryItems.some((item, idx) => {
      const original = this.originalValues[idx];
      if (!original) return false;
      
      return item.stoneWeight !== original.stoneWeight ||
             item.karat !== original.karat ||
             item.purity !== original.purity;
    });
  }

  /**
   * Handle karat change to validate purity range
   */
  onKaratChange(index: number, karat: string): void {
    // Revalidate purity when karat changes
    this.validatePurity(index);
  }

  /**
   * Get purity range for a given karat
   */
  getPurityRange(karat: string): { min: number; max: number } {
    const selected = this.karatOptions.find(k => k.value === karat);
    return selected ? { min: selected.min, max: selected.max } : { min: 0, max: 100 };
  }

  /**
   * Validate stone weight - must be less than 50% of gross weight
   */
  validateStoneWeight(index: number): void {
    const item = this.jewelleryItems[index];
    const fg = this.itemsFormArray.at(index) as FormGroup;
    
    if (!item || !fg) return;

    const grossWeight = item.grossWeight || 0;
    const stoneWeight = Number(fg.get('stoneWeight')?.value) || 0;
    const maxStoneWeight = grossWeight * 0.5;

    if (stoneWeight > 0 && grossWeight > 0) {
      if (stoneWeight >= maxStoneWeight) {
        this.itemErrors[index].stoneWeight = `Must be less than 50% of Gross Weight (max: ${(maxStoneWeight - 0.01).toFixed(2)}g)`;
        fg.get('stoneWeight')?.setErrors({ exceedsLimit: true });
      } else {
        this.itemErrors[index].stoneWeight = '';
        fg.get('stoneWeight')?.setErrors(null);
      }
    } else {
      this.itemErrors[index].stoneWeight = '';
      fg.get('stoneWeight')?.setErrors(null);
    }
  }

  /**
   * Validate purity - must be within range for selected karat
   */
  validatePurity(index: number): void {
    const item = this.jewelleryItems[index];
    const fg = this.itemsFormArray.at(index) as FormGroup;
    
    if (!item || !fg) return;

    const karat = fg.get('karat')?.value || '';
    const purity = Number(fg.get('purity')?.value) || 0;
    const { min, max } = this.getPurityRange(karat);

    if (purity > 0 && karat) {
      if (purity < min || purity > max) {
        this.itemErrors[index].purity = `Purity must be between ${min}% and ${max}% for ${karat} karat`;
        fg.get('purity')?.setErrors({ outOfRange: true });
      } else {
        this.itemErrors[index].purity = '';
        fg.get('purity')?.setErrors(null);
      }
    } else {
      this.itemErrors[index].purity = '';
      fg.get('purity')?.setErrors(null);
    }
  }

  /**
   * Get max stone weight for display hint
   */
  getMaxStoneWeight(index: number): number {
    const item = this.jewelleryItems[index];
    return item ? item.grossWeight * 0.5 : 0;
  }

  /**
   * Check if form has any validation errors
   */
  hasValidationErrors(): boolean {
    return this.itemErrors.some(err => err.stoneWeight !== '' || err.purity !== '');
  }

  /**
   * Check if update button should be disabled
   */
  isUpdateDisabled(): boolean {
    return !this.hasChanges || this.form.invalid || this.hasValidationErrors() || this.isValuationSaved;
  }
}
