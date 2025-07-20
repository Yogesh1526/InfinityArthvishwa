import { Component } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';

@Component({
  selector: 'app-address-activity',
  templateUrl: './address-activity.component.html',
  styleUrls: ['./address-activity.component.css']
})
export class AddressActivityComponent {
  
    form: FormGroup;
  
    constructor(private fb: FormBuilder) {
      this.form = this.fb.group({
        residentialAddressOwnership: [''],
        addressLine1: [''],
        addressLine2: [''],
        landmark: [''],
        villageTownCity: [''],
        district: [''],
        state: [''],
        pincode: [''],
        country: [''],
        yearsAtResidence: ['']
      });
    }
}
