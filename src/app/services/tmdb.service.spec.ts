import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TmdbService } from './tmdb.service';
import { writeMovieLanguage } from './language-preference';

describe('TmdbService language', () => {
  let service: TmdbService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TmdbService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('envoie la langue choisie pour la recherche et pour les genres', async () => {
    writeMovieLanguage('en');

    const promise = service.search('matrix');
    const searchRequest = http.expectOne((request) => request.url.endsWith('/search/movie'));
    expect(searchRequest.request.params.get('language')).toBe('en-US');
    searchRequest.flush({ results: [] });

    // Le service enchaine sur la liste des genres apres la reponse de recherche.
    await nextTask();

    const genreRequest = http.expectOne((request) => request.url.endsWith('/genre/movie/list'));
    expect(genreRequest.request.params.get('language')).toBe('en-US');
    genreRequest.flush({ genres: [] });

    await expect(promise).resolves.toEqual([]);
  });

  it('met en cache les genres par langue', async () => {
    writeMovieLanguage('fr');
    const french = service.popular();
    http.expectOne((request) => request.url.endsWith('/movie/popular')).flush({ results: [] });
    await nextTask();
    const frenchGenres = http.expectOne((request) => request.url.endsWith('/genre/movie/list'));
    expect(frenchGenres.request.params.get('language')).toBe('fr-FR');
    frenchGenres.flush({ genres: [{ id: 28, name: 'Action' }] });
    await french;

    // Changer de langue doit recharger les noms : le cache francais ne doit pas
    // repondre a un appel anglais.
    writeMovieLanguage('en');
    const english = service.popular();
    http.expectOne((request) => request.url.endsWith('/movie/popular')).flush({ results: [] });
    await nextTask();
    const englishGenres = http.expectOne((request) => request.url.endsWith('/genre/movie/list'));
    expect(englishGenres.request.params.get('language')).toBe('en-US');
    englishGenres.flush({ genres: [{ id: 28, name: 'Action' }] });
    await english;
  });
});

/** Laisse le service poursuivre apres une reponse HTTP (resolution de promesse). */
function nextTask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve));
}
