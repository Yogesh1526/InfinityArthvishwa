import { Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { PersonalDetailsService } from 'src/app/Services/PersonalDetailsService';
import { WebcamComponent } from '../webcam/webcam.component';

@Component({
  selector: 'app-personal-details',
  templateUrl: './personal-details.component.html',
  styleUrls: ['./personal-details.component.css']
})
export class PersonalDetailsComponent implements OnInit {
  customer: any;
  profilePreview: string | ArrayBuffer | null = null;
  customerId: string = '';
  @Input() loanApplicationId!: string;

  constructor(
    private personalService: PersonalDetailsService,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,

  ) {}

  ngOnInit(): void {

    if (this.loanApplicationId) {
        this.loadCustomerData(this.loanApplicationId);
    }
  }

  loadCustomerData(id: any): void {
    this.personalService.getById(id).subscribe({
      next: (res) => {
        this.customer = res.data;
        if (this.customer?.photo) {
          this.profilePreview = `data:image/jpeg;base64,${this.customer.photo}`;
        }
      },
      error: err => console.error('Error loading customer:', err)
    });
  }

  onEditClick(): void {
    this.router.navigate(['/basic-details', this.loanApplicationId]);
  }

  openWebcam(): void {
    const dialogRef = this.dialog.open(WebcamComponent, {
      width: '480px',
      height: 'auto',
      disableClose: false,
      autoFocus: false
    });
  
    dialogRef.afterClosed().subscribe((dataUrl: string | null) => {
      if (dataUrl) {
        this.profilePreview = dataUrl;
  
        const file = this.dataURLToFile(dataUrl, 'photo.jpg');
        if (this.customer?.loanAccountNo) {
          this.personalService.uploadPhoto(this.customer.loanAccountNo, file).subscribe({
            next: (res) => {
              console.log('Photo uploaded successfully:', res);
            },
            error: (err) => {
              console.error('Error uploading photo:', err);
            }
          });
        }
      }
    });
  }
  
  dataURLToFile(dataUrl: string, filename: string): File {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
  
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
  
    return new File([u8arr], filename, { type: mime });
  }
  
}
