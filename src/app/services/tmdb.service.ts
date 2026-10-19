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

interface TmdbGenreListResponse {
  genres: { id: number; name: string }[];
}

@Injectable({ providedIn: 'root' })
export class TmdbService {
  private readonly http = inject(HttpClient);

  // Correspondance genre_id -> nom, recuperee une seule fois puis mise en cache.
  // Les appels de liste ne renvoient que des identifiants de genre : sans cette
  // table, le filtre par genre n'a aucun nom a afficher.
  private genreNames: Map<number, string> | null = null;

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

  private async request(path: string, parameters: Record<string, string | number | boolean>): Promise<Movie[]> {
    if (!environment.tmdb.apiKey.trim()) {
      throw new Error('La clé API MovieDB doit être renseignée dans src/environments/environment.ts.');
    }

    const response = await firstValueFrom(
      this.http.get<TmdbListResponse | TmdbMovie>(`${environment.tmdb.baseUrl}${path}`, {
        params: this.apiParams(parameters),
      }),
    );
    const genreNames = await this.loadGenreNames();
    const results = 'results' in response ? response.results : [response];
    return results.map((movie) => this.toMovie(movie, genreNames));
  }

  /**
   * Charge la liste des genres TMDB en francais au premier appel seulement.
   * Un echec n'est pas bloquant : le film reste affichable, seul le filtre
   * par genre ne disposera d'aucun nom.
   */
  private async loadGenreNames(): Promise<Map<number, string>> {
    this.genreNames ??= new Map<number, string>();
    if (this.genreNames.size > 0) {
      return this.genreNames;
    }

    try {
      const response = await firstValueFrom(
        this.http.get<TmdbGenreListResponse>(`${environment.tmdb.baseUrl}/genre/movie/list`, {
          params: this.apiParams(),
        }),
      );
      for (const genre of response.genres) {
        this.genreNames.set(genre.id, genre.name);
      }
    } catch (error) {
      console.error('Liste des genres MovieDB indisponible :', error);
    }
    return this.genreNames;
  }

  /** Construit les parametres communs a tous les appels TMDB. */
  private apiParams(parameters: Record<string, string | number | boolean> = {}): HttpParams {
    return new HttpParams({
      fromObject: {
        api_key: environment.tmdb.apiKey,
        language: 'fr-FR',
        ...Object.fromEntries(Object.entries(parameters).map(([key, value]) => [key, String(value)])),
      },
    });
  }

  private toMovie(movie: TmdbMovie, genreNames: Map<number, string>): Movie {
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
      genres: movie.genre_ids
        ?.map((genreId) => genreNames.get(genreId))
        .filter((name): name is string => Boolean(name)),
    };
  }
}