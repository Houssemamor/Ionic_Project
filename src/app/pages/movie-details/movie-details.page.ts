import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Favorite } from '../../services/favorite';
import { Movie } from '../../models/movie.model';
import { TmdbService } from '../../services/tmdb.service';
import { Movie as FirestoreMovie } from '../../services/movie';
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
    IonHeader, IonSpinner, IonText, IonTitle, IonToolbar,
  ],
})
export class MovieDetailsPage implements OnInit {
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly router = inject(Router);
  private readonly favorites = inject(Favorite);
  private readonly firestoreMovies = inject(FirestoreMovie);
  readonly tmdb = inject(TmdbService);

  movie = signal<Movie | null>(null);
  isFavorite = signal(false);
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
          throw new Error('Film introuvable dans la base de données.');
        }
        movie = storedMovie;
      }
      this.movie.set(movie);

      try {
        const favs = await this.favorites.list();
        this.isFavorite.set(favs.some((f) => (f.movieId ?? f.id) === movie.id));
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

  goBackToMovies(): void {
    void this.router.navigateByUrl('/movies');
  }
}