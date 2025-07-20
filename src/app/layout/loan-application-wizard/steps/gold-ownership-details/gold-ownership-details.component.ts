import { Component } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';

@Component({
  selector: 'app-gold-ownership-details',
  templateUrl: './gold-ownership-details.component.html',
  styleUrls: ['./gold-ownership-details.component.css']
})
export class GoldOwnershipDetailsComponent {

  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      sourceOfJewellery: [''],
      yearOfPurchase: [''],
      storeDetails: [''],
      purchasePurpose: ['']
    });
  }
  
}
