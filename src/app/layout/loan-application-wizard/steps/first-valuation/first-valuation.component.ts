import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatTableDataSource } from '@angular/material/table';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-first-valuation',
  templateUrl: './first-valuation.component.html',
  styleUrls: ['./first-valuation.component.css']
})
export class FirstValuationComponent implements OnInit {
  @Input() customerId!: string;
  @Input() loanApplicationId!: string;

  loanAccountNumber: string | null = null;
  karatOptions = [
    { value: '22HM', label: '22HM', min: 98, max: 100 },
    { value: '22', label: '22', min: 95, max: 97 },
    { value: '21', label: '21', min: 88, max: 94 },
    { value: '20', label: '20', min: 81, max: 87 },
    { value: '18', label: '18', min: 75, max: 80 }
  ];
  
  purityRange = { min: 0, max: 0 };
  purityError = '';

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

  jewelleryForm = this.fb.group({
    jewelleryName: [''],
    quantity: [0],
    grossWeight: [0],
    stoneWeight: [0],
    netWeight: [0],
    karat: [''],
    purity: [0],
    netPurityWeight: [0]
  });

  jewelleryList: any[] = [];
  dataSource = new MatTableDataSource<any>(this.jewelleryList);
  isValuationSaved = false;
  showImageUploadPrompt = false;

  @Output() stepCompleted = new EventEmitter<void>();

