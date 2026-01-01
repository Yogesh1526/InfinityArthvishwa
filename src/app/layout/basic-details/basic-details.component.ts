import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Location } from '@angular/common';

import { ActivatedRoute, Router } from '@angular/router';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-basic-details',
  templateUrl: './basic-details.component.html',
  styleUrls: ['./basic-details.component.css']
})
export class BasicDetailsComponent implements OnInit {
  showAdvanceDetails = false;
  selectedOffice: string = '';
  customerId: string | null = null;
  loanAccountNo: string | null = null;
  customer: any = null;

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
        // Handle response where data can be an array or object
        let data = res.data;
        
        // If data is an array, get the first element or find by id
        if (Array.isArray(data)) {
          if (data.length > 0) {
            // Try to find customer by id, otherwise use first element
            data = data.find((c: any) => c.id === Number(id) || c.customerId === id) || data[0];
          } else {
            this.toast.showError('Customer not found');
            return;
          }
        }
        
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
 
          this.id = data.id;
          // Store full customer data for update
          this.customer = data;
          // Store loanAccountNo for navigation (handle both tempLoanAccountNumber and loanAccountNo)
          this.loanAccountNo = data.tempLoanAccountNumber || data.loanAccountNo || null;
          // Store customerId for update API
          this.customerId = data.customerId || id;
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
      // Build complete update body with all required fields
      body.id = Number(this.id);
      body.customerId = this.customerId || null;
      // Handle both tempLoanAccountNumber and loanAccountNo
      body.tempLoanAccountNumber = this.customer?.tempLoanAccountNumber || this.loanAccountNo || null;
      body.loanAccountNo = this.customer?.tempLoanAccountNumber || this.loanAccountNo || null;
      body.occupation = this.customer?.occupation || null;
      body.numbersOfYearsInCurrentJob = this.customer?.numbersOfYearsInCurrentJob || null;
      body.income = this.customer?.income || null;
      body.loanPurpose = this.customer?.loanPurpose || null;
      body.otp = this.customer?.otp || null;
      body.otpExpiry = this.customer?.otpExpiry || null;
      body.applicationStatus = this.customer?.applicationStatus || null;
      body.note = this.customer?.note || null;
      body.customerSource = this.customer?.customerSource || null;
      
      // Format submittedDate as string if it's a Date object
      if (body.submittedDate instanceof Date) {
        body.submittedDate = body.submittedDate.toISOString().split('T')[0];
      }
      
      // Format dateOfBirth as string if it's a Date object
      if (body.dateOfBirth instanceof Date) {
        body.dateOfBirth = body.dateOfBirth.toISOString().split('T')[0];
      }
  
      this.apiService.update(body).subscribe({
        next: (res: any) => {
          if (res?.code === 200 || res?.success) {
            this.toast.showSuccess('Customer updated successfully!');
            // Navigate to customer profile after successful update
            if (this.customerId && this.customerId !== 'N/A') {
              this.router.navigate(['/customer-profile', this.customerId]);
            } else {
              this.toast.showError('Customer ID is not available');
            }
          } else {
            this.toast.showError(res?.message || 'Update failed');
          }
        },
        error: (err) => {
          const errorMsg = err?.error?.message || 'Something went wrong while updating the customer.';
          this.toast.showError(errorMsg);
          console.error(err);
        }
      });
  
    } else {
      // It's a create
      // Format dates as strings if they are Date objects
      if (body.submittedDate instanceof Date) {
        body.submittedDate = body.submittedDate.toISOString().split('T')[0];
      }
      if (body.dateOfBirth instanceof Date) {
        body.dateOfBirth = body.dateOfBirth.toISOString().split('T')[0];
      }
      
      this.apiService.create(body).subscribe({
        next: (res: any) => {
          if (res?.code === 200 || res?.success) {
            this.toast.showSuccess('Customer saved successfully!');
            let customerId = null;
            if (res?.data) {
              customerId = res.data.customerId || res.data.id || res.data.customer?.customerId || res.data.customer?.id;
            } else if (res?.customerId) {
              customerId = res.customerId;
            } else if (res?.id) {
              customerId = res.id;
            }
            
            if (!customerId) {
              console.log('Customer ID not in response, attempting to fetch by mobile number...', res);
              const mobileNumber = body.mobileNumber;
              if (mobileNumber) {
                this.apiService.getAllCustomerDetails().subscribe({
                  next: (allCustomersRes: any) => {
                    const customers = allCustomersRes?.data || [];
                    const newCustomer = customers.find((c: any) => 
                      c.mobileNumber === mobileNumber || 
                      c.mobileNumber === String(mobileNumber)
                    );
                    
                    if (newCustomer && (newCustomer.customerId || newCustomer.id)) {
                      const foundId = newCustomer.customerId || newCustomer.id;
                      this.router.navigate(['/customer-profile', String(foundId)]);
                    } else {
                      this.toast.showInfo('Customer created. Please check the customer list.');
                      this.router.navigate(['/loan-info-details']);
                    }
                  },
                  error: () => {
                    this.toast.showInfo('Customer created. Please check the customer list.');
                    this.router.navigate(['/loan-info-details']);
                  }
                });
              } else {
                this.toast.showInfo('Customer created. Please check the customer list.');
                this.router.navigate(['/loan-info-details']);
              }
            } else {
              const customerIdStr = String(customerId);
              this.router.navigate(['/loan-info-details']);
            }
            this.customerForm.reset();
            this.customerForm.patchValue({ submittedDate: new Date() });
          } else {
            this.toast.showError(res?.message || 'Unexpected error occurred.');
          }
        },
        error: (err) => {
          const errorMsg = err?.error?.message || 'Error saving customer';
          this.toast.showError(errorMsg);
          console.error('Create customer error:', err);
          if (err?.error) {
            console.log('Error response:', err.error);
          }
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
