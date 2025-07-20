import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdditionalDocumentsComponent } from './additional-documents.component';

describe('AdditionalDocumentsComponent', () => {
  let component: AdditionalDocumentsComponent;
  let fixture: ComponentFixture<AdditionalDocumentsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AdditionalDocumentsComponent]
    });
    fixture = TestBed.createComponent(AdditionalDocumentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
