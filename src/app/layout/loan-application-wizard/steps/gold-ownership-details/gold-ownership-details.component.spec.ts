import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GoldOwnershipDetailsComponent } from './gold-ownership-details.component';

describe('GoldOwnershipDetailsComponent', () => {
  let component: GoldOwnershipDetailsComponent;
  let fixture: ComponentFixture<GoldOwnershipDetailsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [GoldOwnershipDetailsComponent]
    });
    fixture = TestBed.createComponent(GoldOwnershipDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
