import { Component, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PersonalDetailsService } from 'src/app/Services/PersonalDetailsService';

@Component({
  selector: 'app-kyc-details',
  templateUrl: './kyc-details.component.html',
  styleUrls: ['./kyc-details.component.css']
})
export class KycDetailsComponent {
  form: FormGroup;

  aadhaarFrontPreview: string | ArrayBuffer | null = null;
  aadhaarBackPreview: string | ArrayBuffer | null = null;
  panPreview: string | ArrayBuffer | null = null;

  aadhaarFrontFile?: File;
  aadhaarBackFile?: File;
  panFile?: File;

  @Input() loanApplicationId!: string;
  identifierNumber = '';

  constructor(
    private fb: FormBuilder,
    private personalDetailsService: PersonalDetailsService
  ) {
    this.form = this.fb.group({
      aadhaarVerified: [false],
      panVerified: [false],
      aadhaarIdentifierNumber: ['', Validators.required],
      aadhaarDocumentType: ['', Validators.required],
      panIdentifierNumber: ['', Validators.required],
      panDocumentType: ['', Validators.required]
    });
  }

  triggerFileInput(id: string) {
    const element = document.getElementById(id) as HTMLElement;
    element.click();
  }

  onFileChange(event: Event, type: 'aadhaarFront' | 'aadhaarBack' | 'pan') {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = () => {
        if (type === 'aadhaarFront') {
          this.aadhaarFrontPreview = reader.result;
          this.aadhaarFrontFile = file;
        } else if (type === 'aadhaarBack') {
          this.aadhaarBackPreview = reader.result;
          this.aadhaarBackFile = file;
        } else if (type === 'pan') {
          this.panPreview = reader.result;
          this.panFile = file;
        }
      };

      if (file.type.startsWith('image')) {
        reader.readAsDataURL(file);
      } else {
        // For PDFs or other types, clear preview but keep file reference
        if (type === 'aadhaarFront') {
          this.aadhaarFrontPreview = null;
          this.aadhaarFrontFile = file;
        } else if (type === 'aadhaarBack') {
          this.aadhaarBackPreview = null;
          this.aadhaarBackFile = file;
        } else if (type === 'pan') {
          this.panPreview = null;
          this.panFile = file;
        }
      }
    }
  }

  uploadDocument(type: 'aadhaarFront' | 'aadhaarBack' | 'pan') {
    let file: File | undefined;
    let proofType = '';
    let side = '';
    let identifierNumber = '';
    let documentType = '';

    if (type === 'aadhaarFront') {
      file = this.aadhaarFrontFile;
      proofType = 'aadhaar';
      side = 'front';
      identifierNumber = this.form.get('aadhaarIdentifierNumber')?.value;
      documentType = this.form.get('aadhaarDocumentType')?.value;
    } else if (type === 'aadhaarBack') {
      file = this.aadhaarBackFile;
      proofType = 'aadhaar';
      side = 'back';
      identifierNumber = this.form.get('aadhaarIdentifierNumber')?.value;
      documentType = this.form.get('aadhaarDocumentType')?.value;
    } else if (type === 'pan') {
      file = this.panFile;
      proofType = 'pan';
      side = '';
      identifierNumber = this.form.get('panIdentifierNumber')?.value;
      documentType = this.form.get('panDocumentType')?.value;
    }

    if (!file) {
      alert('Please select a file before uploading.');
      return;
    }

    this.personalDetailsService.uploadKycDocument({
      loanAccountNo: this.loanApplicationId,
      file,
      proofType,
      side,
      identifierNumber,
      documentType
    }).subscribe({
      next: (res:any) => {
        alert(`${type} uploaded successfully.`);
        // Optionally clear the file and preview after upload
        if (type === 'aadhaarFront') {
          this.aadhaarFrontFile = undefined;
          this.aadhaarFrontPreview = null;
        } else if (type === 'aadhaarBack') {
          this.aadhaarBackFile = undefined;
          this.aadhaarBackPreview = null;
        } else if (type === 'pan') {
          this.panFile = undefined;
          this.panPreview = null;
        }
      },
     
    });
  }
}
