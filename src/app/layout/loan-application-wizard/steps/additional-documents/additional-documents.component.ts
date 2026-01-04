import { Component, ElementRef, ViewChild, Output, EventEmitter } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';

@Component({
  selector: 'app-additional-documents',
  templateUrl: './additional-documents.component.html',
  styleUrls: ['./additional-documents.component.css']
})
export class AdditionalDocumentsComponent {
  form: FormGroup;
  documentPreviews: { [key: string]: string | ArrayBuffer | null } = {};
  @Output() stepCompleted = new EventEmitter<void>();

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
        this.stepCompleted.emit();
      };
      if (file.type.startsWith('image')) {
        reader.readAsDataURL(file);
      } else {
        this.documentPreviews[controlName] = 'pdf';
        this.form.patchValue({ [controlName]: file });
        this.stepCompleted.emit();
      }
    }
  }

  clearDocument(controlName: string): void {
    this.documentPreviews[controlName] = null;
    this.form.patchValue({ [controlName]: null });
    // Reset file input
    if (controlName === 'incomeProof') {
      this.incomeProofInput.nativeElement.value = '';
    } else if (controlName === 'addressProof') {
      this.addressProofInput.nativeElement.value = '';
    } else if (controlName === 'otherDocument') {
      this.otherDocumentInput.nativeElement.value = '';
    }
  }
}
