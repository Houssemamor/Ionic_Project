import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import { heart } from 'ionicons/icons';
import { Favorite } from '../../services/favorite';
import { Dislike } from '../../services/dislike';
import { MovieReactions } from '../../services/movie-reactions';
import { Movie as FirestoreMovie } from '../../services/movie';
import { Movie as MovieModel } from '../../models/movie.model';
import { TmdbService } from '../../services/tmdb.service';
import { ViewMode, readViewMode, writeViewMode } from '../../services/view-preference';
import { MovieCardComponent } from '../../shared/movie-card/movie-card';
import { TranslationService } from '../../i18n/translation.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
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
    RouterLink, MovieCardComponent, TranslatePipe,
  ],
})
export class MoviesPage implements OnInit {
  readonly tmdb = inject(TmdbService);
  private readonly favorites = inject(Favorite);
  private readonly dislikes = inject(Dislike);
  private readonly reactions = inject(MovieReactions);
  private readonly firestoreMovies = inject(FirestoreMovie);
  private readonly i18n = inject(TranslationService);

  movies = signal<MovieModel[]>([]);
  favoriteIds = signal<Set<string>>(new Set());
  dislikedIds = signal<Set<string>>(new Set());
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
    // La locale suit la langue de l'interface, pas une valeur figee.
    return [...genres].sort((a, b) => a.localeCompare(b, this.i18n.language()));
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
    // Les films s'affichent meme si les favoris echouent.
    try {
      const [tmdbMovies, storedMovies] = await Promise.all([
        this.tmdb.popular(),
        this.firestoreMovies.list(),
      ]);
      this.movies.set(this.mergeMovies(tmdbMovies, storedMovies));
    } catch (error) {
      console.error('Erreur TMDB :', error);
      this.errorMessage.set(this.i18n.t('errors.moviesLoad'));
    } finally {
      this.isLoading.set(false);
    }

    const [favoritesResult, dislikesResult] = await Promise.allSettled([
      this.favorites.list(),
      this.dislikes.list(),
    ]);
    if (favoritesResult.status === 'fulfilled') {
      this.favoriteIds.set(this.toIdSet(favoritesResult.value));
    } else {
      console.error('Erreur favoris :', favoritesResult.reason);
    }
    if (dislikesResult.status === 'fulfilled') {
      this.dislikedIds.set(this.toIdSet(dislikesResult.value));
    } else {
      console.error('Erreur preferences de recommandation :', dislikesResult.reason);
    }
  }

  /** Les documents stockent l'identifiant du film, parfois prefixe du uid. */
  private toIdSet(marks: Array<{ id: string; userId?: string }>): Set<string> {
    return new Set(marks.map((mark) => mark.id.replace(`${mark.userId}_`, '')));
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
      this.errorMessage.set(this.i18n.t('errors.searchFailed'));
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

  /** 'popular' conserve l'ordre TMDB, les autres criteres reordonnent la copie. */
  private sortMovies(list: MovieModel[], sortBy: SortOption): MovieModel[] {
    const sorted = [...list];
    switch (sortBy) {
      case 'title':
        return sorted.sort((a, b) => a.title.localeCompare(b.title, this.i18n.language()));
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
        await this.reactions.removeFavorite(id);
        this.favoriteIds.update((s) => { const n = new Set(s); n.delete(id); return n; });
      } else {
        await this.reactions.addFavorite(movie);
        this.favoriteIds.update((s) => new Set(s).add(id));
        this.dislikedIds.update((s) => { const n = new Set(s); n.delete(id); return n; });
      }
    } catch (error) {
      console.error('Erreur favori :', error);
      this.errorMessage.set(this.i18n.t('errors.favoriteToggle'));
    }
  }

  async toggleDislike(movie: MovieModel): Promise<void> {
    this.errorMessage.set('');
    try {
      const id = String(movie.id);
      if (this.dislikedIds().has(id)) {
        await this.reactions.removeDislike(id);
        this.dislikedIds.update((s) => { const n = new Set(s); n.delete(id); return n; });
      } else {
        await this.reactions.addDislike(movie);
        this.dislikedIds.update((s) => new Set(s).add(id));
        // Un film exclu ne peut pas rester dans les favoris : le retrait est
        // fait par MovieReactions, on synchronise ici l'etat de la page.
        this.favoriteIds.update((s) => { const n = new Set(s); n.delete(id); return n; });
      }
    } catch (error) {
      console.error('Erreur preference de recommandation :', error);
      this.errorMessage.set(this.i18n.t('errors.dislikeToggle'));
    }
  }
}
