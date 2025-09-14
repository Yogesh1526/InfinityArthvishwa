import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { PersonalDetailsService } from 'src/app/Services/PersonalDetailsService';

@Component({
  selector: 'app-family-details',
  templateUrl: './family-details.component.html',
  styleUrls: ['./family-details.component.css']
})
export class FamilyDetailsComponent implements OnInit {

  @Input() loanApplicationId!: string;

  form: FormGroup;
  isEditMode: boolean = true;
  familyDetails: any;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private personalService: PersonalDetailsService
  ) {
    this.form = this.fb.group({
      spouseFirstName: [''],
      spouseLastName: [''],
      fatherFirstName: [''],
      fatherLastName: [''],
      motherFirstName: [''],
      motherLastName: ['']
    });
  }

  ngOnInit() {
    if (this.loanApplicationId) {
      this.fetchFamilyDetails(this.loanApplicationId);
  }
  }

  fetchFamilyDetails(loanApplicationId: any) {
    this.personalService.getFamilyDetailsById(loanApplicationId).subscribe({
      next: (res) => {
        if (res && res.data && res.data.length > 0) {
          this.familyDetails = res.data[0]; // ⬅️ Access the first (and only) item
          this.isEditMode = false; // Show view mode
        } else {
          this.isEditMode = true; // Show form
        }
      },
      error: () => {
        this.isEditMode = true; // Show form on error
      }
    });
  }
  

  onSubmit() {
    const payload = {
      ...this.form.value,
      loanAccountNo: this.loanApplicationId,
    };

    this.personalService.createFamilyDetails(payload).subscribe({
      next: (response) => {
        this.familyDetails = payload;
        this.isEditMode = false;
      }
    });
  }

  editDetails() {
    this.form.patchValue(this.familyDetails);
    this.isEditMode = true;
  }
}
