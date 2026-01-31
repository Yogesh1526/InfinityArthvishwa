import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './layout/dashboard/dashboard.component';
import { LayoutComponent } from './layout/layout/layout.component';
import { AuthGuard } from './auth/auth.guard';
import { LoginGuard } from './auth/login.guard';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { WorklistComponent } from './layout/worklist/worklist.component';
import { BasicDetailsComponent } from './layout/basic-details/basic-details.component';
import { LoanInfoComponent } from './layout/loan-info/loan-info.component';
import { LoanApplicationWizardComponent } from './layout/loan-application-wizard/loan-application-wizard.component';
import { LoanInfoDetailsTableComponent } from './pages/loan-info-details-table/loan-info-details-table.component';
import { CustomerProfileComponent } from './layout/customer-profile/customer-profile.component';
import { RoleListComponent } from './layout/roles-permissions/role-list/role-list.component';
import { RoleFormComponent } from './layout/roles-permissions/role-form/role-form.component';
import { RoleViewComponent } from './layout/roles-permissions/role-view/role-view.component';
import { GoldRateComponent } from './layout/gold-rate/gold-rate.component';
import { UserListComponent } from './layout/user-management/user-list/user-list.component';
import { UserFormComponent } from './layout/user-management/user-form/user-form.component';
import { UserViewComponent } from './layout/user-management/user-view/user-view.component';
import { RoleGuard } from './auth/role.guard';

const routes: Routes = [
  // Default path redirects to login
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Login route - protected by LoginGuard to prevent logged-in users from accessing
  { 
    path: 'login', 
    component: LoginComponent,
    canActivate: [LoginGuard]
  },

  // Registration - public
  { 
    path: 'register', 
    component: RegisterComponent,
    canActivate: [LoginGuard]
  },

  // All protected routes - require authentication
  // Using a common parent route with LayoutComponent
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard], // This guard protects ALL child routes
    children: [
      { 
        path: 'dashboard', 
        component: DashboardComponent,
        canActivate: [AuthGuard]
      },
      { 
        path: 'worklist', 
        component: WorklistComponent,
        canActivate: [AuthGuard]
      },
      { 
        path: 'basic-details/:id', 
        component: BasicDetailsComponent,
        canActivate: [AuthGuard]
      },
      { 
        path: 'customer-profile/:id', 
        component: CustomerProfileComponent,
        canActivate: [AuthGuard]
      },
      { 
        path: 'loan-info', 
        component: LoanInfoComponent,
        canActivate: [AuthGuard]
      },
      // Roles & Permissions - Admin Only
      { 
        path: 'roles', 
        component: RoleListComponent,
        canActivate: [AuthGuard, RoleGuard]
      },
      { 
        path: 'roles/create', 
        component: RoleFormComponent,
        canActivate: [AuthGuard, RoleGuard]
      },
      { 
        path: 'roles/edit/:id', 
        component: RoleFormComponent,
        canActivate: [AuthGuard, RoleGuard]
      },
      { 
        path: 'roles/view/:id', 
        component: RoleViewComponent,
        canActivate: [AuthGuard, RoleGuard]
      },
      { 
        path: 'loan-wizard/:id', 
        component: LoanApplicationWizardComponent,
        canActivate: [AuthGuard]
      },
      { 
        path: 'loan-info-details', 
        component: LoanInfoDetailsTableComponent,
        canActivate: [AuthGuard]
      },
      { 
        path: 'gold-rate', 
        component: GoldRateComponent,
        canActivate: [AuthGuard]
      },
      { 
        path: 'users', 
        component: UserListComponent,
        canActivate: [AuthGuard, RoleGuard]
      },
      { 
        path: 'users/create', 
        component: UserFormComponent,
        canActivate: [AuthGuard, RoleGuard]
      },
      { 
        path: 'users/edit/:id', 
        component: UserFormComponent,
        canActivate: [AuthGuard, RoleGuard]
      },
      { 
        path: 'users/view/:id', 
        component: UserViewComponent,
        canActivate: [AuthGuard, RoleGuard]
      }
    ]
  },

  // Fallback route - redirect to login
  { path: '**', redirectTo: 'login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
