import { Component, Input, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PersonalDetailsService } from 'src/app/Services/PersonalDetailsService';

@Component({
  selector: 'app-personal-details',
  templateUrl: './personal-details.component.html',
  styleUrls: ['./personal-details.component.css']
})
export class PersonalDetailsComponent implements OnInit {
  @Input() isViewMode = false;

  form: FormGroup;
  profilePreview: string | ArrayBuffer | null = null;
  customerId: string = '';

  constructor(
    private fb: FormBuilder,
    private personalService: PersonalDetailsService,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      salutation: [''],
      firstName: ['', Validators.required],
      middleName: [''],
      lastName: [''],
      dob: ['', Validators.required],
      gender: ['', Validators.required],
      age: [''],
      mobileNumber: ['', Validators.required],
      altMobileNumber: [''],
      email: [''],
      maritalStatus: ['', Validators.required],
      education: [''],
      preferredLanguage: [''],
      clientType: [''],
      religion: [''],
      riskCategory: [''],
      nationality: [''],
      profilePicture: ['']
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('customerId');
      if (id) {
        this.customerId = id;
        this.loadCustomerData(id);
      }
    });

    if (this.isViewMode && this.form.value.profilePicture) {
      this.profilePreview = this.form.value.profilePicture;
    }
  }

  loadCustomerData(id: string): void {
    this.personalService.getById(id).subscribe(data => {
      this.form.patchValue(data);
      if (data.profilePicture) {
        this.profilePreview = data.profilePicture;
      }
    });
  }

  save(): void {
    if (this.form.invalid) return;

    const formData = this.form.value;

    if (this.customerId) {
      this.personalService.update(this.customerId, formData).subscribe({
        next: () => alert('Updated successfully'),
        error: (err) => console.error('Update failed:', err)
      });
    } else {
      this.personalService.create(formData).subscribe({
        next: () => alert('Created successfully'),
        error: (err) => console.error('Create failed:', err)
      });
    }
  }

  onFileChange(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.profilePreview = reader.result;
        this.form.patchValue({ profilePicture: reader.result });
      };
      reader.readAsDataURL(file);
    }
  }

  onReset(): void {
    this.form.reset();
    this.profilePreview = null;
  }
}
