import { Injectable, inject } from '@angular/core';
import { Movie } from '../models/movie.model';
import { Dislike } from './dislike';
import { Favorite } from './favorite';

/**
 * Facade des deux marques d'un film.
 * Elle garantit l'invariant "favori ou non recommande, jamais les deux" en un
 * seul endroit au lieu de le repeter dans chaque page.
 *
 * Les deux collections ne sont pas modifiees dans une transaction Firestore :
 * le retrait de la marque opposee est effectue en premier. Si le second appel
 * echoue, le film est simplement demarque et peut etre marque a nouveau.
 */
@Injectable({ providedIn: 'root' })
export class MovieReactions {
  private readonly favorites = inject(Favorite);
  private readonly dislikes = inject(Dislike);

  async addFavorite(movie: Movie): Promise<void> {
    await this.dislikes.remove(movie.id);
    await this.favorites.add(movie);
  }

  async removeFavorite(movieId: string): Promise<void> {
    await this.favorites.remove(movieId);
  }

  async addDislike(movie: Movie): Promise<void> {
    await this.favorites.remove(movie.id);
    await this.dislikes.add(movie);
  }

  async removeDislike(movieId: string): Promise<void> {
    await this.dislikes.remove(movieId);
  }
}
