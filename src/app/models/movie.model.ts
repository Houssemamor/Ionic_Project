export interface Movie {
  id: string;
  tmdbId?: number;
  title: string;
  overview: string;
  posterPath?: string;
  releaseDate?: string;
  voteAverage?: number;
  genres?: string[];
}
