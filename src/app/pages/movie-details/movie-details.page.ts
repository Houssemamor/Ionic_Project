import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Favorite } from '../../services/favorite';
import { Movie } from '../../models/movie.model';
import { TmdbService } from '../../services/tmdb.service';
import {
  IonButton, IonCard, IonCardContent, IonCardTitle, IonContent,
  IonHeader, IonSpinner, IonText, IonTitle, IonToolbar,
} from '@ionic/angular';

@Component({
  selector: 'app-movie-details',
  templateUrl: './movie-details.page.html',
  styleUrls: ['./movie-details.page.scss'],
  imports: [
    IonButton, IonCard, IonCardContent, IonCardTitle, IonContent,
    IonHeader, IonSpinner, IonText, IonTitle, IonToolbar, RouterLink,
  ],
})
export class MovieDetailsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly favorites = inject(Favorite);
  readonly tmdb = inject(TmdbService);

  movie = signal<Movie | null>(null);
  isFavorite = signal(false);
  isLoading = signal(true);
  errorMessage = signal('');

  async ngOnInit(): Promise<void> {
    try {
      const rawId = this.route.snapshot.paramMap.get('id') ?? '';
      // accepte "tmdb-1423191" comme "1423191"
      const tmdbId = Number(rawId.replace(/^tmdb-/, ''));
      if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
        throw new Error('Identifiant de film invalide.');
      }

      const movie = await this.tmdb.details(tmdbId);
      this.movie.set(movie);

      try {
        const favs = await this.favorites.list();
        this.isFavorite.set(favs.some((f) => f.id.endsWith(`_${movie.id}`)));
      } catch (error) {
        console.error('Erreur favoris :', error);
      }
    } catch (error) {
      console.error('Erreur détails :', error);
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Impossible de charger le film.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async toggleFavorite(): Promise<void> {
    const movie = this.movie();
    if (!movie) return;
    this.errorMessage.set('');
    try {
      if (this.isFavorite()) {
        await this.favorites.remove(movie.id);
        this.isFavorite.set(false);
      } else {
        await this.favorites.add(movie);
        this.isFavorite.set(true);
      }
    } catch (error) {
      console.error('Erreur favori :', error);
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Impossible de modifier les favoris.'
      );
    }
  }
}