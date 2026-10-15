import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Movie } from '../models/movie.model';

interface TmdbMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
  genre_ids?: number[];
}

interface TmdbListResponse {
  results: TmdbMovie[];
}

@Injectable({ providedIn: 'root' })
export class TmdbService {
  private readonly http = inject(HttpClient);

  async popular(page = 1): Promise<Movie[]> {
    return this.request('/movie/popular', { page });
  }

  async search(query: string, page = 1): Promise<Movie[]> {
    return this.request('/search/movie', { query, page, include_adult: false });
  }

  async details(id: number): Promise<Movie> {
    const result = await this.request(`/movie/${id}`, {});
    const movie = result[0];
    if (!movie) {
      throw new Error('Film introuvable dans MovieDB.');
    }
    return movie;
  }

  imageUrl(path: string | undefined): string {
    return path?.startsWith('http') ? path : path ? `${environment.tmdb.imageBaseUrl}${path}` : '';
  }

  private async request(path: string, parameters: Record<string, string | number | boolean>): Promise<Movie[]> {
    if (!environment.tmdb.apiKey.trim()) {
      throw new Error('La clé API MovieDB doit être renseignée dans src/environments/environment.ts.');
    }

    const params = new HttpParams({
      fromObject: {
        api_key: environment.tmdb.apiKey,
        language: 'fr-FR',
        ...Object.fromEntries(Object.entries(parameters).map(([key, value]) => [key, String(value)])),
      },
    });
    const response = await firstValueFrom(
      this.http.get<TmdbListResponse | TmdbMovie>(`${environment.tmdb.baseUrl}${path}`, { params }),
    );
    const results = 'results' in response ? response.results : [response];
    return results.map((movie) => this.toMovie(movie));
  }

private toMovie(movie: TmdbMovie): Movie {
  return {
    id: `tmdb-${movie.id}`,
    tmdbId: movie.id,
    title: movie.title,
    overview: movie.overview || 'Aucun synopsis disponible.',
    posterPath: movie.poster_path
      ? `${environment.tmdb.imageBaseUrl}${movie.poster_path}`
      : undefined,
    releaseDate: movie.release_date || undefined,
    voteAverage: movie.vote_average,
  };
}
}
