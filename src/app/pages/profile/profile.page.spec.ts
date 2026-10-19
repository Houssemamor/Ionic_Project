import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Auth } from '../../services/auth';
import { ProfilePage } from './profile.page';

describe('ProfilePage', () => {
  let component: ProfilePage;
  let fixture: ComponentFixture<ProfilePage>;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: Auth,
          useValue: {
            waitForAuthState: () => Promise.resolve({ uid: 'user-1' }),
            getCurrentProfile: () => Promise.resolve({
              id: 'user-1',
              firstName: 'Ada',
              lastName: 'Lovelace',
              age: 36,
              email: 'ada@example.com',
              role: 'user',
              active: true,
            }),
          },
        },
      ],
    });
    fixture = TestBed.createComponent(ProfilePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('memorise la langue des films choisie dans le profil', () => {
    expect(component.language()).toBe('fr');

    component.changeLanguage('en');

    expect(component.language()).toBe('en');
    expect(localStorage.getItem('movieDataLanguage')).toBe('en');
  });

  it('loads the authenticated user profile after auth state restoration', async () => {
    await component.ngOnInit();

    expect(component.profile()?.email).toBe('ada@example.com');
    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBe('');
  });

  it('stops loading and shows an error when no user is authenticated', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: Auth,
          useValue: {
            waitForAuthState: () => Promise.resolve(null),
            getCurrentProfile: () => Promise.resolve(null),
          },
        },
      ],
    });
    const unauthenticatedFixture = TestBed.createComponent(ProfilePage);
    const unauthenticatedPage = unauthenticatedFixture.componentInstance;

    await unauthenticatedPage.ngOnInit();

    expect(unauthenticatedPage.profile()).toBeNull();
    expect(unauthenticatedPage.isLoading()).toBe(false);
    expect(unauthenticatedPage.errorMessage()).toBe('Profil utilisateur introuvable.');
  });
});
