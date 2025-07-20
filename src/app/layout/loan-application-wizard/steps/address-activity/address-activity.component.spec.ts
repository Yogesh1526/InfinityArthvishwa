import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddressActivityComponent } from './address-activity.component';

describe('AddressActivityComponent', () => {
  let component: AddressActivityComponent;
  let fixture: ComponentFixture<AddressActivityComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AddressActivityComponent]
    });
    fixture = TestBed.createComponent(AddressActivityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
