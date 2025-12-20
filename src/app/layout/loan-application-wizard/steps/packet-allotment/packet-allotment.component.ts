import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { PersonalDetailsService } from 'src/app/services/PersonalDetailsService';
import { ToastService } from 'src/app/services/toast.service';

@Component({
  selector: 'app-packet-allotment',
  templateUrl: './packet-allotment.component.html',
  styleUrls: ['./packet-allotment.component.css']
})
export class PacketAllotmentComponent implements OnInit {
  @Input() customerId!: string;
  @Input() loanApplicationId!: string;
  @Output() stepCompleted = new EventEmitter<void>();

  form!: FormGroup;
  isEditMode = false;
  isDataAvailable = false;
  formLoaded = false;
  packetAllotmentId: number | null = null;
  loanAccountNumber: string | null = null;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private packetService: PersonalDetailsService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadStoredLoanAccountNumber();
    this.initForm();
    if (this.customerId && this.getLoanAccountNumber()) {
      this.loadPacketAllotment();
    } else {
      this.isEditMode = true;
      this.formLoaded = true;
    }
  }

  loadStoredLoanAccountNumber(): void {
    if (this.customerId) {
      const stored = localStorage.getItem(`loanAccountNumber_${this.customerId}`);
      if (stored) {
        this.loanAccountNumber = stored;
      }
    }
    if (!this.loanAccountNumber && this.loanApplicationId &&
        (this.loanApplicationId.startsWith('AP') || this.loanApplicationId.startsWith('GL'))) {
      this.loanAccountNumber = this.loanApplicationId;
    }
  }

  getLoanAccountNumber(): string | null {
    return this.loanAccountNumber || this.loanApplicationId || null;
  }

  initForm(): void {
    this.form = this.fb.group({
      packetId: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
      items: this.fb.array([this.createItemControl()])
    });
  }

  createItemControl(): FormGroup {
    return this.fb.group({
      item: ['', Validators.required]
    });
  }

  get itemsFormArray(): FormArray {
    return this.form.get('items') as FormArray;
  }

  addItem(): void {
    this.itemsFormArray.push(this.createItemControl());
  }

  removeItem(index: number): void {
    if (this.itemsFormArray.length > 1) {
      this.itemsFormArray.removeAt(index);
    }
  }

  loadPacketAllotment(): void {
    if (!this.customerId || !this.getLoanAccountNumber()) {
      this.isEditMode = true;
      this.formLoaded = true;
      return;
    }

    this.isLoading = true;
    this.packetService.getPacketAllotmentDetails(this.customerId, this.getLoanAccountNumber()!).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res && res.data) {
          const data = res.data;
          this.packetAllotmentId = data.id || null;
          this.isDataAvailable = true;
          this.isEditMode = false;
          
          // Load form data
          this.form.patchValue({
            packetId: data.packetId || data.packetNo || ''
          });

          // Load items array
          if (data.items && Array.isArray(data.items) && data.items.length > 0) {
            // Clear existing items
            while (this.itemsFormArray.length > 0) {
              this.itemsFormArray.removeAt(0);
            }
            // Add items from response
            data.items.forEach((item: string) => {
              this.itemsFormArray.push(this.fb.group({ item: [item, Validators.required] }));
            });
          } else if (data.itemList && Array.isArray(data.itemList) && data.itemList.length > 0) {
            // Alternative field name
            while (this.itemsFormArray.length > 0) {
              this.itemsFormArray.removeAt(0);
            }
            data.itemList.forEach((item: string) => {
              this.itemsFormArray.push(this.fb.group({ item: [item, Validators.required] }));
            });
          }
        } else {
          this.isEditMode = true;
        }
        this.formLoaded = true;
      },
      error: (err: any) => {
        this.isLoading = false;
        this.isEditMode = true;
        this.formLoaded = true;
        // Silently handle - no data exists yet
      }
    });
  }

  onEdit(): void {
    this.isEditMode = true;
    this.form.enable();
  }

  onSubmit(): void {
    if (!this.form.valid) {
      this.toastService.showWarning('Please fill all required fields correctly.');
      return;
    }

    if (!this.customerId || !this.getLoanAccountNumber()) {
      this.toastService.showError('Customer ID and Loan Account Number are required.');
      return;
    }

    // Extract items array from form
    const items: string[] = this.itemsFormArray.controls
      .map(control => control.get('item')?.value)
      .filter(item => item && item.trim() !== '');

    if (items.length === 0) {
      this.toastService.showWarning('Please add at least one item.');
      return;
    }

    const packetId = this.form.value.packetId;

    this.isLoading = true;

    if (this.packetAllotmentId) {
      // Update existing packet allotment
      this.packetService.updatePocketAllotment(
        this.customerId,
        this.getLoanAccountNumber()!,
        this.packetAllotmentId.toString(),
        packetId,
        items
      ).subscribe({
        next: (res: any) => {
          this.isLoading = false;
          this.toastService.showSuccess('Packet allotment updated successfully!');
          this.isEditMode = false;
          this.isDataAvailable = true;
          this.stepCompleted.emit();
          this.loadPacketAllotment(); // Reload to get updated data
        },
        error: (err: any) => {
          this.isLoading = false;
          const errorMsg = err?.error?.message || 'Failed to update packet allotment. Please try again.';
          this.toastService.showError(errorMsg);
        }
      });
    } else {
      // Create new packet allotment
      this.packetService.savePocketAllotment(
        this.customerId,
        this.getLoanAccountNumber()!,
        packetId,
        items
      ).subscribe({
        next: (res: any) => {
          this.isLoading = false;
          this.toastService.showSuccess('Packet allotment saved successfully!');
          this.packetAllotmentId = res?.data?.id || null;
          this.isEditMode = false;
          this.isDataAvailable = true;
          this.stepCompleted.emit();
          this.loadPacketAllotment(); // Reload to get saved data
        },
        error: (err: any) => {
          this.isLoading = false;
          const errorMsg = err?.error?.message || 'Failed to save packet allotment. Please try again.';
          this.toastService.showError(errorMsg);
        }
      });
    }
  }

  incrementPacketId(): void {
    const currentValue = Number(this.form.get('packetId')?.value || 0);
    this.form.patchValue({ packetId: currentValue + 1 });
  }

  decrementPacketId(): void {
    const currentValue = Number(this.form.get('packetId')?.value || 0);
    if (currentValue > 0) {
      this.form.patchValue({ packetId: currentValue - 1 });
    }
  }
}

