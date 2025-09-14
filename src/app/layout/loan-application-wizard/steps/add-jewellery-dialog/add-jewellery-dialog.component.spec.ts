import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddJewelleryDialogComponent } from './add-jewellery-dialog.component';

describe('AddJewelleryDialogComponent', () => {
  let component: AddJewelleryDialogComponent;
  let fixture: ComponentFixture<AddJewelleryDialogComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AddJewelleryDialogComponent]
    });
    fixture = TestBed.createComponent(AddJewelleryDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
