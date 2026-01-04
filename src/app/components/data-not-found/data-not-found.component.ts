import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-data-not-found',
  templateUrl: './data-not-found.component.html',
  styleUrls: ['./data-not-found.component.css']
})
export class DataNotFoundComponent {
  @Input() message: string = 'No data found';
  @Input() icon: string = 'search_off';
  @Input() showAction: boolean = false;
  @Input() actionLabel: string = 'Go Back';
  @Input() actionRoute: string = '/dashboard';
}

