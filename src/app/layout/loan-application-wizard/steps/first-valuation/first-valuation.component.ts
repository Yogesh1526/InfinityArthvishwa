import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatTableDataSource } from '@angular/material/table';
import { PersonalDetailsService } from 'src/app/Services/PersonalDetailsService';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-first-valuation',
  templateUrl: './first-valuation.component.html',
  styleUrls: ['./first-valuation.component.css']
})
export class FirstValuationComponent implements OnInit {
  @Input() loanApplicationId!: string;

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

  constructor(private fb: FormBuilder, private apiService : PersonalDetailsService) {}

  ngOnInit(): void {
    this.loadInitialValuationData();
    this.registerFormListeners();

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
    const loanId = this.loanApplicationId;
  
    // Call both APIs in parallel
    forkJoin({
      valuation: this.apiService.getFirstValuationDetails(loanId),
      image: this.apiService.getFirstValuationImage(loanId)
    }).subscribe({
      next: ({ valuation, image }) => {

        if (valuation?.data?.jewelleryItems?.length > 0) {
          this.jewelleryList = valuation.data.jewelleryItems;
          this.dataSource.data = [...this.jewelleryList];  // trigger table refresh
        }
        
  
        if (image) {
          const reader = new FileReader();
          reader.onload = () => {
            this.uploadedImageUrl = reader.result as string;
          };
          reader.readAsDataURL(image);
        }
      },
      error: (err) => {
        console.error('Failed to fetch valuation/image:', err);
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
      alert('No jewellery items to submit!');
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
  
    this.apiService.saveFirstValuationDetails(this.loanApplicationId,payload).subscribe({
      next: () => {
        alert('Jewellery submitted!');
        this.jewelleryList = [];
        this.dataSource.data = [];
      },
      error: (err) => {
        console.error('Submit failed', err);
        alert('Error submitting data!');
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
  
    this.apiService.uploadFirstValuationImage(this.loanApplicationId, file).subscribe({
      next: () => {
        // Preview the uploaded image using FileReader
        const reader = new FileReader();
        reader.onload = () => {
          this.uploadedImageUrl = reader.result as string;
        };
        reader.readAsDataURL(file);
      },
      error: (err) => {
        console.error('Image upload failed', err);
        alert('Image upload failed.');
      }
    });
  }

}  
