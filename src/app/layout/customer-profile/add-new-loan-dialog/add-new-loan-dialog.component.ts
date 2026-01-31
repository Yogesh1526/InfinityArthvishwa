import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { UserManagementService } from '../../../services/user-management.service';
import { PersonalDetailsService } from '../../../services/PersonalDetailsService';
import { ToastService } from '../../../services/toast.service';

export interface AddNewLoanDialogData {
  customerId: string;
}

export interface AddNewLoanDialogResult {
  customerId: string;
  loanAccountNumber?: string;
  loanPurpose: string;
  relationshipManager: string;
  relationshipManagerId?: number;
  sourcingChannel: string;
}

@Component({
  selector: 'app-add-new-loan-dialog',
  templateUrl: './add-new-loan-dialog.component.html',
  styleUrls: ['./add-new-loan-dialog.component.css']
})
export class AddNewLoanDialogComponent implements OnInit {
  form: FormGroup;
  isSubmitting = false;
  relationshipManagers: { userId: number; name: string; userName: string }[] = [];

  loanPurposeOptions = [
    'Gold Loan',
    'Wedding',
    'Education',
    'Medical',
    'Business',
    'Personal',
    'Agriculture',
    'Home Renovation',
    'Other'
  ];

  sourcingChannelOptions = [
    'Direct',
    'Referral',
    'Branch',
    'Online',
    'Agent',
    'Walk-in',
    'Social Media',
    'Other'
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddNewLoanDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AddNewLoanDialogData,
    private userService: UserManagementService,
    private loanService: PersonalDetailsService,
    private toast: ToastService
  ) {
    this.form = this.fb.group({
      loanPurpose: ['', Validators.required],
      relationshipManager: ['', Validators.required],
      sourcingChannel: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadRelationshipManagers();
  }

  private loadRelationshipManagers(): void {
    this.userService.getAllUsers(0, 100).subscribe({
      next: (res) => {
        const content = res?.content ?? [];
        this.relationshipManagers = content
          .filter((u: any) => !u.isDeleted && (u.status?.toLowerCase() !== 'inactive'))
          .map((u: any) => ({
            userId: u.userId,
            name: u.name || u.userName || 'Unknown',
            userName: u.userName || ''
          }));
      },
      error: () => {
        this.relationshipManagers = [];
      }
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const val = this.form.value;
    const selected = this.relationshipManagers.find(
      rm => rm.userId === val.relationshipManager || rm.userName === val.relationshipManager
    );
    const relationShipManager = selected ? selected.name : String(val.relationshipManager);

    const body = {
      customerId: this.data.customerId,
      loanPurpose: val.loanPurpose,
      relationShipManager,
      sourceChannel: val.sourcingChannel
    };

    this.isSubmitting = true;
    this.loanService.addNewLoanAccount(body).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        const success = res?.code === 200 || res?.code === 201 || res?.success;
        if (success) {
          this.toast.showSuccess('Loan account created successfully.');
          const data = res?.data || {};
          this.dialogRef.close({
            customerId: data.customerId || this.data.customerId,
            loanAccountNumber: data.loanAccountNumber,
            loanPurpose: val.loanPurpose,
            relationshipManager: relationShipManager,
            relationshipManagerId: selected?.userId,
            sourcingChannel: val.sourcingChannel
          });
        } else {
          this.toast.showError(res?.message || 'Failed to create loan account.');
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        this.toast.showError(err?.error?.message || 'Failed to create loan account. Please try again.');
        console.error('Add new loan account error:', err);
      }
    });
  }
}
