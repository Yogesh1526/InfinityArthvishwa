import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SecondValuationComponent } from './second-valuation.component';

describe('SecondValuationComponent', () => {
  let component: SecondValuationComponent;
  let fixture: ComponentFixture<SecondValuationComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [SecondValuationComponent]
    });
    fixture = TestBed.createComponent(SecondValuationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
