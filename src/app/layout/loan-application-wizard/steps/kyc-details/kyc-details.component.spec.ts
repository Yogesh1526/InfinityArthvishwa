import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KycDetailsComponent } from './kyc-details.component';

describe('KycDetailsComponent', () => {
  let component: KycDetailsComponent;
  let fixture: ComponentFixture<KycDetailsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [KycDetailsComponent]
    });
    fixture = TestBed.createComponent(KycDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
