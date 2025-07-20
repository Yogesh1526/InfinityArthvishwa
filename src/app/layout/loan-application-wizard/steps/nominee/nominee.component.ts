import { Component } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-nominee',
  templateUrl: './nominee.component.html',
  styleUrls: ['./nominee.component.css']
})
export class NomineeComponent {
  form: FormGroup;

  genderOptions = ['Male', 'Female', 'Other'];
  relationshipOptions = ['Spouse', 'Father', 'Mother', 'Brother', 'Sister', 'Friend', 'Other'];

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      selectNominee: ['', Validators.required],
      relationship: ['', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      gender: ['', Validators.required],
      mobileNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      dob: ['', Validators.required],
      sameAddressAsApplicant: [false],
      addressType: [''],
      houseNumber: [''],
      streetArea: [''],
      landmark: [''],
      city: [''],
      district: [''],
      state: [''],
      pincode: ['', [Validators.pattern(/^\d{6}$/)]],
      yearsAtResidence: ['']
    });
  }

  onSameAddressToggle(): void {
    if (this.form.value.sameAddressAsApplicant) {
      // Placeholder: replace with actual applicant's address values
      this.form.patchValue({
        addressType: 'Residential',
        houseNumber: '123',
        streetArea: 'Main Street',
        landmark: 'Near Park',
        city: 'YourCity',
        district: 'YourDistrict',
        state: 'YourState',
        pincode: '123456',
        yearsAtResidence: '5'
      });
    } else {
      this.form.patchValue({
        addressType: '',
        houseNumber: '',
        streetArea: '',
        landmark: '',
        city: '',
        district: '',
        state: '',
        pincode: '',
        yearsAtResidence: ''
      });
    }
  }
}