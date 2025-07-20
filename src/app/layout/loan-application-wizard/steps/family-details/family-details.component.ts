import { Component, Input } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-family-details',
  templateUrl: './family-details.component.html',
  styleUrls: ['./family-details.component.css']
})
export class FamilyDetailsComponent {

  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      spouseFirstName: [''],
      spouseLastName: [''],
      fatherFirstName: [''],
      fatherLastName: [''],
      motherFirstName: [''],
      motherLastName: ['']
    });
  }
}
