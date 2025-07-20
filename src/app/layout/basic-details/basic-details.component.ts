import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-basic-details',
  templateUrl: './basic-details.component.html',
  styleUrls: ['./basic-details.component.css']
})
export class BasicDetailsComponent implements OnInit {
  showAdvanceDetails = false;

  customerForm = this.fb.group({
    firstName: ['', Validators.required],
    middleName: [''],
    lastName: [''],
    dob: ['', Validators.required],
    gender: ['', Validators.required],
    maritalStatus: ['', Validators.required],
    mobileNumber: [
      '',
      [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)],
    ],
    altMobileNumber: [''],
    office: ['', Validators.required],
    email: ['', Validators.email],
    submittedDate: [new Date(), Validators.required],  // <-- initialize with Date directly

    // Advanced fields
    externalId: [''],
    clientType: [''],
  });

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    // Set default submitted date to today
    this.customerForm.patchValue({
      submittedDate: new Date(),
    });
  }

  toggleAdvanceDetails() {
    this.showAdvanceDetails = !this.showAdvanceDetails;

    if (!this.showAdvanceDetails) {
      // Clear advanced fields if toggled off
      this.customerForm.patchValue({
        externalId: '',
        clientType: '',
      });
    }
  }

  onSubmit() {
    if (this.customerForm.valid) {
      console.log('Form Data:', this.customerForm.value);
      alert('Customer added successfully!');
      this.customerForm.reset();
      this.showAdvanceDetails = false;
      // Reset submitted date to today after reset
      this.customerForm.patchValue({ submittedDate: new Date() });
    }
  }

  onReset() {
    this.customerForm.reset();
    this.showAdvanceDetails = false;
    this.customerForm.patchValue({ submittedDate: new Date() });
  }
}