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

        apiItems.forEach((item: any) => {
          const gross = Number(item.grossWeight) || 0;
          const stone = Number(item.stoneWeight) || 0;
          const purity = Number(item.purity) || 0;
          const netWeight = gross - stone;
          const netPurityWeight = (netWeight * purity) / 100;

          this.jewelleryItems.push({
            id: item.id,
            jewelleryName: item.jewelleryName,
            quantity: Number(item.quantity) || 0,
            grossWeight: gross,
            stoneWeight: stone,
            netWeight,
            karat: item.karat,
            purity,
            netPurityWeight
          });

          const fg = this.fb.group({
            stoneWeight: [stone, Validators.required],
            purity: [purity, Validators.required]
          });

          fg.valueChanges.subscribe(val => {
            const idx = this.itemsFormArray.controls.indexOf(fg);
            if (idx >= 0) {
              const current = this.jewelleryItems[idx];
              const newStone = Number(val.stoneWeight) || 0;
              const newPurity = Number(val.purity) || 0;
              const newNetWeight = current.grossWeight - newStone;
              const newNetPurityWeight = (newNetWeight * newPurity) / 100;

              this.jewelleryItems[idx] = {
                ...current,
                stoneWeight: newStone,
                purity: newPurity,
                netWeight: newNetWeight,
                netPurityWeight: newNetPurityWeight
              };
              
              // Recalculate totals
              this.recalculateTotals();
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
    if (this.form.invalid) {
      this.toastService.showWarning('Please correct the form fields before submitting.');
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
        karat: item.karat,
        purity: Number(formVal.purity)
      };
    });
  
    this.apiService.updateSecondValuation(this.customerId, accountNumber, updatedItems).subscribe({
      next: res => {
        this.toastService.showSuccess('Second valuation updated successfully!');
        this.isValuationSaved = true;
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
}
