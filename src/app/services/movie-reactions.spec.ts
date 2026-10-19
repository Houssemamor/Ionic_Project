import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Movie } from '../models/movie.model';
import { Dislike } from './dislike';
import { Favorite } from './favorite';
import { MovieReactions } from './movie-reactions';

describe('MovieReactions', () => {
  let service: MovieReactions;
  let calls: string[];

  const movie: Movie = {
    id: 'tmdb-603',
    tmdbId: 603,
    title: 'Le Fabuleux Destin d Amelie Poulain',
    overview: '',
  };

  const favorites = {
    add: vi.fn(async () => {
      calls.push('favorite:add');
    }),
    remove: vi.fn(async () => {
      calls.push('favorite:remove');
    }),
  };

  const dislikes = {
    add: vi.fn(async () => {
      calls.push('dislike:add');
    }),
    remove: vi.fn(async () => {
      calls.push('dislike:remove');
    }),
  };

  beforeEach(() => {
    calls = [];
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        MovieReactions,
        { provide: Favorite, useValue: favorites },
        { provide: Dislike, useValue: dislikes },
      ],
    });
    service = TestBed.inject(MovieReactions);
  });

  it('retire le dislike avant d ajouter un favori', async () => {
    await service.addFavorite(movie);

    expect(calls).toEqual(['dislike:remove', 'favorite:add']);
  });

  it('retire le favori avant d ajouter un dislike', async () => {
    await service.addDislike(movie);

    expect(calls).toEqual(['favorite:remove', 'dislike:add']);
  });

  it('delegue la suppression des deux marques', async () => {
    await service.removeFavorite(movie.id);
    await service.removeDislike(movie.id);

    expect(favorites.remove).toHaveBeenCalledWith(movie.id);
    expect(dislikes.remove).toHaveBeenCalledWith(movie.id);
  });

  it('n ajoute pas le nouveau marqueur si le retrait oppose echoue', async () => {
    dislikes.remove.mockRejectedValueOnce(new Error('network'));

    await expect(service.addFavorite(movie)).rejects.toThrow('network');
    expect(favorites.add).not.toHaveBeenCalled();
  });
});
