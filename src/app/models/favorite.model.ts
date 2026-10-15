import { Movie } from './movie.model';

export interface Favorite extends Movie {
  userId?: string;
  addedAt?: string;
}
