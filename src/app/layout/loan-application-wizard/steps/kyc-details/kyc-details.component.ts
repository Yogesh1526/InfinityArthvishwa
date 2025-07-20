import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-kyc-details',
  templateUrl: './kyc-details.component.html',
  styleUrls: ['./kyc-details.component.css']
})
export class KycDetailsComponent {
  form: FormGroup;
  aadhaarPreview: string | ArrayBuffer | null = null;
  panPreview: string | ArrayBuffer | null = null;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      aadhaar: [null],
      aadhaarVerified: [false],
      pan: [null],
      panVerified: [false]
    });
  }

  triggerFileInput(id: string) {
    const element = document.getElementById(id) as HTMLElement;
    element.click();
  }

  onFileChange(event: Event, type: 'aadhaar' | 'pan') {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.form.patchValue({ [type]: file });
      const reader = new FileReader();

      reader.onload = () => {
        if (type === 'aadhaar') {
          this.aadhaarPreview = reader.result;
        } else if (type === 'pan') {
          this.panPreview = reader.result;
        }
      };

      if (file.type.startsWith('image')) {
        reader.readAsDataURL(file);
      } else {
        // For PDFs or other types, just clear the preview or show an icon/text
        if (type === 'aadhaar') this.aadhaarPreview = null;
        else this.panPreview = null;
      }
    }
  }
}