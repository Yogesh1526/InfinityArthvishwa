import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { PersonalDetailsService } from 'src/app/Services/PersonalDetailsService';

@Component({
  selector: 'app-address-activity',
  templateUrl: './address-activity.component.html',
  styleUrls: ['./address-activity.component.css']
})
export class AddressActivityComponent implements OnInit {
  @Input() loanApplicationId!: string;

  addressList: any[] = [];
  form!: FormGroup;
  isEditable = false;
  selectedEditId: number | null = null;
  formLoaded = false;

  constructor(private fb: FormBuilder, private addressService: PersonalDetailsService) {}

  ngOnInit(): void {
    this.initForm();

    if (this.loanApplicationId) {
      this.loadAddresses();
    } else {
      this.isEditable = true;
      this.formLoaded = true;
    }
  }

  initForm(): void {
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

  loadAddresses(): void {
    this.addressService.getAddressDetailsByLoanApplicantId(this.loanApplicationId)
      .subscribe({
        next: (response) => {
          this.addressList = response?.data || [];
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
      residentialAddressOwnership: address.ownership,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      landmark: address.landmark,
      villageTownCity: address.village,
      district: address.district,
      state: address.state,
      pincode: address.pincode,
      country: address.country,
      yearsAtResidence: address.yearsOfResidence
    });

    this.isEditable = true;
    this.selectedEditId = address.id;
    this.form.enable();
  }

  onSubmit(): void {
    if (this.form.valid) {
      const body = {
        id: this.selectedEditId, // null if adding new
        addressType: 'Communication Address',
        ownership: this.form.value.residentialAddressOwnership,
        addressLine1: this.form.value.addressLine1,
        addressLine2: this.form.value.addressLine2,
        landmark: this.form.value.landmark,
        village: this.form.value.villageTownCity,
        district: this.form.value.district,
        state: this.form.value.state,
        pincode: this.form.value.pincode,
        country: this.form.value.country,
        yearsOfResidence: this.form.value.yearsAtResidence,
        loanAccountNo: this.loanApplicationId
      };

      this.addressService.saveAddressDetails(body).subscribe(() => {
        this.loadAddresses();
        this.form.reset();
        this.isEditable = false;
        this.selectedEditId = null;
      });
    }
  }

  addNew(): void {
    this.form.reset();
    this.form.enable();
    this.isEditable = true;
    this.selectedEditId = null;
  }
}
