import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Location } from '@angular/common';
import { PersonalDetailsService } from 'src/app/Services/PersonalDetailsService';
import { ToastService } from 'src/app/Services/toast.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-basic-details',
  templateUrl: './basic-details.component.html',
  styleUrls: ['./basic-details.component.css']
})
export class BasicDetailsComponent implements OnInit {
  showAdvanceDetails = false;
  selectedOffice: string = '';
  customerId: string | null = null;


  offices = [
    { value: 'bhosari', viewValue: 'Bhosari' },
  ];

  customerForm = this.fb.group({
    firstName: ['', Validators.required],
    middleName: ['', Validators.required],
    lastName: ['', Validators.required],
    dob: ['', Validators.required],
    gender: ['', Validators.required],
    maritalStatus: ['', Validators.required],
    mobileNumber: [
      '',
      [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)],
    ],
    altMobileNumber: [''],
    office: ['bhosari', Validators.required],  // default selected value here
    email: ['', [Validators.required, Validators.email]],
    submittedDate: [new Date(), Validators.required],
    externalId: [''],
    clientType: [''],

    // Hardcoded fields added to form
    education: ['Postgraduate'],
    preferredLanguage: ['Marathi'],
    religion: ['Hindu'],
    riskCategory: ['Medium'],
    nationality: ['Indian']
  });
  isEditMode = false;
  id: any;

  constructor(
    private fb: FormBuilder,
    private location: Location,
    private apiService: PersonalDetailsService,
    private toast: ToastService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.customerId = params.get('id');
      if (this.customerId) {
        this.isEditMode = true;
        this.loadCustomerForEdit(this.customerId);
      } else {
        this.isEditMode = false;
        this.customerForm.patchValue({ submittedDate: new Date() });
      }
    });
    // this.customerForm.patchValue({
    //   submittedDate: new Date(),
    // });
  }

  goBack(): void {
    this.location.back();
  }

  toggleAdvanceDetails(): void {
    this.showAdvanceDetails = !this.showAdvanceDetails;

    if (!this.showAdvanceDetails) {
      this.customerForm.patchValue({
        externalId: '',
        clientType: '',
      });
    }
  }

  loadCustomerForEdit(id: string) {
    this.apiService.getById(id).subscribe({
      next: (res) => {
        const data = res.data;
        if (data) {
          // Patch form with existing data
          this.customerForm.patchValue({
            firstName: data.firstName,
            middleName: data.middleName,
            lastName: data.lastName,
            dob: data.dateOfBirth,
            gender: data.gender,
            maritalStatus: data.maritalStatus,
            mobileNumber: data.mobileNumber,
            altMobileNumber: data.alternateMobileNumber,
            office: data.office || 'bhosari',
            email: data.email,
            submittedDate: data.submittedDate ? new Date(data.submittedDate) : new Date(),
            externalId: data.externalId,
            clientType: data.clientType,
            education: data.education,
            preferredLanguage: data.preferredLanguage,
            religion: data.religion,
            riskCategory: data.riskCategory,
            nationality: data.nationality
          });
 
          this.id = data.id
          // Show advanced details if externalId or clientType exists
          this.showAdvanceDetails = !!(data.externalId || data.clientType);
        }
      },
      error: err => {
        this.toast.showError('Failed to load customer data');
        console.error(err);
      }
    });
  }
  
  // onSubmit(): void {
  //   this.customerForm.markAllAsTouched(); // Show all validation messages

  //   if (this.customerForm.valid) {
  //     const form = this.customerForm.value;

  //     const body = {
  //       firstName: form.firstName,
  //       middleName: form.middleName,
  //       lastName: form.lastName,
  //       mobileNumber: form.mobileNumber,
  //       alternateMobileNumber: form.altMobileNumber,
  //       gender: form.gender,
  //       email: form.email,
  //       dateOfBirth: form.dob,
  //       education: form.education,
  //       preferredLanguage: form.preferredLanguage,
  //       religion: form.religion,
  //       riskCategory: form.riskCategory,
  //       nationality: form.nationality
  //     };

  //     this.apiService.create(body).subscribe({
  //       next: (res) => {
  //         if (res?.code === 200 || res?.success) {
  //           this.toast.showSuccess('Customer saved successfully!');
  //           this.customerForm.reset();
  //           this.customerForm.patchValue({ submittedDate: new Date() });
  //         } else {
  //           this.toast.showError(res?.message || 'Unexpected error occurred.');
  //         }
  //       },
  //       error: (err) => {
  //         const errorMsg = err?.error?.message || 'Something went wrong while saving the customer.';
  //         this.toast.showError(errorMsg);
  //         console.error(err);
  //       }
  //     });
  //   } else {
  //     this.toast.showWarning('Please fill in all required fields correctly.');
  //   }
  // }

  onSubmit(): void {
    this.customerForm.markAllAsTouched();
  
    if (!this.customerForm.valid) {
      this.toast.showWarning('Please fill in all required fields correctly.');
      return;
    }
  
    const form = this.customerForm.value;
  
    // Build base body
    const body: any = {
      firstName: form.firstName,
      middleName: form.middleName,
      lastName: form.lastName,
      mobileNumber: form.mobileNumber,
      alternateMobileNumber: form.altMobileNumber,
      gender: form.gender,
      email: form.email,
      dateOfBirth: form.dob,
      education: form.education,
      preferredLanguage: form.preferredLanguage,
      religion: form.religion,
      riskCategory: form.riskCategory,
      nationality: form.nationality,
      externalId: form.externalId,
      clientType: form.clientType,
      submittedDate: form.submittedDate,
      office: form.office,
      maritalStatus: form.maritalStatus
    };
  
    if (this.id && this.id !== '0') {
      body.id = Number(this.id); // id must be number for update
      body.loanAccountNo = this.customerId; // must exist in form
  
      this.apiService.update(body).subscribe({
        next: (res: any) => {
          if (res?.code === 200 || res?.success) {
            this.toast.showSuccess('Customer updated successfully!');
            this.router.navigate(['/loan-wizard/', this.customerId]);
          } else {
            this.toast.showError(res?.message || 'Update failed');
          }
        },
        error: (err) => {
          this.toast.showError('Something went wrong while updating the customer.');
          console.error(err);
        }
      });
  
    } else {
      // It's a create
      this.apiService.create(body).subscribe({
        next: (res: any) => {
          if (res?.code === 200 || res?.success) {
            this.toast.showSuccess('Customer saved successfully!');
            this.router.navigate(['/loan-info-details/']);

            this.customerForm.reset();
            this.customerForm.patchValue({ submittedDate: new Date() });
          } else {
            this.toast.showError(res?.message || 'Unexpected error occurred.');
          }
        },
        error: (err) => {
          this.toast.showError('Error saving customer');
          console.error(err);
        }
      });
    }
  }
  
  
  

  onReset(): void {
    this.customerForm.reset();
    this.showAdvanceDetails = false;
    this.customerForm.patchValue({ submittedDate: new Date() });
    this.toast.showInfo('Form has been reset.');
  }
}
