import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TmdbService } from './tmdb.service';
import { TranslationService } from '../i18n/translation.service';

describe('TmdbService language', () => {
  let service: TmdbService;
  let http: HttpTestingController;
  let i18n: TranslationService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TmdbService);
    i18n = TestBed.inject(TranslationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('envoie la langue choisie pour la recherche et pour les genres', async () => {
    i18n.setLanguage('en');

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
    i18n.setLanguage('fr');
    const french = service.popular();
    http.expectOne((request) => request.url.endsWith('/movie/popular')).flush({ results: [] });
    await nextTask();
    const frenchGenres = http.expectOne((request) => request.url.endsWith('/genre/movie/list'));
    expect(frenchGenres.request.params.get('language')).toBe('fr-FR');
    frenchGenres.flush({ genres: [{ id: 28, name: 'Action' }] });
    await french;

    // Changer de langue doit recharger les noms : le cache francais ne doit pas
    // repondre a un appel anglais.
    i18n.setLanguage('en');
    const english = service.popular();
    http.expectOne((request) => request.url.endsWith('/movie/popular')).flush({ results: [] });
    await nextTask();
    const englishGenres = http.expectOne((request) => request.url.endsWith('/genre/movie/list'));
    expect(englishGenres.request.params.get('language')).toBe('en-US');
    englishGenres.flush({ genres: [{ id: 28, name: 'Action' }] });
    await english;
  });

  it('recommande selon le genre le plus frequent et exclut les favoris', async () => {
    i18n.setLanguage('en');
    const promise = service.recommend(['Science-Fiction'], [10], 3);

    // Les deux langues sont chargees : les favoris enregistres avant un
    // changement de langue restent donc reconnus.
    const genreRequests = http.match((request) => request.url.endsWith('/genre/movie/list'));
    expect(genreRequests.length).toBe(2);
    const frenchGenres = genreRequests.find(
      (request) => request.request.params.get('language') === 'fr-FR',
    );
    const englishGenres = genreRequests.find(
      (request) => request.request.params.get('language') === 'en-US',
    );
    expect(frenchGenres).toBeTruthy();
    expect(englishGenres).toBeTruthy();
    frenchGenres!.flush({ genres: [{ id: 878, name: 'Science-Fiction' }] });
    englishGenres!.flush({ genres: [{ id: 878, name: 'Science Fiction' }] });
    await nextTask();

    const discover = http.expectOne((request) => request.url.endsWith('/discover/movie'));
    expect(discover.request.params.get('with_genres')).toBe('878');
    expect(discover.request.params.get('language')).toBe('en-US');
    discover.flush({
      results: [
        tmdbMovie(10), tmdbMovie(11), tmdbMovie(12), tmdbMovie(13),
      ],
    });

    const result = await promise;

    expect(result.genreName).toBe('Science Fiction');
    // Le favori 10 est exclu et la limite de trois films est respectee.
    expect(result.movies.map((movie) => movie.tmdbId)).toEqual([11, 12, 13]);
  });

  it('ne requete rien sans genre de favori', async () => {
    const result = await service.recommend([]);

    expect(result).toEqual({ genreName: '', movies: [] });
    http.expectNone(() => true);
  });

  it('trie les films a l affiche par note et ignore ceux sans image', async () => {
    i18n.setLanguage('en');
    const promise = service.nowPlayingHighlights(3);

    const request = http.expectOne((value) => value.url.endsWith('/movie/now_playing'));
    expect(request.request.params.get('language')).toBe('en-US');
    request.flush({
      results: [
        tmdbMovie(1, 6.5, '/one.jpg'),
        { ...tmdbMovie(2, 9.9, null), backdrop_path: null },
        tmdbMovie(3, 8.1, '/three.jpg'),
        { ...tmdbMovie(4, 7.2, null), backdrop_path: '/four-backdrop.jpg' },
        tmdbMovie(5, 9, '/five.jpg'),
      ],
    });
    await nextTask();

    const genres = http.expectOne((value) => value.url.endsWith('/genre/movie/list'));
    genres.flush({ genres: [] });
    const movies = await promise;

    expect(movies.map((movie) => movie.tmdbId)).toEqual([5, 3, 4]);
    expect(movies[2].backdropPath).toContain('/four-backdrop.jpg');
  });
});

/** Laisse le service poursuivre apres une reponse HTTP (resolution de promesse). */
function nextTask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve));
}

/** Fabrique une reponse TMDB minimale. */
function tmdbMovie(id: number, voteAverage = 7, posterPath: string | null = null) {
  return {
    id,
    title: `Film ${id}`,
    overview: '',
    poster_path: posterPath,
    release_date: '2024-01-01',
    vote_average: voteAverage,
  };
}
