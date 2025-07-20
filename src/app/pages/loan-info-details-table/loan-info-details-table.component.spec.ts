import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanInfoDetailsTableComponent } from './loan-info-details-table.component';

describe('LoanInfoDetailsTableComponent', () => {
  let component: LoanInfoDetailsTableComponent;
  let fixture: ComponentFixture<LoanInfoDetailsTableComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [LoanInfoDetailsTableComponent]
    });
    fixture = TestBed.createComponent(LoanInfoDetailsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
