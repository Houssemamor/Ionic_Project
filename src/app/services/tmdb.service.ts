import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { Movie } from '../models/movie.model';
import { TranslationService } from '../i18n/translation.service';
import { AppLanguage } from './language-preference';

interface TmdbMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path?: string | null;
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

/** Resultat des recommandations : le genre retenu et les films a afficher. */
export interface RecommendationResult {
  genreName: string;
  movies: Movie[];
}

@Injectable({ providedIn: 'root' })
export class TmdbService {
  private readonly http = inject(HttpClient);
  private readonly i18n = inject(TranslationService);

  // Correspondance genre_id -> nom, mise en cache par langue : les appels de
  // liste ne renvoient que des identifiants, et changer la langue doit aussi
  // changer les noms affiches par le filtre.
  private readonly genreNames = new Map<AppLanguage, Map<number, string>>();

  async popular(page = 1): Promise<Movie[]> {
    return this.request('/movie/popular', { page });
  }

  async search(query: string, page = 1): Promise<Movie[]> {
    return this.request('/search/movie', { query, page, include_adult: false });
  }

  /**
   * Selectionne les films actuellement a l'affiche pour le diaporama de
   * connexion : les mieux notes d'abord, sans doublon visuel sans image.
   */
  async nowPlayingHighlights(limit = 5): Promise<Movie[]> {
    const movies = await this.request('/movie/now_playing', { page: 1 });
    return movies
      .filter((movie) => Boolean(movie.backdropPath || movie.posterPath))
      .sort((a, b) =>
        (b.voteAverage ?? 0) - (a.voteAverage ?? 0)
        || (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''))
      .slice(0, limit);
  }

  async details(id: number): Promise<Movie> {
    const result = await this.request(`/movie/${id}`, {});
    const movie = result[0];
    if (!movie) {
      throw new Error(this.i18n.t('errors.movieNotFoundTmdb'));
    }
    return movie;
  }

  /**
   * Recommande des films du genre le plus frequent parmi les favoris.
   * Les noms sont resolus dans les listes FR et EN : un favori enregistre
   * avant un changement de langue reste donc exploitable. Les films deja
   * favoris sont exclus du resultat.
   */
  async recommend(
    favoriteGenres: string[],
    excludeTmdbIds: number[] = [],
    limit = 3,
  ): Promise<RecommendationResult> {
    if (favoriteGenres.length === 0) {
      return { genreName: '', movies: [] };
    }

    const language = this.i18n.language();
    // Les deux langues sont chargees une seule fois puis mises en cache.
    const [frenchNames, englishNames] = await Promise.all([
      this.loadGenreNames('fr'),
      this.loadGenreNames('en'),
    ]);

    const idByName = new Map<string, number>();
    for (const names of [frenchNames, englishNames]) {
      for (const [genreId, name] of names) {
        idByName.set(name.trim().toLowerCase(), genreId);
      }
    }

    const counts = new Map<number, number>();
    for (const name of favoriteGenres) {
      const genreId = idByName.get(name.trim().toLowerCase());
      if (genreId !== undefined) {
        counts.set(genreId, (counts.get(genreId) ?? 0) + 1);
      }
    }
    if (counts.size === 0) {
      return { genreName: '', movies: [] };
    }

    // Genre le plus frequent ; l'identifiant departage les ex aequo de facon stable.
    const [genreId] = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
    const excluded = new Set(excludeTmdbIds);
    const movies = (
      await this.request('/discover/movie', {
        with_genres: genreId,
        sort_by: 'popularity.desc',
        page: 1,
        include_adult: false,
      })
    )
      .filter((movie) => movie.tmdbId === undefined || !excluded.has(movie.tmdbId))
      .slice(0, limit);

    const currentNames = language === 'en' ? englishNames : frenchNames;
    const genreName = currentNames.get(genreId) ?? frenchNames.get(genreId) ?? englishNames.get(genreId) ?? '';
    return { genreName, movies };
  }

  private async request(path: string, parameters: Record<string, string | number | boolean>): Promise<Movie[]> {
    if (!environment.tmdb.apiKey.trim()) {
      throw new Error(this.i18n.t('errors.tmdbKeyMissing'));
    }

    // La langue est lue a chaque appel : le profil peut la changer sans que le
    // service soit recree, puisqu'il est fourni a la racine de l'application.
    const language = this.i18n.language();
    const response = await firstValueFrom(
      this.http.get<TmdbListResponse | TmdbMovie>(`${environment.tmdb.baseUrl}${path}`, {
        params: this.apiParams(language, parameters),
      }),
    );
    const genreNames = await this.loadGenreNames(language);
    const results = 'results' in response ? response.results : [response];
    return results.map((movie) => this.toMovie(movie, genreNames));
  }

  /**
   * Charge la liste des genres TMDB dans la langue demandee au premier appel.
   * Un echec n'est pas bloquant : le film reste affichable, seul le filtre
   * par genre ne disposera d'aucun nom. Un echec n'est pas mis en cache, pour
   * qu'un appel ulterieur puisse reessayer.
   */
  private async loadGenreNames(language: AppLanguage): Promise<Map<number, string>> {
    const cached = this.genreNames.get(language);
    if (cached) {
      return cached;
    }

    const names = new Map<number, string>();
    try {
      const response = await firstValueFrom(
        this.http.get<TmdbGenreListResponse>(`${environment.tmdb.baseUrl}/genre/movie/list`, {
          params: this.apiParams(language),
        }),
      );
      for (const genre of response.genres) {
        names.set(genre.id, genre.name);
      }
      this.genreNames.set(language, names);
    } catch (error) {
      console.error('Liste des genres MovieDB indisponible :', error);
    }
    return names;
  }

  /** Construit les parametres communs a tous les appels TMDB. */
  private apiParams(
    language: AppLanguage,
    parameters: Record<string, string | number | boolean> = {},
  ): HttpParams {
    return new HttpParams({
      fromObject: {
        api_key: environment.tmdb.apiKey,
        // TMDB attend une locale complete, pas le code court utilise par la preference.
        language: language === 'en' ? 'en-US' : 'fr-FR',
        ...Object.fromEntries(Object.entries(parameters).map(([key, value]) => [key, String(value)])),
      },
    });
  }

  private toMovie(movie: TmdbMovie, genreNames: Map<number, string>): Movie {
    return {
      id: `tmdb-${movie.id}`,
      tmdbId: movie.id,
      title: movie.title,
      overview: movie.overview || this.i18n.t('movies.noOverview'),
      posterPath: movie.poster_path
        ? `${environment.tmdb.imageBaseUrl}${movie.poster_path}`
        : undefined,
      backdropPath: movie.backdrop_path
        ? `${environment.tmdb.imageBaseUrl}${movie.backdrop_path}`
        : undefined,
      releaseDate: movie.release_date || undefined,
      voteAverage: movie.vote_average,
      genres: movie.genre_ids
        ?.map((genreId) => genreNames.get(genreId))
        .filter((name): name is string => Boolean(name)),
    };
  }
}