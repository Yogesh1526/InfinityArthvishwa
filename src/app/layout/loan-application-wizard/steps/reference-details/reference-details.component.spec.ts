import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReferenceDetailsComponent } from './reference-details.component';

describe('ReferenceDetailsComponent', () => {
  let component: ReferenceDetailsComponent;
  let fixture: ComponentFixture<ReferenceDetailsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ReferenceDetailsComponent]
    });
    fixture = TestBed.createComponent(ReferenceDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
