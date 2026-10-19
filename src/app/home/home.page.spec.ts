import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { HomePage } from './home.page';
import { Auth } from '../services/auth';
import { Dislike } from '../services/dislike';
import { Favorite } from '../services/favorite';
import { TmdbService } from '../services/tmdb.service';
import { TranslationService } from '../i18n/translation.service';
import { Dislike as DislikeModel } from '../models/dislike.model';
import { Favorite as FavoriteModel } from '../models/favorite.model';
import { UserProfile } from '../models/user.model';
import { Movie } from '../models/movie.model';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;
  let profile: UserProfile;
  let favorites: FavoriteModel[];
  let dislikes: DislikeModel[];
  let getCurrentProfile: ReturnType<typeof vi.fn>;
  let listFavorites: ReturnType<typeof vi.fn>;
  let listDislikes: ReturnType<typeof vi.fn>;
  let recommend: ReturnType<typeof vi.fn>;

  const recommended: Movie[] = [
    {
      id: 'tmdb-1', title: 'Premier film', overview: '', posterPath: 'poster-1.jpg', voteAverage: 8.2,
    },
    {
      id: 'tmdb-2', title: 'Deuxieme film', overview: '', posterPath: 'poster-2.jpg', voteAverage: 7.1,
    },
  ];

  beforeEach(() => {
    localStorage.clear();
    profile = {
      id: 'user-1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      age: 36,
      email: 'ada@example.com',
      role: 'user',
      active: true,
    };
    favorites = [
      { id: 'fav-1', tmdbId: 10, title: 'Favori', overview: '', genres: ['Action'] },
    ];
    dislikes = [
      { id: 'tmdb-20', movieId: 'tmdb-20', tmdbId: 20 },
    ];
    getCurrentProfile = vi.fn().mockImplementation(() => Promise.resolve(profile));
    listFavorites = vi.fn().mockImplementation(() => Promise.resolve(favorites));
    listDislikes = vi.fn().mockImplementation(() => Promise.resolve(dislikes));
    recommend = vi.fn().mockResolvedValue({ genreName: 'Action', movies: recommended });

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: Auth,
          useValue: {
            waitForAuthState: () => Promise.resolve({ uid: 'user-1' }),
            getCurrentProfile,
          },
        },
        { provide: Favorite, useValue: { list: listFavorites } },
        { provide: Dislike, useValue: { list: listDislikes } },
        { provide: TmdbService, useValue: { recommend } },
      ],
    });
    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
  });

  /** ngOnInit est asynchrone : on attend les services avant de rendre le DOM. */
  async function init(): Promise<void> {
    await component.ngOnInit();
    fixture.detectChanges();
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('affiche le bloc identite et le lien vers le profil', async () => {
    await init();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.greeting')?.textContent).toContain('Bonjour Ada');
    expect(element.querySelector('.identity')?.getAttribute('href')).toBe('/profile');
    expect(element.querySelectorAll('.tile').length).toBe(3);
  });

  it('affiche trois recommandations basees sur le genre dominant', async () => {
    await init();

    expect(recommend).toHaveBeenCalledWith(['Action'], [10, 20], 3);
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.recommendations h2')?.textContent).toContain('Recommandé pour vous');
    expect(element.querySelector('.reason')?.textContent).toContain('Action');
    expect(element.querySelectorAll('.recommendation').length).toBe(2);
  });

  it('masque les recommandations sans favori et n appelle pas TMDB', async () => {
    favorites = [];
    recommend.mockResolvedValue({ genreName: '', movies: [] });

    await init();

    expect(recommend).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.recommendations')).toBeNull();
  });

  it('continue les recommandations si les dislikes ne se chargent pas', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    listDislikes.mockRejectedValueOnce(new Error('network'));

    await init();

    expect(recommend).toHaveBeenCalledWith(['Action'], [10], 3);
    expect(fixture.nativeElement.querySelectorAll('.recommendation').length).toBe(2);
    consoleError.mockRestore();
  });

  it('affiche les raccourcis administrateur et aucun bouton de deconnexion', async () => {
    profile = { ...profile, role: 'admin' };

    await init();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('.tile').length).toBe(3);
    expect(element.querySelector('.identity .chip')?.textContent).toContain('Administrateur');
    expect(element.textContent).not.toContain('Se déconnecter');
  });

  it('traduit l accueil lorsque la langue globale passe a l anglais', async () => {
    await init();

    TestBed.inject(TranslationService).setLanguage('en');
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('ion-title')?.textContent).toContain('Home');
    expect(element.querySelector('.recommendations h2')?.textContent).toContain('Recommended for you');
    expect(element.querySelector('.greeting')?.textContent).toContain('Hello Ada');
  });
});
