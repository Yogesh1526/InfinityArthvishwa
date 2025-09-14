import { Component, Input, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { PersonalDetailsService } from 'src/app/Services/PersonalDetailsService';

@Component({
  selector: 'app-nominee',
  templateUrl: './nominee.component.html',
  styleUrls: ['./nominee.component.css']
})
export class NomineeComponent implements OnInit {

  @Input() loanApplicationId!: string;

  form: FormGroup;
  isEditable = false;
  isDataAvailable = false;
  formLoaded = false;

  nomineeId: number | null = null; // <-- Store nominee ID here

  genderOptions = ['Male', 'Female', 'Other'];
  relationshipOptions = ['Spouse', 'Father', 'Mother', 'Brother', 'Sister', 'Friend', 'Other'];

  constructor(private fb: FormBuilder, private nomineeService: PersonalDetailsService) {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      relationship: ['', Validators.required],
      gender: ['', Validators.required],
      mobileNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      dob: ['', Validators.required],
      age: ['']
    });
  }

  ngOnInit(): void {
    if (this.loanApplicationId) {
      this.nomineeService.getNomineeByLoanAccount(this.loanApplicationId).subscribe({
        next: (res) => {
          const nominee = res?.data?.[0];
          if (nominee) {
            this.nomineeId = nominee.id; // <-- Save ID
            const nameParts = nominee.nomineeName?.split(' ') || ['', ''];
            this.form.patchValue({
              firstName: nameParts[0],
              lastName: nameParts[1] || '',
              relationship: nominee.relationShip,
              gender: nominee.gender || '',
              dob: nominee.dob || '',
              mobileNumber: nominee.phoneNo,
              age: nominee.age || ''
            });
            this.isDataAvailable = true;
          } else {
            this.isEditable = true;
          }
          this.formLoaded = true;
        },
        error: () => {
          this.isEditable = true;
          this.formLoaded = true;
        }
      });
    }
  }

  onEdit(): void {
    this.isEditable = true;
  }

  onSubmit(): void {
    if (!this.form.valid) return;

    const payload = {
      nomineeName: `${this.form.value.firstName} ${this.form.value.lastName}`,
      relationShip: this.form.value.relationship,
      age: this.form.value.age,
      phoneNo: this.form.value.mobileNumber,
      gender: this.form.value.gender,
      dob: this.form.value.dob,
      loanAccountNo: this.loanApplicationId
    };

    if (this.nomineeId) {
      // If nominee already exists — UPDATE
      const updatePayload = { ...payload, id: this.nomineeId };
      this.nomineeService.updateNominee(updatePayload).subscribe(() => {
        this.isEditable = false;
        this.isDataAvailable = true;
      });
    } else {
      // NEW nominee — CREATE
      this.nomineeService.saveNominee(payload).subscribe(() => {
        this.isEditable = false;
        this.isDataAvailable = true;
      });
    }
  }
}
