import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientDocumentsComponent } from './client-documents.component';

describe('ClientDocumentsComponent', () => {
  let component: ClientDocumentsComponent;
  let fixture: ComponentFixture<ClientDocumentsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ClientDocumentsComponent]
    });
    fixture = TestBed.createComponent(ClientDocumentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