  constructor(
    private fb: FormBuilder,
    private apiService: PersonalDetailsService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    // Load stored loanAccountNumber from localStorage
    this.loadStoredLoanAccountNumber();
    this.loadInitialValuationData();
    this.registerFormListeners();
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

  registerFormListeners() {
    this.jewelleryForm.get('karat')?.valueChanges.subscribe(val => {
      const selected = this.karatOptions.find(k => k.value === val);
      if (selected) {
        this.purityRange = { min: selected.min, max: selected.max };
      }
      this.validatePurity(); // re-validate if purity already entered
    });
  
    this.jewelleryForm.get('purity')?.valueChanges.subscribe(() => this.validatePurity());
  
    this.jewelleryForm.get('grossWeight')?.valueChanges.subscribe(() => this.calculateDerivedFields());
    this.jewelleryForm.get('stoneWeight')?.valueChanges.subscribe(() => this.calculateDerivedFields());
    this.jewelleryForm.get('netWeight')?.valueChanges.subscribe(() => this.calculateNetPurityWeight());
    this.jewelleryForm.get('purity')?.valueChanges.subscribe(() => this.calculateNetPurityWeight());
  }
  
  validatePurity() {
    const purity = this.jewelleryForm.get('purity')?.value as number;
    const { min, max } = this.purityRange;
  
    if (purity != null && purity >= 0) {
      if (purity < min || purity > max) {
        this.purityError = `Purity must be between ${min}% and ${max}% for selected karat.`;
        this.jewelleryForm.get('purity')?.setErrors({ outOfRange: true });
      } else {
        this.purityError = '';
        this.jewelleryForm.get('purity')?.setErrors(null);
      }
    } else {
      this.purityError = '';
      this.jewelleryForm.get('purity')?.setErrors(null);
    }
  }
  
  
  calculateDerivedFields() {
    const gross = this.jewelleryForm.get('grossWeight')?.value || 0;
    const stone = this.jewelleryForm.get('stoneWeight')?.value || 0;
    const net = gross - stone;
    this.jewelleryForm.patchValue({ netWeight: net }, { emitEvent: false });
    this.calculateNetPurityWeight();
  }
  
  calculateNetPurityWeight() {
    const net = this.jewelleryForm.get('netWeight')?.value || 0;
    const purity = this.jewelleryForm.get('purity')?.value || 0;
    const netPurity = (net * purity) / 100;
    this.jewelleryForm.patchValue({ netPurityWeight: netPurity }, { emitEvent: false });
  }

  loadInitialValuationData(): void {
    if (!this.customerId) {
      return;
    }

    // Use stored loanAccountNumber or fallback to loanApplicationId
    const accountNumber = this.loanAccountNumber || this.loanApplicationId;
    if (!accountNumber) {
      return;
    }
  
    // Only load valuation data first - don't call image API yet
    this.apiService.getFirstValuationDetails(this.customerId, accountNumber).pipe(
      catchError(err => {
        // If 404 or no data, return empty data instead of error
        if (err.status === 404 || err.status === 0) {
          return of({ data: { jewelleryItems: [] } });
        }
        return of({ data: { jewelleryItems: [] } });
      })
    ).subscribe({
      next: (valuation: any) => {
        if (valuation?.data?.jewelleryItems?.length > 0) {
          this.jewelleryList = valuation.data.jewelleryItems;
          this.dataSource.data = [...this.jewelleryList];
          this.isValuationSaved = true;
          
          // Only load image if valuation data exists
          this.loadValuationImage();
        } else {
          this.isValuationSaved = false;
          this.showImageUploadPrompt = false;
        }
      },
      error: (err) => {
        // Silently handle - no data means form is empty, which is fine
        this.isValuationSaved = false;
        this.showImageUploadPrompt = false;
      }
    });
  }

  loadValuationImage(): void {
    if (!this.customerId) {
      return;
    }

    // Use stored loanAccountNumber or fallback to loanApplicationId
    const accountNumber = this.loanAccountNumber || this.loanApplicationId;
    if (!accountNumber) {
      return;
    }

    this.apiService.getFirstValuationImage(this.customerId, accountNumber).pipe(
      catchError(() => of(null)) // Return null if image doesn't exist
    ).subscribe({
      next: (image: any) => {
        if (image) {
          const reader = new FileReader();
          reader.onload = () => {
            this.uploadedImageUrl = reader.result as string;
            this.showImageUploadPrompt = false;
          };
          reader.readAsDataURL(image);
        } else {
          // Image doesn't exist, show prompt to upload
          this.showImageUploadPrompt = true;
        }
      },
      error: () => {
        // Image doesn't exist or failed to load, show prompt
        this.showImageUploadPrompt = true;
      }
    });
  }

  addJewellery() {
    if (this.jewelleryForm.valid) {
      const item = { ...this.jewelleryForm.value };
      this.jewelleryList.push(item);
      this.dataSource.data = [...this.jewelleryList]; // trigger refresh
      this.jewelleryForm.reset();
    }
  }

  submitAll() {
    if (this.jewelleryList.length === 0) {
      this.toastService.showWarning('Please add at least one jewellery item before submitting.');
      return;
    }

    if (!this.customerId) {
      this.toastService.showError('Customer ID is required.');
      return;
    }
  
    // Prepare payload in correct format
    const payload = this.jewelleryList.map((item) => ({
      jewelleryName: item.jewelleryName,
      quantity: item.quantity,
      grossWeight: item.grossWeight,
      stoneWeight: item.stoneWeight,
      karat: item.karat,
      purity: item.purity
    }));
  
    this.apiService.saveFirstValuationDetails(this.customerId, payload).subscribe({
      next: (response: any) => {
        // Extract loan account number from response if available
        if (response && response.data && response.data.loanAccountNumber) {
          this.loanAccountNumber = response.data.loanAccountNumber;
          if (this.customerId && this.loanAccountNumber) {
            localStorage.setItem(`loanAccountNumber_${this.customerId}`, this.loanAccountNumber);
          }
        }
        this.toastService.showSuccess('First valuation submitted successfully! Please upload the consolidated image.');
        this.isValuationSaved = true;
        this.showImageUploadPrompt = true; // Highlight image upload button
        this.stepCompleted.emit();
        // Load image if it exists, otherwise show prompt
        this.loadValuationImage();
      },
      error: (err) => {
        const errorMsg = err?.error?.message || 'Failed to submit first valuation. Please try again.';
        this.toastService.showError(errorMsg);
      }
    });
  }

  getTotal(field: string): number {
    return this.jewelleryList.reduce((sum, item) => sum + (Number(item[field]) || 0), 0);
  }

  uploadedImageUrl: string | null = null;
   
  uploadImage(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
  
    const file = input.files[0];

    // Check if valuation is saved before allowing image upload
    if (!this.isValuationSaved) {
      this.toastService.showWarning('Please save the first valuation before uploading the image.');
      input.value = ''; // Reset input
      return;
    }

    if (!this.customerId) {
      this.toastService.showError('Customer ID is required.');
      input.value = '';
      return;
    }

    // Use stored loanAccountNumber or fallback to loanApplicationId
    const accountNumber = this.loanAccountNumber || this.loanApplicationId;
    if (!accountNumber) {
      this.toastService.showError('Loan Account Number is required. Please save gold ownership first.');
      input.value = '';
      return;
    }
  
    this.apiService.uploadFirstValuationImage(this.customerId, accountNumber, file).subscribe({
      next: () => {
        this.toastService.showSuccess('Image uploaded successfully!');
        this.showImageUploadPrompt = false; // Hide prompt after successful upload
        // Preview the uploaded image using FileReader
        const reader = new FileReader();
        reader.onload = () => {
          this.uploadedImageUrl = reader.result as string;
        };
        reader.readAsDataURL(file);
      },
      error: (err) => {
        const errorMsg = err?.error?.message || 'Failed to upload image. Please try again.';
        this.toastService.showError(errorMsg);
        input.value = ''; // Reset input on error
      }
    });
  }

}  
