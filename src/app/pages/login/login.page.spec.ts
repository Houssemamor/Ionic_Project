import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { TmdbService } from '../../services/tmdb.service';
import { LoginPage } from './login.page';

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: TmdbService,
          useValue: {
            nowPlayingHighlights: vi.fn().mockResolvedValue([]),
          },
        },
      ],
    });
    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('affiche le diaporama au-dessus du panneau de connexion', () => {
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('app-login-hero')).not.toBeNull();
    expect(element.querySelector('.auth-panel form')).not.toBeNull();
  });
});
