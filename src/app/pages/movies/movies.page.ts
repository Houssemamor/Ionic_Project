import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Favorite } from '../../services/favorite';
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

  movies = signal<MovieModel[]>([]);
  favoriteIds = signal<Set<string>>(new Set());
  search = signal('');
  isLoading = signal(true);
  isSearching = signal(false);
  errorMessage = signal('');

  async ngOnInit(): Promise<void> {
    // les films s'affichent même si les favoris échouent
    try {
      this.movies.set(await this.tmdb.popular());
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
      this.movies.set(q ? await this.tmdb.search(q) : await this.tmdb.popular());
    } catch (error) {
      console.error('Erreur recherche :', error);
      this.errorMessage.set(error instanceof Error ? error.message : 'La recherche a échoué.');
    } finally {
      this.isSearching.set(false);
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