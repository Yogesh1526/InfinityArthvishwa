import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { PersonalDetailsService } from 'src/app/Services/PersonalDetailsService';

@Component({
  selector: 'app-work-details',
  templateUrl: './work-details.component.html',
  styleUrls: ['./work-details.component.css']
})
export class WorkDetailsComponent implements OnInit {
  form: FormGroup;
  formLoaded = false;
  isEditable = false;
  isDataAvailable = false;
  @Input() loanApplicationId!: string;

  constructor(
    private fb: FormBuilder,
    private workDetailsService: PersonalDetailsService
  ) {
    this.form = this.fb.group({
      customerSegment: [''],
      occupation: [''],
      experienceInCurrentJob: [''],
      annualIncome: ['']
    });
  }

  ngOnInit(): void {
    if (this.loanApplicationId) {

      this.loadWorkDetails(this.loanApplicationId);

    }
  }

  loadWorkDetails(loanApplicationId:any) {
    this.workDetailsService.getWorkDetailsByApplicantId(loanApplicationId).subscribe(
      (data) => {
        if (data && data.data && data.data.length) {
          this.form.patchValue(data.data[0]);
          this.isDataAvailable = true;
        } else {
          this.isEditable = true;
        }        
        this.formLoaded = true;
      },
      () => {
        this.isEditable = true;
        this.formLoaded = true;
      }
    );
  }

  onEdit() {
    this.isEditable = true;
  }

  onSubmit() {
    if (!this.form.valid) return;

    const payload = {
      ...this.form.value,
      loanAccountNo: this.loanApplicationId,
      applicantId: this.loanApplicationId
    };

    this.workDetailsService.saveWorkDetails(payload).subscribe(() => {
      this.isEditable = false;
      this.isDataAvailable = true;
    });
  }
}
