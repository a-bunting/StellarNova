import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TradeRoutesComponent } from './trade-routes.component';

describe('TradeRoutesComponent', () => {
  let component: TradeRoutesComponent;
  let fixture: ComponentFixture<TradeRoutesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TradeRoutesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TradeRoutesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
