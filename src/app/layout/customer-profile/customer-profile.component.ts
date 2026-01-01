import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PersonalDetailsService } from '../../services/PersonalDetailsService';
import { ToastService } from '../../services/toast.service';
import { LoaderService } from '../../services/loader.service';

@Component({
  selector: 'app-customer-profile',
  templateUrl: './customer-profile.component.html',
  styleUrls: ['./customer-profile.component.css']
})
export class CustomerProfileComponent implements OnInit {
  customerId: string | null = null;
  customer: any = null;
  loans: any[] = [];
  isLoading = false;
  selectedTabIndex = 0; // 0: details, 1: loans, 2: documents

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private apiService: PersonalDetailsService,
    private toastService: ToastService,
    public loaderService: LoaderService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.customerId = params.get('id');
      if (this.customerId) {
        // API calls commented out for layout improvement
        // this.loadCustomerDetails();
        // this.loadLoans();
        
        // Mock data for layout development
        this.loadMockData();
      } else {
        this.toastService.showError('Customer ID is required');
        this.router.navigate(['/loan-info-details']);
      }
    });
  }

  // Mock data loader for layout development
  loadMockData(): void {
    this.isLoading = false;
    this.customer = {
      customerId: this.customerId || 'CN0599644834286',
      firstName: 'John',
      middleName: 'Michael',
      lastName: 'Doe',
      dateOfBirth: new Date('1990-05-15'),
      gender: 'Male',
      maritalStatus: 'Married',
      mobileNumber: '9876543210',
      alternateMobileNumber: '9876543211',
      email: 'john.doe@example.com',
      office: 'Bhosari',
      education: 'Postgraduate',
      preferredLanguage: 'Marathi',
      religion: 'Hindu',
      nationality: 'Indian',
      riskCategory: 'Medium',
      clientType: 'Premium',
      externalId: 'EXT123456',
      submittedDate: new Date(),
      applicationStatus: 'Active',
      note: 'Customer is verified and active'
    };
    this.loans = [];
  }

  // API calls commented out for layout improvement
  // loadCustomerDetails(): void {
  //   if (!this.customerId) return;
  //   
  //   this.isLoading = true;
  //   this.apiService.getById(this.customerId).subscribe({
  //     next: (res) => {
  //       this.isLoading = false;
  //       if (res?.data) {
  //         this.customer = res.data;
  //       } else {
  //         this.toastService.showError('Customer not found');
  //         this.router.navigate(['/loan-info-details']);
  //       }
  //     },
  //     error: (err) => {
  //       this.isLoading = false;
  //       this.toastService.showError('Failed to load customer details');
  //       console.error(err);
  //     }
  //   });
  // }

  // loadLoans(): void {
  //   if (!this.customerId) return;
  //   
  //   // TODO: Replace with actual API call to get loans for this customer
  //   // For now, using mock data structure
  //   this.loans = [
  //     // This will be populated from API
  //   ];
  //   
  //   // Example API call (uncomment when API is ready):
  //   // this.apiService.getLoansByCustomerId(this.customerId).subscribe({
  //   //   next: (res) => {
  //   //     if (res?.data) {
  //   //       this.loans = Array.isArray(res.data) ? res.data : [res.data];
  //   //     }
  //   //   },
  //   //   error: (err) => {
  //   //     console.error('Failed to load loans:', err);
  //   //   }
  //   // });
  // }

  editCustomer(): void {
    if (this.customerId) {
      this.router.navigate(['/basic-details', this.customerId]);
    }
  }

  addNewLoan(): void {
    if (this.customerId) {
      this.router.navigate(['/loan-wizard', this.customerId]);
    }
  }

  viewLoan(loanId: string): void {
    if (this.customerId) {
      this.router.navigate(['/loan-wizard', this.customerId], { 
        queryParams: { loanId } 
      });
    }
  }

  getLoanStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'active': 'status-active',
      'pending': 'status-pending',
      'approved': 'status-approved',
      'rejected': 'status-rejected',
      'closed': 'status-closed',
      'disbursed': 'status-disbursed'
    };
    return statusMap[status?.toLowerCase()] || 'status-default';
  }

  getLoanStatusLabel(status: string): string {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }

  getStatusIcon(status: string): string {
    const statusLower = status?.toLowerCase() || '';
    const iconMap: { [key: string]: string } = {
      'pending': 'hourglass_empty',
      'approved': 'check_circle',
      'active': 'play_circle',
      'rejected': 'cancel',
      'closed': 'lock',
      'disbursed': 'account_balance_wallet'
    };
    return iconMap[statusLower] || 'info';
  }

  goBack(): void {
    this.router.navigate(['/loan-info-details']);
  }

  setActiveTab(index: number): void {
    this.selectedTabIndex = index;
  }
}

