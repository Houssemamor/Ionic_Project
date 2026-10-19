import { TestBed } from '@angular/core/testing';
import { Dislike } from './dislike';

describe('Dislike', () => {
  let service: Dislike;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(Dislike);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
