import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PersonalDetailsService } from 'src/app/Services/PersonalDetailsService';

@Component({
  selector: 'app-reference-details',
  templateUrl: './reference-details.component.html',
  styleUrls: ['./reference-details.component.css']
})
export class ReferenceDetailsComponent implements OnInit {
  @Input() loanApplicationId!: string;

  form!: FormGroup;
  isLoading = false;
  showForm = false;
  isEditMode = false;
  editingIndex: number | null = null;

  referenceList: any[] = [];

  relationshipOptions = [
    'Spouse', 'Father', 'Mother', 'Brother', 'Sister',
    'Friend', 'Colleague', 'Neighbour', 'Other'
  ];

  constructor(
    private fb: FormBuilder,
    private referenceService: PersonalDetailsService
  ) {}

  ngOnInit(): void {
    this.initForm();
    if (this.loanApplicationId) {
      this.fetchReferenceList();
    }
  }

  initForm(): void {
    this.form = this.fb.group({
      name: ['', Validators.required],
      mobileNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      relationship: ['', Validators.required],
      gender: ['', Validators.required]
    });
  }

  fetchReferenceList(): void {
    this.isLoading = true;
    this.referenceService.getReferenceDetails(this.loanApplicationId).subscribe(res => {
      this.referenceList = res?.data || [];
      this.isLoading = false;
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const payload = {
      name: this.form.value.name,
      mobileNumber: this.form.value.mobileNumber,
      relationshipWithApplicant: this.form.value.relationship,
      gender: this.form.value.gender,
      loanAccountNo: this.loanApplicationId
    };

    const request$ = this.isEditMode
      ? this.referenceService.updateReferenceDetails({ ...payload, id: this.referenceList[this.editingIndex!].id })
      : this.referenceService.saveReferenceDetails(payload);

    request$.subscribe(() => {
      this.showForm = false;
      this.isEditMode = false;
      this.editingIndex = null;
      this.form.reset();
      this.fetchReferenceList();
    });
  }

  editReference(ref: any, index: number): void {
    this.form.patchValue({
      name: ref.name,
      mobileNumber: ref.mobileNumber,
      relationship: ref.relationshipWithApplicant,
      gender: ref.gender || ''
    });
    this.showForm = true;
    this.isEditMode = true;
    this.editingIndex = index;
  }

  cancelForm(): void {
    this.showForm = false;
    this.isEditMode = false;
    this.editingIndex = null;
    this.form.reset();
  }
}
