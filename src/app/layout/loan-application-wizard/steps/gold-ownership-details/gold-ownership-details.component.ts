import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { PersonalDetailsService } from 'src/app/Services/PersonalDetailsService';

@Component({
  selector: 'app-gold-ownership-details',
  templateUrl: './gold-ownership-details.component.html',
  styleUrls: ['./gold-ownership-details.component.css']
})
export class GoldOwnershipDetailsComponent implements OnInit {
  @Input() loanApplicationId!: string;

  form!: FormGroup;
  isEditMode = false;
  goldOwnershipId: any;

  constructor(private fb: FormBuilder, private goldService: PersonalDetailsService) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      sourceOfJewellery: [''],
      yearOfPurchase: [''],
      storeNameAndLocation: [''],
      purposeOfPurchasing: ['']
    });

    if (this.loanApplicationId) {
      this.getGoldOwnershipDetails();
    }
  }

  getGoldOwnershipDetails(): void {
    this.goldService.getGoldOwnershipDetails(this.loanApplicationId).subscribe((res) => {
      if (res && res.data && res.data.length > 0) {
        this.isEditMode = true;
        const data = res.data[0];
        this.goldOwnershipId = data.id; // <-- Save ID here


        this.form.patchValue({
          sourceOfJewellery: data.sourceOfJewellery,
          yearOfPurchase: new Date(data.yearOfPurchase), // convert to Date
          storeNameAndLocation: data.storeNameAndLocation,
          purposeOfPurchasing: data.purposeOfPurchasing
        });
      }
    });
  }

  onSubmit(): void {
    const rawDate = this.form.value.yearOfPurchase;
    const formattedDate = rawDate.toISOString().split('T')[0]; // gives 'YYYY-MM-DD'

    const payload = {
      id: this.goldOwnershipId, // <-- Include ID in PUT payload
      loanAccountNo: this.loanApplicationId,
      sourceOfJewellery: this.form.value.sourceOfJewellery,
      yearOfPurchase: formattedDate,
      storeNameAndLocation: this.form.value.storeNameAndLocation,
      purposeOfPurchasing: this.form.value.purposeOfPurchasing
    };

    const request = this.isEditMode
      ? this.goldService.updateGoldOwnershipDetails(payload)
      : this.goldService.saveGoldOwnershipDetails(payload);

    request.subscribe(() => {
      alert('Gold Ownership Details saved successfully!');
    });
  }
}

