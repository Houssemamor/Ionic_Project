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
            logout: () => Promise.resolve(),
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

  it('memorise la langue globale choisie dans le profil', () => {
    expect(component.i18n.language()).toBe('fr');

    component.changeLanguage('en');

    expect(component.i18n.language()).toBe('en');
    expect(component.i18n.t('profile.title')).toBe('My profile');
    expect(localStorage.getItem('movieDataLanguage')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('traduit toute la page apres un changement de langue', async () => {
    await component.ngOnInit();
    fixture.detectChanges();

    component.changeLanguage('en');
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('ion-title')?.textContent).toContain('My profile');
    expect(element.textContent).toContain('Information');
    expect(element.textContent).toContain('Sign out');
    expect(element.textContent).toContain('Ada Lovelace');
  });

  it('loads the authenticated user profile after auth state restoration', async () => {
    await component.ngOnInit();

    expect(component.profile()?.email).toBe('ada@example.com');
    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBe('');
  });

  it('affiche les initiales lorsque le profil na pas de photo', async () => {
    await component.ngOnInit();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.avatar-initials')?.textContent).toContain('AL');
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

  it('affiche un message traduit si la deconnexion echoue', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: Auth,
          useValue: {
            waitForAuthState: () => Promise.resolve({ uid: 'user-1' }),
            getCurrentProfile: () => Promise.resolve(null),
            logout: () => Promise.reject(new Error('Network request failed')),
          },
        },
      ],
    });
    const failedFixture = TestBed.createComponent(ProfilePage);
    const failedPage = failedFixture.componentInstance;

    await failedPage.logout();

    expect(failedPage.errorMessage()).toBe('La déconnexion a échoué.');
    expect(failedPage.isLoggingOut()).toBe(false);
  });
});
