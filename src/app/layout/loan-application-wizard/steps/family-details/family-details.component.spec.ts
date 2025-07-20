import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FamilyDetailsComponent } from './family-details.component';

describe('FamilyDetailsComponent', () => {
  let component: FamilyDetailsComponent;
  let fixture: ComponentFixture<FamilyDetailsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FamilyDetailsComponent]
    });
    fixture = TestBed.createComponent(FamilyDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
