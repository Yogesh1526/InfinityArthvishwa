import { Component, Input, OnInit, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';
import { WebcamComponent } from '../../../loan-application-wizard/steps/webcam/webcam.component';

@Component({
  selector: 'app-release-authorization',
  templateUrl: './release-authorization.component.html',
  styleUrls: ['./release-authorization.component.css']
})
export class ReleaseAuthorizationComponent implements OnInit, OnChanges {
  customer: any;
  profilePreview: string | ArrayBuffer | null = null;
  releasePhotoPreview: string | ArrayBuffer | null = null;
  isPhotoUploaded = false;
  showPhotoError = false;
  isLoading = false;
  currentDateTime: string = '';
  
  // Read-only mode - when data is already saved
  isReadOnly = false;
  savedData: any = null;
  
  // Authorization details
  relationWithBorrower: string = 'self';
  authorizerName: string = '';
  authorizerMobile: string = '';
  authorizerIdType: string = '';
  authorizerIdNumber: string = '';
  remarks: string = '';
  
  @Input() customerId!: string;
  @Input() loanAccountNumber!: string;
  @Output() stepCompleted = new EventEmitter<void>();
  @Output() validationFailed = new EventEmitter<string>();
  @Output() authorizationDataLoaded = new EventEmitter<any>();

  relationOptions = [
    { value: 'self', label: 'Self (Borrower)' },
    { value: 'spouse', label: 'Spouse' },
    { value: 'parent', label: 'Parent' },
    { value: 'child', label: 'Son/Daughter' },
    { value: 'sibling', label: 'Brother/Sister' },
    { value: 'authorized', label: 'Authorized Representative' },
    { value: 'other', label: 'Other' }
  ];

  idTypeOptions = [
    { value: 'aadhar', label: 'Aadhar Card' },
    { value: 'pan', label: 'PAN Card' },
    { value: 'voter', label: 'Voter ID' },
    { value: 'driving', label: 'Driving License' },
    { value: 'passport', label: 'Passport' }
  ];

  constructor(
    private personalService: PersonalDetailsService,
    private dialog: MatDialog,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    if (this.customerId) {
      this.loadCustomerData(this.customerId);
    }
    this.updateDateTime();
    setInterval(() => this.updateDateTime(), 60000);
  }

  updateDateTime(): void {
    const now = new Date();
    this.currentDateTime = now.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }) + ', ' + now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['customerId'] && changes['customerId'].currentValue && !changes['customerId'].firstChange) {
      this.loadCustomerData(this.customerId);
    }
  }

  loadCustomerData(id: string): void {
    this.isLoading = true;
    this.personalService.getById(id).subscribe({
      next: (res) => {
        this.customer = res.data;
        if (this.customerId) {
          this.loadPhoto(this.customerId);
        }
        if (this.relationWithBorrower === 'self' && this.customer) {
          this.authorizerName = this.getFullName();
          this.authorizerMobile = this.customer.mobileNumber || '';
        }
        // After customer data is loaded, check for existing authorization data
        this.loadExistingAuthorization();
      },
      error: err => {
        this.isLoading = false;
        console.error('Error loading customer data:', err);
      }
    });
  }

  /**
   * Load existing release authorization data from GET API
   * If data exists, patch values and set read-only mode
   */
  loadExistingAuthorization(): void {
    if (!this.customerId || !this.loanAccountNumber) {
      this.isLoading = false;
      return;
    }

    this.personalService.getReleaseAuthorizationDetails(this.customerId, this.loanAccountNumber).subscribe({
      next: (response: any) => {
        if (response?.data) {
          this.savedData = response.data;
          this.patchFormWithSavedData(response.data);
          this.isReadOnly = true;
          this.isPhotoUploaded = true;

          // Emit step completed and data loaded so checkbox ticks
          this.stepCompleted.emit();
          this.authorizationDataLoaded.emit(response.data);
        }
        this.isLoading = false;
      },
      error: (err) => {
        // No existing data found - form stays editable
        this.isReadOnly = false;
        this.savedData = null;
        this.isLoading = false;
      }
    });
  }

  /**
   * Patch form fields with saved data from API response
   */
  patchFormWithSavedData(data: any): void {
    // Determine relation: if collectedBy is "Self", set self; otherwise set relation
    if (data.collectedBy === 'Self') {
      this.relationWithBorrower = 'self';
    } else {
      const matchedRelation = this.relationOptions.find(
        opt => opt.label === data.collectedBy || opt.value === data.collectedBy?.toLowerCase()
      );
      this.relationWithBorrower = matchedRelation ? matchedRelation.value : 'authorized';
    }

    this.authorizerName = data.fullName || '';
    this.authorizerMobile = data.mobileNumber || '';
    
    if (data.idType) {
      const matchedIdType = this.idTypeOptions.find(
        opt => opt.label === data.idType || opt.value === data.idType?.toLowerCase()
      );
      this.authorizerIdType = matchedIdType ? matchedIdType.value : data.idType;
    }
    
    this.authorizerIdNumber = data.idNumber || '';
    this.remarks = data.remark || '';

    this.isPhotoUploaded = true;

    // Load the saved photo from API
    this.loadReleasePhoto();
  }

  /**
   * Load saved release authorization photo from API
   */
  loadReleasePhoto(): void {
    if (!this.customerId || !this.loanAccountNumber) return;

    this.personalService.getReleaseAuthorizationPhoto(this.customerId, this.loanAccountNumber).subscribe({
      next: (blob: Blob) => {
        const reader = new FileReader();
        reader.onload = () => {
          this.releasePhotoPreview = reader.result as string;
        };
        reader.readAsDataURL(blob);
      },
      error: () => {
        // Photo not available, show placeholder
        this.releasePhotoPreview = 'saved';
      }
    });
  }

  loadPhoto(customerId: string): void {
    this.personalService.getPhoto(customerId).subscribe({
      next: (blob: Blob) => {
        const reader = new FileReader();
        reader.onload = () => {
          this.profilePreview = reader.result as string;
        };
        reader.readAsDataURL(blob);
      },
      error: err => {
        this.profilePreview = null;
      }
    });
  }

  getFullName(): string {
    if (!this.customer) return '';
    return [this.customer.firstName, this.customer.middleName, this.customer.lastName]
      .filter(Boolean)
      .join(' ');
  }

  getRelationIcon(relation: string): string {
    const icons: { [key: string]: string } = {
      'self': 'person',
      'spouse': 'favorite',
      'parent': 'elderly',
      'child': 'child_care',
      'sibling': 'people',
      'authorized': 'badge',
      'other': 'person_outline'
    };
    return icons[relation] || 'person';
  }

  onRelationChange(): void {
    if (this.isReadOnly) return;
    if (this.relationWithBorrower === 'self' && this.customer) {
      this.authorizerName = this.getFullName();
      this.authorizerMobile = this.customer.mobileNumber || '';
    } else {
      this.authorizerName = '';
      this.authorizerMobile = '';
    }
  }

  /**
   * Open webcam to capture release photo
   */
  openWebcam(): void {
    if (this.isReadOnly) return;
    
    const dialogRef = this.dialog.open(WebcamComponent, {
      width: '480px',
      height: 'auto',
      disableClose: false,
      autoFocus: false
    });

    dialogRef.afterClosed().subscribe((dataUrl: string | null) => {
      if (dataUrl) {
        this.releasePhotoPreview = dataUrl;
        this.isPhotoUploaded = true;
        this.showPhotoError = false;
        this.toastService.showSuccess('Photo captured successfully!');
      }
    });
  }

  /**
   * Remove captured photo
   */
  removePhoto(): void {
    if (this.isReadOnly) return;
    this.releasePhotoPreview = null;
    this.isPhotoUploaded = false;
  }

  /**
   * Validate if the step can be completed
   */
  validateStep(): boolean {
    // If already saved (read-only), step is always valid
    if (this.isReadOnly) {
      return true;
    }

    // Photo is required
    if (!this.isPhotoUploaded) {
      this.showPhotoError = true;
      this.toastService.showWarning('Please capture a photo of the person releasing the loan');
      this.validationFailed.emit('Photo is required to proceed');
      return false;
    }

    // If not self, additional details required
    if (this.relationWithBorrower !== 'self') {
      if (!this.authorizerName.trim()) {
        this.toastService.showWarning('Please enter the name of the person releasing');
        return false;
      }
      if (!this.authorizerMobile.trim()) {
        this.toastService.showWarning('Please enter the mobile number');
        return false;
      }
      if (!this.authorizerIdType) {
        this.toastService.showWarning('Please select an ID type');
        return false;
      }
      if (!this.authorizerIdNumber.trim()) {
        this.toastService.showWarning('Please enter the ID number');
        return false;
      }
    }

    this.showPhotoError = false;
    return true;
  }

  /**
   * Check if step is valid
   */
  isStepValid(): boolean {
    return this.isPhotoUploaded || this.isReadOnly;
  }

  /**
   * Confirm and proceed - calls POST API to save release authorization
   */
  confirmAuthorization(): void {
    if (this.isReadOnly) return;
    if (!this.validateStep()) {
      return;
    }

    this.isLoading = true;

    const requestJson = {
      loanAccountNumber: this.loanAccountNumber,
      customerId: this.customerId,
      collectorDetails: this.relationWithBorrower === 'self' ? 'Self' : this.getRelationLabel(),
      fullName: this.relationWithBorrower === 'self' ? this.getFullName() : this.authorizerName,
      mobileNumber: this.relationWithBorrower === 'self' ? (this.customer?.mobileNumber || '') : this.authorizerMobile,
      idType: this.authorizerIdType ? this.getIdTypeLabel() : '',
      idNumber: this.authorizerIdNumber || '',
      remark: this.remarks || '',
      collectedBy: this.relationWithBorrower === 'self' ? 'Self' : this.getRelationLabel()
    };

    const photoFile = this.dataUrlToFile(this.releasePhotoPreview as string, 'release-photo.jpg');

    this.personalService.saveReleaseAuthorization(requestJson, photoFile).subscribe({
      next: (response: any) => {
        this.isLoading = false;

        // After successful save, set read-only mode
        this.savedData = response?.data || requestJson;
        this.isReadOnly = true;

        this.authorizationDataLoaded.emit(this.savedData);
        this.stepCompleted.emit();
        this.toastService.showSuccess('Authorization saved successfully!');
      },
      error: (err) => {
        this.isLoading = false;
        const errorMsg = err?.error?.message || 'Failed to save release authorization. Please try again.';
        this.toastService.showError(errorMsg);
      }
    });
  }

  /**
   * Get label for selected relation
   */
  getRelationLabel(): string {
    const option = this.relationOptions.find(opt => opt.value === this.relationWithBorrower);
    return option ? option.label : this.relationWithBorrower;
  }

  /**
   * Get label for selected ID type
   */
  getIdTypeLabel(): string {
    const option = this.idTypeOptions.find(opt => opt.value === this.authorizerIdType);
    return option ? option.label : this.authorizerIdType;
  }

  /**
   * Get formatted saved date
   */
  getSavedDate(): string {
    if (!this.savedData?.createdDate) return '';
    const date = new Date(this.savedData.createdDate);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }) + ', ' + date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  /**
   * Convert a data URL to a File object
   */
  dataUrlToFile(dataUrl: string, filename: string): File {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }
}
