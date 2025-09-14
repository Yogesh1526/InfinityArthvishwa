import { Component } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-add-jewellery-dialog',
  templateUrl: './add-jewellery-dialog.component.html',
  styleUrls: ['./add-jewellery-dialog.component.css']
})
export class AddJewelleryDialogComponent {
  form: FormGroup;
  imagePreview: string = '';

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<AddJewelleryDialogComponent>
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      quantity: [1, Validators.required],
      grossWeight: ['', Validators.required],
      stoneWeight: [''],
      netWeight: ['', Validators.required],
      karat: [''],
      purity: [''],
      netPurityWeight: [''],
      image: [null]
    });
  }

  onFileChange(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = e => (this.imagePreview = reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  previewImages: string[] = [];

onImageUpload(event: any) {
  const files = event.target.files;
  for (let file of files) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.previewImages.push(e.target.result);
    };
    reader.readAsDataURL(file);
  }
}

onAdd() {
  if (this.form.valid) {
    const formValue = this.form.value;

    const payload = {
      jewelleryName: formValue.name,
      quantity: formValue.quantity,
      grossWeight: formValue.grossWeight,
      stoneWeight: formValue.stoneWeight,
      netWeight: formValue.netWeight,
      karat: formValue.karat,
      purity: formValue.purity,
      netPurityWeight: formValue.netPurityWeight
    };

    this.dialogRef.close({ data: payload, image: this.previewImages });
  }
}

  submit(): void {
    if (this.form.valid) {
      const data = this.form.value;
      this.dialogRef.close({ data, image: this.imagePreview });
    }
  }
}