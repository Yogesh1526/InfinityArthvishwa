import { Component, Input, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { PersonalDetailsService } from 'src/app/Services/PersonalDetailsService';

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
  @Input() loanApplicationId!: string;

  form: FormGroup;
  jewelleryItems: JewelleryItem[] = [];
  uploadedImageUrl: string | null = null;

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

  constructor(private fb: FormBuilder, private apiService: PersonalDetailsService) {
    this.form = this.fb.group({
      items: this.fb.array([])
    });
  }

  get itemsFormArray(): FormArray {
    return this.form.get('items') as FormArray;
  }

  ngOnInit(): void {
    this.loadSecondValuation();
  }

  loadSecondValuation() {
    if (!this.loanApplicationId) {
      console.warn('loanApplicationId not provided');
      return;
    }
    this.apiService.getSecondValuationDetails(this.loanApplicationId).subscribe({
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
            }
          });

          this.itemsFormArray.push(fg);
        });
      },
      error: err => console.error('Error loading second valuation:', err)
    });
    this.loadFirstValuationImage();

  }

  loadFirstValuationImage() {
    this.apiService.getFirstValuationImage(this.loanApplicationId).subscribe({
      next: (imageBlob) => {
        const reader = new FileReader();
        reader.onload = () => {
          this.uploadedImageUrl = reader.result as string;
        };
        reader.readAsDataURL(imageBlob);
      },
      error: err => {
        console.error('Failed to load first valuation image:', err);
        this.uploadedImageUrl = null;
      }
    });
  }

  submitAll() {
    if (this.form.invalid) {
      alert('Please correct the form fields before submitting.');
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
  
    console.log('Submitting updated items:', updatedItems);
  
    this.apiService.updateSecondValuation(this.loanApplicationId, updatedItems).subscribe({
      next: res => {
        alert('Valuation updated successfully!');
        // Optionally refresh the data or update UI
        this.loadSecondValuation();
      },
      error: err => {
        console.error('Update failed:', err);
        alert('Failed to update valuation. Please try again.');
      }
    });
  }
  
  getTotal(field: keyof JewelleryItem): number {
    return this.jewelleryItems.reduce((acc, item) => acc + Number(item[field] || 0), 0);
  }

  getFormControl(index: number, field: string): FormControl {
    return this.itemsFormArray.at(index).get(field) as FormControl;
  }
}
