import { Movie } from './movie.model';

export interface Favorite extends Movie {
  userId?: string;
  movieId?: string;
  addedAt?: string;
}
