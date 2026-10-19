import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Favorite } from '../../services/favorite';
import { Movie as FirestoreMovie } from '../../services/movie';
import { Movie as MovieModel } from '../../models/movie.model';
import { TmdbService } from '../../services/tmdb.service';
import {
  IonButton, IonCard, IonCardContent, IonCardTitle, IonContent, IonHeader,
  IonSearchbar, IonSpinner, IonText, IonTitle, IonToolbar,
} from '@ionic/angular';

@Component({
  selector: 'app-movies',
  templateUrl: './movies.page.html',
  styleUrls: ['./movies.page.scss'],
  imports: [
    IonButton, IonCard, IonCardContent, IonCardTitle, IonContent, IonHeader,
    IonSearchbar, IonSpinner, IonText, IonTitle, IonToolbar, RouterLink,
  ],
})
export class MoviesPage implements OnInit {
   readonly tmdb = inject(TmdbService);
  private readonly favorites = inject(Favorite);
   private readonly firestoreMovies = inject(FirestoreMovie);

  movies = signal<MovieModel[]>([]);
  favoriteIds = signal<Set<string>>(new Set());
  search = signal('');
  isLoading = signal(true);
  isSearching = signal(false);
  errorMessage = signal('');

  async ngOnInit(): Promise<void> {
    // les films s'affichent même si les favoris échouent
    try {
      const [tmdbMovies, storedMovies] = await Promise.all([
        this.tmdb.popular(),
        this.firestoreMovies.list(),
      ]);
      this.movies.set(this.mergeMovies(tmdbMovies, storedMovies));
    } catch (error) {
      console.error('Erreur TMDB :', error);
      this.errorMessage.set(error instanceof Error ? error.message : 'Impossible de charger les films.');
    } finally {
      this.isLoading.set(false);
    }

    try {
      const favs = await this.favorites.list();
      this.favoriteIds.set(
        new Set(favs.map((f) => f.id.replace(`${f.userId}_`, '')))
      );
    } catch (error) {
      console.error('Erreur favoris :', error);
    }
  }

  async searchMovies(): Promise<void> {
    this.isSearching.set(true);
    this.errorMessage.set('');
    try {
      const q = this.search().trim();
      const [tmdbMovies, storedMovies] = await Promise.all([
        q ? this.tmdb.search(q) : this.tmdb.popular(),
        this.firestoreMovies.list(),
      ]);
      const matchingStoredMovies = q
        ? storedMovies.filter((movie) => movie.title.toLowerCase().includes(q.toLowerCase()))
        : storedMovies;
      this.movies.set(this.mergeMovies(tmdbMovies, matchingStoredMovies));
    } catch (error) {
      console.error('Erreur recherche :', error);
      this.errorMessage.set(error instanceof Error ? error.message : 'La recherche a échoué.');
    } finally {
      this.isSearching.set(false);
    }
  }

  private mergeMovies(primary: MovieModel[], stored: MovieModel[]): MovieModel[] {
    const result = new Map<string, MovieModel>();
    for (const movie of [...primary, ...stored]) {
      const key = movie.tmdbId ? `tmdb-${movie.tmdbId}` : movie.title.trim().toLowerCase();
      if (!result.has(key)) {
        result.set(key, movie);
      }
    }
    return [...result.values()];
  }

  async toggleFavorite(movie: MovieModel): Promise<void> {
    this.errorMessage.set('');
    try {
      const id = String(movie.id);
      if (this.favoriteIds().has(id)) {
        await this.favorites.remove(id);
        this.favoriteIds.update((s) => { const n = new Set(s); n.delete(id); return n; });
      } else {
        await this.favorites.add(movie);
        this.favoriteIds.update((s) => new Set(s).add(id));
      }
    } catch (error) {
      console.error('Erreur favori :', error);
      this.errorMessage.set(error instanceof Error ? error.message : 'Impossible de modifier les favoris.');
    }
  }
}