import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-loan-application-wizard',
  templateUrl: './loan-application-wizard.component.html',
  styleUrls: ['./loan-application-wizard.component.css']
})
export class LoanApplicationWizardComponent implements OnInit {
  activeStep = 0;
  mainForm!: FormGroup;
  loanApplicationId!: string;

  steps = [
    { label: 'Personal Details' },
    { label: 'Family Details' },
    { label: 'Address Activity' },
    { label: 'Work Details' },
    { label: 'KYC' },
    { label: 'Additional Documents' },
    { label: 'Client Documents' },
    { label: 'Nominee' },
    { label: 'Reference Details' },
    { label: 'Gold Ownership Form' },
    { label: 'First Valuation' },
    { label: 'Second Valuation' },
    { label: 'Final Valuation' }
    // Continue adding more steps
  ];

  constructor(private route: ActivatedRoute,private fb: FormBuilder, private http: HttpClient) {}

  ngOnInit(): void {
  
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) this.loanApplicationId = id; // don't convert to number
    });
    

  }

  goToStep(index: number): void {
    this.activeStep = index;
  }

  isLastStep(): boolean {
    return this.activeStep === this.steps.length - 1;
  }

  next(): void {
    if (this.activeStep < this.steps.length - 1) {
      this.activeStep++;
    }
  }

  prev(): void {
    if (this.activeStep > 0) {
      this.activeStep--;
    }
  }

  submitAll(): void {
    if (this.mainForm.invalid) {
      console.warn('Form is invalid. Please complete all required fields.');
      return;
    }

    const formValue = this.mainForm.value;
    const formData = new FormData();

    for (const sectionKey in formValue) {
      const section = formValue[sectionKey];
      for (const fieldKey in section) {
        const val = section[fieldKey];
        if (val instanceof File) {
          formData.append(fieldKey, val);
        } else {
          formData.append(fieldKey, val ?? '');
        }
      }
    }

    this.http.post('/api/loan-application', formData).subscribe({
      next: () => alert('Application submitted successfully!'),
      error: () => alert('Submission failed. Please try again.')
    });
  }
}
