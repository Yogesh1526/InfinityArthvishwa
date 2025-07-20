import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FirstValuationComponent } from './first-valuation.component';

describe('FirstValuationComponent', () => {
  let component: FirstValuationComponent;
  let fixture: ComponentFixture<FirstValuationComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FirstValuationComponent]
    });
    fixture = TestBed.createComponent(FirstValuationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
