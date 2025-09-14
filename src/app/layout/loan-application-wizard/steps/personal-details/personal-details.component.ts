import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PersonalDetailsService } from 'src/app/Services/PersonalDetailsService';

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
    private router: Router
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
    this.router.navigate(['/edit-personal-details', this.customerId]);
  }
}
