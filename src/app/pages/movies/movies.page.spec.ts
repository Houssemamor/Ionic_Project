import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { MoviesPage } from './movies.page';
import { Movie } from '../../models/movie.model';
import { Dislike } from '../../services/dislike';
import { Favorite } from '../../services/favorite';
import { Movie as FirestoreMovie } from '../../services/movie';
import { TmdbService } from '../../services/tmdb.service';
import { readViewMode } from '../../services/view-preference';

describe('MoviesPage', () => {
  let component: MoviesPage;
  let fixture: ComponentFixture<MoviesPage>;
  let favoriteAdd: ReturnType<typeof vi.fn>;
  let favoriteRemove: ReturnType<typeof vi.fn>;
  let dislikeAdd: ReturnType<typeof vi.fn>;
  let dislikeRemove: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Le mode d'affichage est memorise dans localStorage : on repart d'un
    // etat neutre pour que le test de valeur par defaut reste fiable.
    localStorage.clear();
    favoriteAdd = vi.fn().mockResolvedValue(undefined);
    favoriteRemove = vi.fn().mockResolvedValue(undefined);
    dislikeAdd = vi.fn().mockResolvedValue(undefined);
    dislikeRemove = vi.fn().mockResolvedValue(undefined);

    // RouterLink est utilise par le bouton flottant vers la playlist.
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: Favorite,
          useValue: {
            list: vi.fn().mockResolvedValue([]),
            add: favoriteAdd,
            remove: favoriteRemove,
          },
        },
        {
          provide: Dislike,
          useValue: {
            list: vi.fn().mockResolvedValue([]),
            add: dislikeAdd,
            remove: dislikeRemove,
          },
        },
        {
          provide: TmdbService,
          useValue: {
            popular: vi.fn().mockResolvedValue([]),
            search: vi.fn().mockResolvedValue([]),
          },
        },
        {
          provide: FirestoreMovie,
          useValue: { list: vi.fn().mockResolvedValue([]) },
        },
      ],
    });
    fixture = TestBed.createComponent(MoviesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('expose uniquement les genres presents dans la liste chargee', () => {
    component.movies.set([
      { id: '1', title: 'Zorro', overview: '', genres: ['Action', 'Aventure'] },
      { id: '2', title: 'Amelie', overview: '', genres: ['Comédie'] },
      { id: '3', title: 'Inconnu', overview: '' },
    ]);

    expect(component.availableGenres()).toEqual(['Action', 'Aventure', 'Comédie']);
  });

  it('filtre la liste sur le genre selectionne', () => {
    component.movies.set([
      { id: '1', title: 'Zorro', overview: '', genres: ['Action'] },
      { id: '2', title: 'Amelie', overview: '', genres: ['Comédie'] },
    ]);
    component.selectedGenre.set('Action');

    expect(component.visibleMovies().map((movie) => movie.id)).toEqual(['1']);
  });

  it('renvoie une liste vide quand le genre ne correspond a rien', () => {
    component.movies.set([{ id: '1', title: 'Zorro', overview: '', genres: ['Action'] }]);
    component.selectedGenre.set('Horreur');

    expect(component.visibleMovies()).toEqual([]);
  });

  it('trie par note decroissante sans muter la source', () => {
    const source: Movie[] = [
      { id: '1', title: 'Petit film', overview: '', voteAverage: 4.2 },
      { id: '2', title: 'Grand film', overview: '', voteAverage: 8.7 },
    ];
    component.movies.set(source);
    component.sortBy.set('rating');

    expect(component.visibleMovies().map((movie) => movie.id)).toEqual(['2', '1']);
    expect(source.map((movie) => movie.id)).toEqual(['1', '2']);
  });

  it('conserve l ordre TMDB quand aucun tri n est choisi', () => {
    component.movies.set([
      { id: '3', title: 'C', overview: '' },
      { id: '1', title: 'A', overview: '' },
    ]);

    expect(component.visibleMovies().map((movie) => movie.id)).toEqual(['3', '1']);
  });

  it('bascule entre grille et liste', () => {
    expect(component.view()).toBe('grid');

    component.toggleView();

    expect(component.view()).toBe('list');
  });

  it('conserve le mode d affichage pour le prochain chargement', () => {
    component.toggleView();

    expect(localStorage.getItem('movieViewMode')).toBe('list');
    expect(readViewMode()).toBe('list');
  });

  it('reprend le mode memorise au demarrage', () => {
    localStorage.setItem('movieViewMode', 'list');

    const restored = TestBed.createComponent(MoviesPage);

    expect(restored.componentInstance.view()).toBe('list');
  });

  it('masque les films deja mis en favori quand l option est activee', () => {
    component.movies.set([
      { id: 'tmdb-1', title: 'Vu', overview: '' },
      { id: 'tmdb-2', title: 'Pas vu', overview: '' },
    ]);
    component.favoriteIds.set(new Set(['tmdb-1']));

    expect(component.visibleMovies().map((movie) => movie.id)).toEqual(['tmdb-1', 'tmdb-2']);

    component.hideFavorited.set(true);

    expect(component.visibleMovies().map((movie) => movie.id)).toEqual(['tmdb-2']);
  });

  it('propose un bouton flottant vers la playlist', () => {
    fixture.detectChanges();

    const fabButton = (fixture.nativeElement as HTMLElement).querySelector('ion-fab-button');
    expect(fabButton).not.toBeNull();
    expect(fabButton?.getAttribute('href')).toBe('/favorites');

    // Nom accessible : ion-fab-button ecarte aria-label, il vient donc du texte
    // projete, et l'icone doit rester ignoree par les lecteurs d'ecran.
    const hiddenLabel = fabButton?.querySelector('.visually-hidden');
    expect(hiddenLabel?.textContent?.trim()).toBe('Voir ma playlist de favoris');
    expect(fabButton?.querySelector('ion-icon')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('ajoute un favori et retire le dislike existant', async () => {
    const movie: Movie = {
      id: 'tmdb-603',
      tmdbId: 603,
      title: 'Amelie',
      overview: '',
    };
    component.dislikedIds.set(new Set([movie.id]));

    await component.toggleFavorite(movie);

    expect(dislikeRemove).toHaveBeenCalledWith(movie.id);
    expect(favoriteAdd).toHaveBeenCalledWith(movie);
    expect(component.favoriteIds().has(movie.id)).toBe(true);
    expect(component.dislikedIds().has(movie.id)).toBe(false);
  });

  it('ajoute un dislike et retire le favori existant', async () => {
    const movie: Movie = {
      id: 'tmdb-550',
      tmdbId: 550,
      title: 'Fight Club',
      overview: '',
    };
    component.favoriteIds.set(new Set([movie.id]));

    await component.toggleDislike(movie);

    expect(favoriteRemove).toHaveBeenCalledWith(movie.id);
    expect(dislikeAdd).toHaveBeenCalledWith(movie);
    expect(component.favoriteIds().has(movie.id)).toBe(false);
    expect(component.dislikedIds().has(movie.id)).toBe(true);
  });

  it('annule un dislike sans toucher au favori', async () => {
    const movie: Movie = {
      id: 'tmdb-680',
      tmdbId: 680,
      title: 'Pulp Fiction',
      overview: '',
    };
    component.dislikedIds.set(new Set([movie.id]));

    await component.toggleDislike(movie);

    expect(dislikeRemove).toHaveBeenCalledWith(movie.id);
    expect(favoriteRemove).not.toHaveBeenCalled();
    expect(component.dislikedIds().has(movie.id)).toBe(false);
  });
});