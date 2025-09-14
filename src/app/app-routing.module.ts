import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './layout/dashboard/dashboard.component';
import { LayoutComponent } from './layout/layout/layout.component';
import { AuthGuard } from './auth/auth.guard';
import { LoginComponent } from './login/login.component';
import { WorklistComponent } from './layout/worklist/worklist.component';
import { BasicDetailsComponent } from './layout/basic-details/basic-details.component';
import { LoanInfoComponent } from './layout/loan-info/loan-info.component';
import { LoanApplicationWizardComponent } from './layout/loan-application-wizard/loan-application-wizard.component';
import { LoanInfoDetailsTableComponent } from './pages/loan-info-details-table/loan-info-details-table.component';

const routes: Routes = [
  // Default path redirects to login
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Login route
  { path: 'login', component: LoginComponent },

  // Protected dashboard route
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'worklist', component: WorklistComponent},
      { path: 'basic-details', component: BasicDetailsComponent},
      { path: 'loan-info', component: LoanInfoComponent },
      { path: 'loan-wizard/:id', component: LoanApplicationWizardComponent },
      { path: 'loan-info-details', component: LoanInfoDetailsTableComponent}
    ]
  },

  // Fallback route
  { path: '**', redirectTo: 'login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
