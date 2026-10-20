import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { Camera } from '@capacitor/camera';
import { CameraResultType } from '@capacitor/camera';
import { Auth } from '../../services/auth';
import { ProfilePage } from './profile.page';

vi.mock('@capacitor/camera', () => ({
  Camera: { getPhoto: vi.fn() },
  CameraResultType: { DataUrl: 'dataUrl' },
  CameraSource: { Prompt: 'prompt' },
}));

describe('ProfilePage', () => {
  let component: ProfilePage;
  let fixture: ComponentFixture<ProfilePage>;
  let updateProfilePhoto: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    updateProfilePhoto = vi.fn().mockResolvedValue('data:image/jpeg;base64,new-photo');
    class FakeImage {
      width = 1024;
      height = 768;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.unstubAllGlobals();
    vi.stubGlobal('Image', FakeImage);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/jpeg;base64,prepared',
    );
    vi.mocked(Camera.getPhoto).mockResolvedValue({ dataUrl: 'data:image/jpeg;base64,raw' } as never);
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
            updateProfilePhoto,
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

  it('propose un bouton accessible pour changer la photo', async () => {
    await component.ngOnInit();
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.photo-button');
    expect(button?.getAttribute('aria-label')).toBe('Changer la photo de profil');
  });

  it('enregistre la photo choisie et met a jour l avatar', async () => {
    await component.ngOnInit();
    vi.mocked(Camera.getPhoto).mockResolvedValue({ dataUrl: 'data:image/jpeg;base64,raw' } as never);

    await component.changePhoto();
    fixture.detectChanges();

    expect(Camera.getPhoto).toHaveBeenCalledWith(expect.objectContaining({
      allowEditing: true,
      resultType: CameraResultType.DataUrl,
      // Sans PWA Elements, le prompt web resterait bloque sur un custom
      // element inexistant : le file input doit etre force.
      webUseInput: true,
    }));
    expect(updateProfilePhoto).toHaveBeenCalledWith('data:image/jpeg;base64,prepared');
    expect(component.profile()?.photoUrl).toBe('data:image/jpeg;base64,new-photo');
    expect(fixture.nativeElement.querySelector('img.avatar')?.getAttribute('src'))
      .toBe('data:image/jpeg;base64,new-photo');
    expect(component.isUpdatingPhoto()).toBe(false);
  });

  it('ignore une annulation de la galerie sans afficher derreur', async () => {
    await component.ngOnInit();
    vi.mocked(Camera.getPhoto).mockRejectedValue(new Error('User cancelled photos app'));

    await component.changePhoto();

    expect(component.photoErrorMessage()).toBe('');
    expect(updateProfilePhoto).not.toHaveBeenCalled();
    expect(component.isUpdatingPhoto()).toBe(false);
  });

  it('affiche un message traduit si la mise a jour echoue', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await component.ngOnInit();
    vi.mocked(Camera.getPhoto).mockResolvedValue({ dataUrl: 'data:image/jpeg;base64,raw' } as never);
    updateProfilePhoto.mockRejectedValueOnce(new Error('permission-denied'));

    await component.changePhoto();

    expect(component.photoErrorMessage()).toBe(
      'Impossible de mettre à jour la photo de profil.',
    );
    expect(component.isUpdatingPhoto()).toBe(false);
    consoleError.mockRestore();
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
