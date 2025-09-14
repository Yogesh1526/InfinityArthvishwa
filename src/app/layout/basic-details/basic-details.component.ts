import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Location } from '@angular/common';
import { PersonalDetailsService } from 'src/app/Services/PersonalDetailsService';


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
    externalId: [''],
    clientType: [''],
  });

  constructor(private fb: FormBuilder,private location: Location, private apiService : PersonalDetailsService) {}

  ngOnInit(): void {
    // Set default submitted date to today
    this.customerForm.patchValue({
      submittedDate: new Date(),
    });
  }

  goBack(): void {
    this.location.back();
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

  onSubmit(): void {
    if (this.customerForm.valid) {
      const form = this.customerForm.value;
  
      const body = {
        firstName: form.firstName,
        middleName: form.middleName,
        lastName: form.lastName,
        mobileNumber: form.mobileNumber,
        alternateMobileNumber: form.altMobileNumber,
        gender: form.gender,
        email: form.email,
        dateOfBirth: form.dob,
        education: 'Postgraduate',
        preferredLanguage: 'Marathi',
        religion: 'Hindu',
        riskCategory: 'Medium',
        nationality: 'Indian'
      };
  
      this.apiService.create(body).subscribe({
        next: (res) => {
          alert('Customer saved successfully!');
          this.customerForm.reset();
        },
        error: (err) => {
          alert('Something went wrong!');
          console.error(err);
        }
      });
    }
  }
  

  onReset() {
    this.customerForm.reset();
    this.showAdvanceDetails = false;
    this.customerForm.patchValue({ submittedDate: new Date() });
  }
}