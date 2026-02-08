import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './sidebar/sidebar.component';
import { HeaderComponent } from './header/header.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { LayoutComponent } from './layout/layout.component';
import { MaterialModule } from '../material.module';
import { RouterModule } from '@angular/router';
import { ChartDialogComponent } from './chart-dialog/chart-dialog.component';
import { NgxEchartsModule } from 'ngx-echarts';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { WorklistComponent } from './worklist/worklist.component';
import { BasicDetailsComponent } from './basic-details/basic-details.component';
import { LoanInfoComponent } from './loan-info/loan-info.component';
import { LoanApplicationWizardComponent } from './loan-application-wizard/loan-application-wizard.component';
import { PersonalDetailsComponent } from './loan-application-wizard/steps/personal-details/personal-details.component';
import { FamilyDetailsComponent } from './loan-application-wizard/steps/family-details/family-details.component';
import { AddressActivityComponent } from './loan-application-wizard/steps/address-activity/address-activity.component';
import { HttpClientModule } from '@angular/common/http';
import { WorkDetailsComponent } from './loan-application-wizard/steps/work-details/work-details.component';
import { KycDetailsComponent } from './loan-application-wizard/steps/kyc-details/kyc-details.component';
import { AdditionalDocumentsComponent } from './loan-application-wizard/steps/additional-documents/additional-documents.component';
import { ClientDocumentsComponent } from './loan-application-wizard/steps/client-documents/client-documents.component';
import { NomineeComponent } from './loan-application-wizard/steps/nominee/nominee.component';
import { ReferenceDetailsComponent } from './loan-application-wizard/steps/reference-details/reference-details.component';
import { GoldOwnershipDetailsComponent } from './loan-application-wizard/steps/gold-ownership-details/gold-ownership-details.component';
import { FirstValuationComponent } from './loan-application-wizard/steps/first-valuation/first-valuation.component';
import { AddJewelleryDialogComponent } from './loan-application-wizard/steps/add-jewellery-dialog/add-jewellery-dialog.component';
import { SecondValuationComponent } from './loan-application-wizard/steps/second-valuation/second-valuation.component';
import { FinalValuationComponent } from './loan-application-wizard/steps/final-valuation/final-valuation.component';
import { BankDetailsComponent } from './loan-application-wizard/steps/bank-details/bank-details.component';
import { PacketAllotmentComponent } from './loan-application-wizard/steps/packet-allotment/packet-allotment.component';
import { GlSchemeSelectionComponent } from './loan-application-wizard/steps/gl-scheme-selection/gl-scheme-selection.component';
import { TareWeightComponent } from './loan-application-wizard/steps/tare-weight/tare-weight.component';
import { CashSplitComponent } from './loan-application-wizard/steps/cash-split/cash-split.component';
import { ExpectedClosureDateComponent } from './loan-application-wizard/steps/expected-closure-date/expected-closure-date.component';
import { LoanApplicationApprovalComponent } from './loan-application-wizard/steps/loan-application-approval/loan-application-approval.component';
import { DisbursementDetailsComponent } from './loan-application-wizard/steps/disbursement-details/disbursement-details.component';
import { LoanAgreementDocumentComponent } from './loan-application-wizard/steps/loan-agreement-document/loan-agreement-document.component';
import { ScannedDocumentComponent } from './loan-application-wizard/steps/scanned-document/scanned-document.component';
import { WebcamComponent } from './loan-application-wizard/steps/webcam/webcam.component';
import { WebcamModule } from 'ngx-webcam';
import { CustomerProfileComponent } from './customer-profile/customer-profile.component';
import { AddNewLoanDialogComponent } from './customer-profile/add-new-loan-dialog/add-new-loan-dialog.component';
import { RoleListComponent } from './roles-permissions/role-list/role-list.component';
import { RoleFormComponent } from './roles-permissions/role-form/role-form.component';
import { RoleViewComponent } from './roles-permissions/role-view/role-view.component';
import { GoldRateComponent } from './gold-rate/gold-rate.component';
import { UserListComponent } from './user-management/user-list/user-list.component';
import { UserFormComponent } from './user-management/user-form/user-form.component';
import { UserViewComponent } from './user-management/user-view/user-view.component';
// Loan Release Wizard Components
import { LoanReleaseWizardComponent } from './loan-release-wizard/loan-release-wizard.component';
import { ReleaseAuthorizationComponent } from './loan-release-wizard/steps/release-authorization/release-authorization.component';
import { OutstandingDetailsComponent } from './loan-release-wizard/steps/outstanding-details/outstanding-details.component';
import { PaymentDetailsComponent } from './loan-release-wizard/steps/payment-details/payment-details.component';
import { ReleaseDocumentComponent } from './loan-release-wizard/steps/release-document/release-document.component';



@NgModule({
  declarations: [
    SidebarComponent,
    HeaderComponent,
    DashboardComponent,
    LayoutComponent,
    ChartDialogComponent,
    WorklistComponent,
    BasicDetailsComponent,
    LoanInfoComponent,
    LoanApplicationWizardComponent,
    CustomerProfileComponent,
    AddNewLoanDialogComponent,
    RoleListComponent,
    RoleFormComponent,
    RoleViewComponent,
    GoldRateComponent,
    UserListComponent,
    UserFormComponent,
    UserViewComponent,
    PersonalDetailsComponent,
    FamilyDetailsComponent,
    AddressActivityComponent,
    WorkDetailsComponent,
    KycDetailsComponent,
    AdditionalDocumentsComponent,
    ClientDocumentsComponent,
    NomineeComponent,
    ReferenceDetailsComponent,
    GoldOwnershipDetailsComponent,
    FirstValuationComponent,
    AddJewelleryDialogComponent,
    SecondValuationComponent,
    FinalValuationComponent,
    BankDetailsComponent,
    PacketAllotmentComponent,
    GlSchemeSelectionComponent,
    TareWeightComponent,
    CashSplitComponent,
    ExpectedClosureDateComponent,
    LoanApplicationApprovalComponent,
    DisbursementDetailsComponent,
    LoanAgreementDocumentComponent,
    ScannedDocumentComponent,
    WebcamComponent,
    // Loan Release Wizard
    LoanReleaseWizardComponent,
    ReleaseAuthorizationComponent,
    OutstandingDetailsComponent,
    PaymentDetailsComponent,
    ReleaseDocumentComponent
  ],
  imports: [
    CommonModule,RouterModule,MaterialModule,FormsModule,ReactiveFormsModule,HttpClientModule,WebcamModule,
    NgxEchartsModule.forRoot({
      echarts: () => import('echarts') // Lazy load ECharts
    })
  ],
  exports: [
    SidebarComponent,
    HeaderComponent,
    DashboardComponent,
    LayoutComponent,
    WorklistComponent,
    BasicDetailsComponent,
    LoanInfoComponent,
    LoanApplicationWizardComponent,
    LoanReleaseWizardComponent,
    CustomerProfileComponent,
    RoleListComponent,
    RoleFormComponent,
    GoldRateComponent,
    UserListComponent,
    UserFormComponent,
    UserViewComponent
  ]
})
export class LayoutModule { }
