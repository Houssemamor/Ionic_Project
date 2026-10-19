import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { Movie } from '../../models/movie.model';
import { Dislike } from '../../services/dislike';
import { Favorite } from '../../services/favorite';
import { Movie as FirestoreMovie } from '../../services/movie';
import { TmdbService } from '../../services/tmdb.service';
import { MovieDetailsPage } from './movie-details.page';

describe('MovieDetailsPage', () => {
  let component: MovieDetailsPage;
  let fixture: ComponentFixture<MovieDetailsPage>;
  let favoriteAdd: ReturnType<typeof vi.fn>;
  let favoriteRemove: ReturnType<typeof vi.fn>;
  let dislikeAdd: ReturnType<typeof vi.fn>;
  let dislikeRemove: ReturnType<typeof vi.fn>;
  let listFavorites: ReturnType<typeof vi.fn>;
  let listDislikes: ReturnType<typeof vi.fn>;

  const movie: Movie = {
    id: 'tmdb-603',
    tmdbId: 603,
    title: 'Le Fabuleux Destin d Amelie Poulain',
    overview: '',
  };

  beforeEach(() => {
    localStorage.clear();
    favoriteAdd = vi.fn().mockResolvedValue(undefined);
    favoriteRemove = vi.fn().mockResolvedValue(undefined);
    dislikeAdd = vi.fn().mockResolvedValue(undefined);
    dislikeRemove = vi.fn().mockResolvedValue(undefined);
    listFavorites = vi.fn().mockResolvedValue([]);
    listDislikes = vi.fn().mockResolvedValue([]);

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => movie.id } } },
        },
        {
          provide: TmdbService,
          useValue: { details: vi.fn().mockResolvedValue(movie) },
        },
        {
          provide: Favorite,
          useValue: {
            list: listFavorites,
            add: favoriteAdd,
            remove: favoriteRemove,
          },
        },
        {
          provide: Dislike,
          useValue: {
            list: listDislikes,
            add: dislikeAdd,
            remove: dislikeRemove,
          },
        },
        {
          provide: FirestoreMovie,
          useValue: { get: vi.fn().mockResolvedValue(null) },
        },
      ],
    });
    fixture = TestBed.createComponent(MovieDetailsPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('charge les deux marques du film', async () => {
    listFavorites.mockResolvedValueOnce([{ id: movie.id, movieId: movie.id }]);
    listDislikes.mockResolvedValueOnce([]);

    await component.ngOnInit();

    expect(component.movie()).toEqual(movie);
    expect(component.isFavorite()).toBe(true);
    expect(component.isDisliked()).toBe(false);
  });

  it('ajoute un dislike et retire le favori existant', async () => {
    component.movie.set(movie);
    component.isFavorite.set(true);

    await component.toggleDislike();

    expect(favoriteRemove).toHaveBeenCalledWith(movie.id);
    expect(dislikeAdd).toHaveBeenCalledWith(movie);
    expect(component.isFavorite()).toBe(false);
    expect(component.isDisliked()).toBe(true);
  });

  it('ajoute un favori et retire le dislike existant', async () => {
    component.movie.set(movie);
    component.isDisliked.set(true);

    await component.toggleFavorite();

    expect(dislikeRemove).toHaveBeenCalledWith(movie.id);
    expect(favoriteAdd).toHaveBeenCalledWith(movie);
    expect(component.isFavorite()).toBe(true);
    expect(component.isDisliked()).toBe(false);
  });

  it('affiche le libelle de retrait quand le film est exclu', () => {
    component.movie.set(movie);
    component.isDisliked.set(true);
    component.isLoading.set(false);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Recommander à nouveau');
  });
});
