import { Component } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-reference-details',
  templateUrl: './reference-details.component.html',
  styleUrls: ['./reference-details.component.css']
})
export class ReferenceDetailsComponent {

  form: FormGroup;

  relationshipOptions = [
    'Spouse', 'Father', 'Mother', 'Brother', 'Sister',
    'Friend', 'Colleague', 'Neighbour', 'Other'
  ];

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      mobileNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      relationship: ['', Validators.required]
    });
  }
  
}
