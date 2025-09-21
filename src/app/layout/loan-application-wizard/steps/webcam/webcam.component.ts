import { Component } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { WebcamImage, WebcamInitError, WebcamUtil } from 'ngx-webcam';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-webcam',
  templateUrl: './webcam.component.html',
  styleUrls: ['./webcam.component.css']
})
export class WebcamComponent {
  public showWebcam = true;
  public multipleWebcamsAvailable = false;

  private trigger: Subject<void> = new Subject<void>();
  private nextWebcam: Subject<boolean | string> = new Subject<boolean | string>();

  public isPreview = false;
  public capturedImage: WebcamImage | null = null;
  public uploadedImageDataUrl: string | null = null;

  constructor(private dialogRef: MatDialogRef<WebcamComponent>) {
    WebcamUtil.getAvailableVideoInputs().then((mediaDevices) => {
      this.multipleWebcamsAvailable = mediaDevices.length > 1;
    });
  }

  // Getters for template binding
  public get triggerObservable(): Observable<void> {
    return this.trigger.asObservable();
  }

  public get nextWebcamObservable(): Observable<boolean | string> {
    return this.nextWebcam.asObservable();
  }

  public triggerSnapshot(): void {
    this.trigger.next();
  }

  public switchCamera(): void {
    this.nextWebcam.next(true);
  }

  public handleImage(image: WebcamImage): void {
    this.capturedImage = image;
    this.isPreview = true;
  }

  public handleInitError(error: WebcamInitError): void {
    console.error('Webcam init error:', error);
  }

  public cancel(): void {
    this.dialogRef.close(null);
  }

  public handleFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = () => {
        this.uploadedImageDataUrl = reader.result as string;
        this.isPreview = true;
      };

      reader.readAsDataURL(file);
    }
  }

  public confirmPhoto(): void {
    if (this.capturedImage) {
      this.dialogRef.close(this.capturedImage.imageAsDataUrl);
    } else if (this.uploadedImageDataUrl) {
      this.dialogRef.close(this.uploadedImageDataUrl);
    }
  }

  public retakePhoto(): void {
    this.isPreview = false;
    this.capturedImage = null;
    this.uploadedImageDataUrl = null;
  }
}
