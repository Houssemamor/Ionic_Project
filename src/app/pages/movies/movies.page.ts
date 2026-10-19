import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import { heart } from 'ionicons/icons';
import { Favorite } from '../../services/favorite';
import { Movie as FirestoreMovie } from '../../services/movie';
import { Movie as MovieModel } from '../../models/movie.model';
import { TmdbService } from '../../services/tmdb.service';
import { ViewMode, readViewMode, writeViewMode } from '../../services/view-preference';
import { MovieCard } from '../../shared/movie-card/movie-card';
import {
  IonBackButton, IonButtons, IonButton, IonContent, IonFab, IonFabButton, IonHeader, IonIcon,
  IonSearchbar, IonSelect, IonSelectOption, IonSpinner, IonText, IonTitle, IonToggle, IonToolbar,
} from '@ionic/angular';

type SortOption = 'popular' | 'title' | 'date' | 'rating';

// L'icone du bouton flottant est enregistree ici plutot que de dependre de
// l'enregistrement fait par app-movie-card : la page ne doit pas dependre
// d'un effet de bord d'un autre composant.
addIcons({ heart });

@Component({
  selector: 'app-movies',
  templateUrl: './movies.page.html',
  styleUrls: ['./movies.page.scss'],
  imports: [
    IonBackButton, IonButtons, IonButton, IonContent, IonFab, IonFabButton, IonHeader, IonIcon,
    IonSearchbar, IonSelect, IonSelectOption, IonSpinner, IonText, IonTitle, IonToggle, IonToolbar,
    RouterLink, MovieCard,
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

  // Filtres et tri s'appliquent uniquement a la liste deja chargee en memoire :
  // aucun appel reseau supplementaire.
  selectedGenre = signal('');
  sortBy = signal<SortOption>('popular');
  view = signal<ViewMode>(readViewMode());
  hideFavorited = signal(false);

  /** Genres effectivement presents dans la liste chargee, pour eviter des puces vides. */
  readonly availableGenres = computed(() => {
    const genres = new Set<string>();
    for (const movie of this.movies()) {
      for (const genre of movie.genres ?? []) {
        genres.add(genre);
      }
    }
    return [...genres].sort((a, b) => a.localeCompare(b, 'fr'));
  });

  readonly visibleMovies = computed(() => {
    const genre = this.selectedGenre();
    const hideFavorited = this.hideFavorited();

    const filtered = this.movies().filter((movie) => {
      const matchesGenre = !genre || movie.genres?.includes(genre);
      // favoriteIds contient l'identifiant du film seul, sans le prefixe utilisateur.
      const matchesVisibility = !hideFavorited || !this.favoriteIds().has('' + movie.id);
      return matchesGenre && matchesVisibility;
    });

    return this.sortMovies(filtered, this.sortBy());
  });

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

  toggleView(): void {
    this.view.update((current) => {
      const next: ViewMode = current === 'grid' ? 'list' : 'grid';
      writeViewMode(next);
      return next;
    });
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

  /** 'popular' conserve l'ordre TMDB, les autres critères réordonnent la copie. */
  private sortMovies(list: MovieModel[], sortBy: SortOption): MovieModel[] {
    const sorted = [...list];
    switch (sortBy) {
      case 'title':
        return sorted.sort((a, b) => a.title.localeCompare(b.title, 'fr'));
      case 'date':
        return sorted.sort((a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''));
      case 'rating':
        return sorted.sort((a, b) => (b.voteAverage ?? 0) - (a.voteAverage ?? 0));
      default:
        return sorted;
    }
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