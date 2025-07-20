import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-loan-info',
  templateUrl: './loan-info.component.html',
  styleUrls: ['./loan-info.component.css']
})
export class LoanInfoComponent implements OnInit {
  
  loanForm!: FormGroup;

  products: string[] = ['Personal', 'Home', 'Auto', 'Education'];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.loanForm = this.fb.group({
      product: ['', Validators.required],
      office: ['', Validators.required],
      fund: [''],
      submittedOn: ['', Validators.required],
      principal: ['', Validators.required],
      interestRate: ['', Validators.required],
      anchors: [''],
      tenure: ['', Validators.required],
      repayments: ['', Validators.required],
      externalId: [''],
      repaymentFrequency: ['', Validators.required],
      firstRepaymentDate: [''],
      repaymentStrategy: ['', Validators.required],
      brokenInterestCalc: ['']
    });
    
  }

  onSubmit() {
    if (this.loanForm.valid) {
      console.log(this.loanForm.value);
      // Submit to backend logic here
    } else {
      this.loanForm.markAllAsTouched();
    }
  }

  onReset(): void {
    this.loanForm.reset();
  }
  
}

