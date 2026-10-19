import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Favorite } from '../../services/favorite';
import { Favorite as FavoriteModel } from '../../models/favorite.model';
import { ViewMode, readViewMode, writeViewMode } from '../../services/view-preference';
import { MovieCard } from '../../shared/movie-card/movie-card';
import {
  IonBackButton, IonButtons, IonButton, IonContent, IonHeader,
  IonSearchbar, IonSelect, IonSelectOption, IonSpinner, IonText, IonTitle, IonToolbar,
} from '@ionic/angular';

type SortOption = 'popular' | 'title' | 'date' | 'rating';

@Component({
  selector: 'app-favorites',
  templateUrl: './favorites.page.html',
  styleUrls: ['./favorites.page.scss'],
  imports: [
    IonBackButton, IonButtons, IonButton, IonContent, IonHeader,
    IonSearchbar, IonSelect, IonSelectOption, IonSpinner, IonText, IonTitle, IonToolbar, RouterLink,
    MovieCard,
  ],
})
export class FavoritesPage implements OnInit {
  private readonly favoriteService = inject(Favorite);

  favorites = signal<FavoriteModel[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');

  // Recherche, filtres et tri s'appliquent a la liste deja chargee en memoire.
  search = signal('');
  selectedGenre = signal('');
  sortBy = signal<SortOption>('popular');
  view = signal<ViewMode>(readViewMode());

  readonly availableGenres = computed(() => {
    const genres = new Set<string>();
    for (const favorite of this.favorites()) {
      for (const genre of favorite.genres ?? []) {
        genres.add(genre);
      }
    }
    return [...genres].sort((a, b) => a.localeCompare(b, 'fr'));
  });

  readonly visibleFavorites = computed(() => {
    const query = this.search().trim().toLowerCase();
    const genre = this.selectedGenre();

    const filtered = this.favorites().filter((favorite) => {
      const matchesQuery = !query || favorite.title.toLowerCase().includes(query);
      const matchesGenre = !genre || favorite.genres?.includes(genre);
      return matchesQuery && matchesGenre;
    });

    return this.sortFavorites(filtered, this.sortBy());
  });

  async ngOnInit(): Promise<void> {
    try {
      const result = await this.favoriteService.list();
      this.favorites.set(result);
    } catch (error) {
      console.error('Erreur chargement favoris :', error);
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Impossible de charger les favoris.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  toggleView(): void {
    this.view.update((current) => {
      const next: ViewMode = current === 'grid' ? 'list' : 'grid';
      writeViewMode(next);
      return next;
    });
  }

  async remove(movieId: string): Promise<void> {
    this.errorMessage.set('');
    try {
      await this.favoriteService.remove(movieId);
      this.favorites.update((list) => list.filter((f) => f.id !== movieId));
    } catch (error) {
      console.error('Erreur suppression favori :', error);
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Impossible de retirer ce film.'
      );
    }
  }

  /** 'popular' conserve l'ordre de lecture, les autres critères réordonnent la copie. */
  private sortFavorites(list: FavoriteModel[], sortBy: SortOption): FavoriteModel[] {
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
}