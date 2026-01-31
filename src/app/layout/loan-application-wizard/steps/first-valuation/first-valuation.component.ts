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

  jewelleryTypeOptions = [
    { id: 603, name: "Necklace with stone", position: 0, description: "Necklace with stone", isActive: true, codeScore: 0, mandatory: false },
    { id: 310, name: "Nose ring", position: 1, description: "Nose ring", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 286, name: "Karimani Chain", position: 1, description: "Karimani Chain", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 333, name: "KASIMALAI", position: 1, description: "KASIMALAI", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 321, name: "Kumkum Bowl", position: 1, description: "Kumkum Bowl", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 334, name: "LOCKET", position: 1, description: "LOCKET", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 340, name: "LOCKET WITH STONE", position: 1, description: "LOCKET WITH STONE", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 308, name: "Maala", position: 1, description: "Maala", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 309, name: "Maatal", position: 1, description: "Maatal", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 343, name: "MATTI", position: 1, description: "MATTI", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 335, name: "NECKLACE", position: 1, description: "NECKLACE", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 337, name: "NECKLACE WITH STONES", position: 1, description: "NECKLACE WITH STONES", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 336, name: "NECKLACES", position: 1, description: "NECKLACES", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 307, name: "Kada", position: 1, description: "Kada", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 311, name: "Nose stud", position: 1, description: "Nose stud", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 313, name: "Ring", position: 1, description: "Ring", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 314, name: "Ring with Chain", position: 1, description: "Ring with Chain", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 339, name: "RING WITH STONE", position: 1, description: "RING WITH STONE", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 315, name: "Show Chain", position: 1, description: "Show Chain", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 316, name: "Step Chain", position: 1, description: "Step Chain", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 331, name: "STUDS", position: 1, description: "STUDS", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 332, name: "STUDS WITH STONE", position: 1, description: "STUDS WITH STONE", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 317, name: "Thala", position: 1, description: "Thala", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 319, name: "Vanki", position: 1, description: "Vanki", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 338, name: "WAIST CHAIN", position: 1, description: "WAIST CHAIN", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 320, name: "Waist chain (Ottiyanam)", position: 1, description: "Waist chain (Ottiyanam)", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 299, name: "Chain", position: 1, description: "Chain", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 323, name: "ANKLET", position: 1, description: "ANKLET", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 288, name: "Anklet (Koluse)", position: 1, description: "Anklet (Koluse)", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 292, name: "Aranjanam", position: 1, description: "Aranjanam", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 293, name: "Armlet", position: 1, description: "Armlet", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 294, name: "Baby Bangle", position: 1, description: "Baby Bangle", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 295, name: "Baby Ring", position: 1, description: "Baby Ring", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 296, name: "Bangle", position: 1, description: "Bangle", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 325, name: "BANGLE WITH STONE", position: 1, description: "BANGLE WITH STONE", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 324, name: "BANGLES", position: 1, description: "BANGLES", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 297, name: "Bracelet", position: 1, description: "Bracelet", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 327, name: "BRACELET WITH STONE", position: 1, description: "BRACELET WITH STONE", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 298, name: "Broad Bangle", position: 1, description: "Broad Bangle", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 287, name: "Aaram", position: 1, description: "Aaram", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 300, name: "Chain with Locket", position: 1, description: "Chain with Locket", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 301, name: "Chain with Pendant", position: 1, description: "Chain with Pendant", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 328, name: "CHAIN WITH STONE", position: 1, description: "CHAIN WITH STONE", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 341, name: "CHAINS", position: 1, description: "CHAINS", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 302, name: "Choker", position: 1, description: "Choker", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 303, name: "Chutti", position: 1, description: "Chutti", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 304, name: "Ear Drops", position: 1, description: "Ear Drops", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 329, name: "EAR RING", position: 1, description: "EAR RING", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 330, name: "EAR RING WITH STONE", position: 1, description: "EAR RING WITH STONE", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 305, name: "Ear Stud", position: 1, description: "Ear Stud", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 322, name: "Ear stud with Jimikk", position: 1, description: "Ear stud with Jimikk", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" },
    { id: 306, name: "Jimmiki", position: 1, description: "Jimmiki", isActive: true, codeScore: 0, mandatory: false, systemIdentifier: "IND" }
  ];
  
  purityRange = { min: 0, max: 0 };
  purityError = '';
  stoneWeightError = '';

  get grossWeightValue(): number {
    return Number(this.jewelleryForm.get('grossWeight')?.value) || 0;
  }

  get maxStoneWeightHint(): number {
    return this.grossWeightValue * 0.9;
  }

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
    jewelleryName: ['', Validators.required],
    quantity: [0, [Validators.required, Validators.min(1)]],
    grossWeight: [0, [Validators.required, Validators.min(0.01)]],
    stoneWeight: [0, [Validators.required, Validators.min(0)]],
    netWeight: [0],
    karat: ['', Validators.required],
    purity: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    netPurityWeight: [0]
  });

  jewelleryList: any[] = [];
  dataSource = new MatTableDataSource<any>(this.jewelleryList);
  isValuationSaved = false;
  showImageUploadPrompt = false;

  // Image properties for submission
  selectedImageFile: File | null = null;
  selectedImagePreview: string | null = null;

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
  
    this.jewelleryForm.get('grossWeight')?.valueChanges.subscribe(() => {
      this.validateStoneWeight();
      this.calculateDerivedFields();
    });
    this.jewelleryForm.get('stoneWeight')?.valueChanges.subscribe(() => {
      this.validateStoneWeight();
      this.calculateDerivedFields();
    });
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

  validateStoneWeight() {
    const grossWeight = this.jewelleryForm.get('grossWeight')?.value as number || 0;
    const stoneWeight = this.jewelleryForm.get('stoneWeight')?.value as number || 0;
    const maxStoneWeight = grossWeight * 0.9; // 90% of gross weight (cross weight)

    if (stoneWeight > 0 && grossWeight > 0) {
      if (stoneWeight > maxStoneWeight) {
        this.stoneWeightError = `Stone Weight must be 90% or less of Gross Weight (max: ${maxStoneWeight.toFixed(2)}g)`;
        this.jewelleryForm.get('stoneWeight')?.setErrors({ exceedsLimit: true });
      } else {
        this.stoneWeightError = '';
        this.jewelleryForm.get('stoneWeight')?.setErrors(null);
      }
    } else {
      this.stoneWeightError = '';
      this.jewelleryForm.get('stoneWeight')?.setErrors(null);
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
          // Calculate netPurityWeight for each item since API doesn't return it per item
          this.jewelleryList = valuation.data.jewelleryItems.map((item: any) => {
            const grossWeight = Number(item.grossWeight) || 0;
            const stoneWeight = Number(item.stoneWeight) || 0;
            const purity = Number(item.purity) || 0;
            const netWeight = Number(item.netWeight) || (grossWeight - stoneWeight);
            const netPurityWeight = (netWeight * purity) / 100;
            
            return {
              ...item,
              netWeight,
              netPurityWeight
            };
          });
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
    this.jewelleryForm.markAllAsTouched();
    
    if (this.jewelleryForm.invalid) {
      this.toastService.showWarning('Please fill all required fields correctly.');
      return;
    }

    // Additional validation for stone weight and purity
    if (this.purityError || this.stoneWeightError) {
      this.toastService.showWarning('Please correct the validation errors before adding the item.');
      return;
    }

    const item = { ...this.jewelleryForm.value };
    this.jewelleryList.push(item);
    this.dataSource.data = [...this.jewelleryList]; // trigger refresh
    this.jewelleryForm.reset();
    this.purityError = '';
    this.stoneWeightError = '';
    this.purityRange = { min: 0, max: 0 };
  }

  /**
   * Select image before submission
   */
  selectImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.toastService.showWarning('Please select a valid image file.');
      input.value = '';
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      this.toastService.showWarning('Image size should not exceed 10MB.');
      input.value = '';
      return;
    }

    this.selectedImageFile = file;
    
    // Preview the selected image
    const reader = new FileReader();
    reader.onload = () => {
      this.selectedImagePreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  /**
   * Remove selected image
   */
  removeSelectedImage(): void {
    this.selectedImageFile = null;
    this.selectedImagePreview = null;
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

    let accountNumber = this.loanAccountNumber;
    if (!accountNumber && this.loanApplicationId && (this.loanApplicationId.startsWith('AP') || this.loanApplicationId.startsWith('GL'))) {
      accountNumber = this.loanApplicationId;
    }
    if (!accountNumber) {
      this.toastService.showError('Loan Account Number is required. Please complete the gold ownership step first.');
      return;
    }

    // Validate all items in the list
    const hasInvalidItems = this.jewelleryList.some(item => {
      return !item.jewelleryName || 
             !item.quantity || item.quantity < 1 ||
             !item.grossWeight || item.grossWeight <= 0 ||
             item.stoneWeight < 0 ||
             !item.karat ||
             !item.purity || item.purity <= 0 || item.purity > 100;
    });

    if (hasInvalidItems) {
      this.toastService.showWarning('Please ensure all jewellery items have valid data before submitting.');
      return;
    }
  
    // Prepare payload in correct format
    const items = this.jewelleryList.map((item) => ({
      jewelleryName: item.jewelleryName,
      quantity: item.quantity,
      grossWeight: item.grossWeight,
      stoneWeight: item.stoneWeight,
      karat: item.karat,
      purity: item.purity
    }));
  
    // Send items and image together in one API call - pass loanAccountNumber in URL param
    this.apiService.saveFirstValuationDetails(this.customerId, accountNumber, items, this.selectedImageFile || undefined).subscribe({
      next: (response: any) => {
        // Extract loan account number from response if available
        if (response && response.data && response.data.loanAccountNumber) {
          this.loanAccountNumber = response.data.loanAccountNumber;
          if (this.customerId && this.loanAccountNumber) {
            localStorage.setItem(`loanAccountNumber_${this.customerId}`, this.loanAccountNumber);
          }
        }
        
        if (this.selectedImageFile) {
          this.toastService.showSuccess('First valuation with image submitted successfully!');
          this.uploadedImageUrl = this.selectedImagePreview;
          this.showImageUploadPrompt = false;
        } else {
          this.toastService.showSuccess('First valuation submitted successfully! You can upload the image later.');
          this.showImageUploadPrompt = true;
        }
        
        this.isValuationSaved = true;
        this.stepCompleted.emit();
        
        // Clear selected image after successful submission
        this.selectedImageFile = null;
        this.selectedImagePreview = null;
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

  /**
   * Validate step before allowing navigation
   * Returns true if valuation is saved, false otherwise
   */
  validateStep(): boolean {
    // If valuation is already saved, allow navigation
    if (this.isValuationSaved) {
      return true;
    }

    // If there are items in the list but not saved, show warning
    if (this.jewelleryList.length > 0) {
      this.toastService.showWarning('Please submit the first valuation before proceeding to the next step.');
      return false;
    }

    // If no items added, show warning
    this.toastService.showWarning('Please add and submit at least one jewellery item before proceeding.');
    return false;
  }
   
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
