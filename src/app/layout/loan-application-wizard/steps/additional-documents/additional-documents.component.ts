import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';

@Component({
  selector: 'app-additional-documents',
  templateUrl: './additional-documents.component.html',
  styleUrls: ['./additional-documents.component.css']
})
export class AdditionalDocumentsComponent {
  form: FormGroup;
  documentPreviews: { [key: string]: string | ArrayBuffer | null } = {};

  @ViewChild('incomeProof') incomeProofInput!: ElementRef<HTMLInputElement>;
  @ViewChild('addressProof') addressProofInput!: ElementRef<HTMLInputElement>;
  @ViewChild('otherDocument') otherDocumentInput!: ElementRef<HTMLInputElement>;

  get fileInputs() {
    return {
      incomeProof: this.incomeProofInput.nativeElement,
      addressProof: this.addressProofInput.nativeElement,
      otherDocument: this.otherDocumentInput.nativeElement,
    };
  }

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      incomeProof: [null],
      addressProof: [null],
      otherDocument: [null]
    });
  }

  onFileChange(event: any, controlName: string): void {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.documentPreviews[controlName] = reader.result;
        this.form.patchValue({ [controlName]: file });
      };
      reader.readAsDataURL(file);
    }
  }
}
