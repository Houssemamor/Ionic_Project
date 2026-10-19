import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Favorite } from '../../services/favorite';
import { Dislike } from '../../services/dislike';
import { MovieReactions } from '../../services/movie-reactions';
import { Movie } from '../../models/movie.model';
import { TmdbService } from '../../services/tmdb.service';
import { Movie as FirestoreMovie } from '../../services/movie';
import { TranslationService } from '../../i18n/translation.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import {
  IonBackButton, IonButtons,
  IonButton, IonCard, IonCardContent, IonCardTitle, IonContent,
  IonHeader, IonSpinner, IonText, IonTitle, IonToolbar,
} from '@ionic/angular';

@Component({
  selector: 'app-movie-details',
  templateUrl: './movie-details.page.html',
  styleUrls: ['./movie-details.page.scss'],
  imports: [
    IonBackButton, IonButtons, IonButton, IonCard, IonCardContent, IonCardTitle, IonContent,
    IonHeader, IonSpinner, IonText, IonTitle, IonToolbar, TranslatePipe,
  ],
})
export class MovieDetailsPage implements OnInit {
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly router = inject(Router);
  private readonly favorites = inject(Favorite);
  private readonly dislikes = inject(Dislike);
  private readonly reactions = inject(MovieReactions);
  private readonly firestoreMovies = inject(FirestoreMovie);
  private readonly i18n = inject(TranslationService);
  readonly tmdb = inject(TmdbService);

  movie = signal<Movie | null>(null);
  isFavorite = signal(false);
  isDisliked = signal(false);
  isLoading = signal(true);
  errorMessage = signal('');

  async ngOnInit(): Promise<void> {
    try {
      const rawId = this.route?.snapshot.paramMap.get('id') ?? '';
      let movie: Movie;
      const tmdbId = Number(rawId.replace(/^tmdb-/, ''));
      if (rawId.startsWith('tmdb-') || (Number.isInteger(tmdbId) && tmdbId > 0)) {
        movie = await this.tmdb.details(tmdbId);
      } else {
        const storedMovie = await this.firestoreMovies.get(rawId);
        if (!storedMovie) {
          throw new Error(this.i18n.t('errors.movieNotFoundDb'));
        }
        movie = storedMovie;
      }
      this.movie.set(movie);

      const [favoritesResult, dislikesResult] = await Promise.allSettled([
        this.favorites.list(),
        this.dislikes.list(),
      ]);
      if (favoritesResult.status === 'fulfilled') {
        this.isFavorite.set(
          favoritesResult.value.some((f) => (f.movieId ?? f.id) === movie.id),
        );
      } else {
        console.error('Erreur favoris :', favoritesResult.reason);
      }
      if (dislikesResult.status === 'fulfilled') {
        this.isDisliked.set(
          dislikesResult.value.some((f) => (f.movieId ?? f.id) === movie.id),
        );
      } else {
        console.error('Erreur preferences de recommandation :', dislikesResult.reason);
      }
    } catch (error) {
      console.error('Erreur details :', error);
      this.errorMessage.set(this.i18n.t('errors.detailsLoad'));
    } finally {
      this.isLoading.set(false);
    }
  }

  async toggleFavorite(): Promise<void> {
    const movie = this.movie();
    if (!movie) {
      return;
    }
    this.errorMessage.set('');
    try {
      if (this.isFavorite()) {
        await this.reactions.removeFavorite(movie.id);
        this.isFavorite.set(false);
      } else {
        await this.reactions.addFavorite(movie);
        this.isFavorite.set(true);
        this.isDisliked.set(false);
      }
    } catch (error) {
      console.error('Erreur favori :', error);
      this.errorMessage.set(this.i18n.t('errors.favoriteToggle'));
    }
  }

  async toggleDislike(): Promise<void> {
    const movie = this.movie();
    if (!movie) {
      return;
    }
    this.errorMessage.set('');
    try {
      if (this.isDisliked()) {
        await this.reactions.removeDislike(movie.id);
        this.isDisliked.set(false);
      } else {
        await this.reactions.addDislike(movie);
        this.isDisliked.set(true);
        this.isFavorite.set(false);
      }
    } catch (error) {
      console.error('Erreur preference de recommandation :', error);
      this.errorMessage.set(this.i18n.t('errors.dislikeToggle'));
    }
  }

  goBackToMovies(): void {
    void this.router.navigateByUrl('/movies');
  }
}
