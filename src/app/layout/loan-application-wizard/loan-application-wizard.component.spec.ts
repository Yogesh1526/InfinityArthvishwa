import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanApplicationWizardComponent } from './loan-application-wizard.component';

describe('LoanApplicationWizardComponent', () => {
  let component: LoanApplicationWizardComponent;
  let fixture: ComponentFixture<LoanApplicationWizardComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [LoanApplicationWizardComponent]
    });
    fixture = TestBed.createComponent(LoanApplicationWizardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
