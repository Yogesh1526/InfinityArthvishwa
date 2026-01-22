import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-address-activity',
  templateUrl: './address-activity.component.html',
  styleUrls: ['./address-activity.component.css']
})
export class AddressActivityComponent implements OnInit {
  @Input() customerId!: string;
  @Input() loanApplicationId!: string;

  addressList: any[] = [];
  form!: FormGroup;
  isEditable = false;
  selectedEditId: number | null = null;
  formLoaded = false;
  @Output() stepCompleted = new EventEmitter<void>();

  constructor(
    private fb: FormBuilder,
    private addressService: PersonalDetailsService,
    private toastService: ToastService
  ) {}

  // Dropdown options
  ownershipOptions = ['Own', 'Rented', 'Leased', 'Parental', 'Other'];
  addressTypeOptions = ['Communication Address', 'Permanent Address', 'Current Address', 'Office Address', 'Correspondence Address'];
  indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands',
    'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
    'Ladakh', 'Lakshadweep', 'Puducherry'
  ];

  ngOnInit(): void {
    this.initForm();

    if (this.customerId) {
      this.loadAddresses();
    } else {
      this.isEditable = true;
      this.formLoaded = true;
    }
  }

  initForm(): void {
    this.form = this.fb.group({
      addressType: ['Communication Address', Validators.required],
      ownership: ['', Validators.required],
      addressLine1: ['', Validators.required],
      addressLine2: [''],
      landmark: [''],
      village: ['', Validators.required],
      district: ['', Validators.required],
      state: ['', Validators.required],
      pincode: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]],
      country: ['India', Validators.required],
      yearsOfResidence: ['', Validators.required]
    });

    // Set default country to India
    this.form.patchValue({ country: 'India' });
  }

  loadAddresses(): void {
    this.addressService.getAddressDetailsByCustomerId(this.customerId)
      .subscribe({
        next: (response) => {
          // Handle different response structures
          if (Array.isArray(response)) {
            this.addressList = response;
          } else if (response?.data) {
            this.addressList = Array.isArray(response.data) ? response.data : [response.data];
          } else {
            this.addressList = [];
          }
          this.formLoaded = true;

          if (this.addressList.length === 0) {
            this.isEditable = true;
          }
        },
        error: () => {
          this.addressList = [];
          this.isEditable = true;
          this.formLoaded = true;
        }
      });
  }

  editAddress(address: any): void {
    this.form.patchValue({
      addressType: address.addressType || 'Communication Address',
      ownership: address.ownership || '',
      addressLine1: address.addressLine1 || '',
      addressLine2: address.addressLine2 || '',
      landmark: address.landmark || '',
      village: address.village || '',
      district: address.district || '',
      state: address.state || '',
      pincode: address.pincode || '',
      country: address.country || 'India',
      yearsOfResidence: address.yearsOfResidence || ''
    });

    this.isEditable = true;
    this.selectedEditId = address.id;
    this.form.enable();
  }

  validateStep(): boolean {
    // If form is already saved (not editable), allow navigation
    if (!this.isEditable && this.addressList.length > 0) {
      return true;
    }
    // If in edit mode, validate form
    if (this.isEditable) {
      this.form.markAllAsTouched();
      if (!this.form.valid) {
        this.toastService.showWarning('Please fill all required fields correctly.');
        return false;
      }
    } else if (this.addressList.length === 0) {
      this.toastService.showWarning('Please add at least one address.');
      return false;
    }
    return true;
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (!this.form.valid) {
      this.toastService.showWarning('Please fill all required fields correctly.');
      return;
    }
    
    if (this.form.valid) {
      const body: any = {
        addressType: this.form.value.addressType,
        ownership: this.form.value.ownership,
        addressLine1: this.form.value.addressLine1,
        addressLine2: this.form.value.addressLine2,
        landmark: this.form.value.landmark,
        village: this.form.value.village,
        district: this.form.value.district,
        state: this.form.value.state,
        pincode: this.form.value.pincode,
        country: this.form.value.country || 'India',
        customerId: this.customerId,
        yearsOfResidence: this.form.value.yearsOfResidence
      };

      if (this.selectedEditId) {
        // Update existing address
        body.id = this.selectedEditId;
        this.addressService.updateAddressDetails(body).subscribe({
          next: () => {
            this.toastService.showSuccess('Address details updated successfully!');
            this.loadAddresses();
            this.form.reset();
            this.form.patchValue({ country: 'India' });
            this.isEditable = false;
            this.selectedEditId = null;
            this.stepCompleted.emit();
          },
          error: (err) => {
            const errorMsg = err?.error?.message || 'Failed to update address details. Please try again.';
            this.toastService.showError(errorMsg);
          }
        });
      } else {
        // Create new address
        this.addressService.saveAddressDetails(body).subscribe({
          next: () => {
            this.toastService.showSuccess('Address details saved successfully!');
            this.loadAddresses();
            this.form.reset();
            this.form.patchValue({ country: 'India' });
            this.isEditable = false;
            this.selectedEditId = null;
            this.stepCompleted.emit();
          },
          error: (err) => {
            const errorMsg = err?.error?.message || 'Failed to save address details. Please try again.';
            this.toastService.showError(errorMsg);
          }
        });
      }
    }
  }

  deleteAddress(address: any): void {
    if (confirm('Are you sure you want to delete this address?')) {
      this.addressService.deleteAddressDetails(this.customerId, address.id).subscribe({
        next: () => {
          this.toastService.showSuccess('Address deleted successfully!');
          this.loadAddresses();
        },
        error: (err) => {
          const errorMsg = err?.error?.message || 'Failed to delete address. Please try again.';
          this.toastService.showError(errorMsg);
        }
      });
    }
  }

  addNew(): void {
    this.form.reset();
    this.form.patchValue({ 
      country: 'India',
      addressType: 'Communication Address'
    });
    this.form.enable();
    this.isEditable = true;
    this.selectedEditId = null;
  }
}
