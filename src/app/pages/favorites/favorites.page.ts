import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Favorite } from '../../services/favorite';
import { Favorite as FavoriteModel } from '../../models/favorite.model';
import { TmdbService } from '../../services/tmdb.service';
import {
  IonButton, IonCard, IonCardContent, IonContent, IonHeader,
  IonSpinner, IonText, IonTitle, IonToolbar,
} from '@ionic/angular';

@Component({
  selector: 'app-favorites',
  templateUrl: './favorites.page.html',
  styleUrls: ['./favorites.page.scss'],
  imports: [
    IonButton, IonCard, IonCardContent, IonContent, IonHeader,
    IonSpinner, IonText, IonTitle, IonToolbar, RouterLink,
  ],
})
export class FavoritesPage implements OnInit {
  private readonly favoriteService = inject(Favorite);
  readonly tmdb = inject(TmdbService);

  favorites = signal<FavoriteModel[]>([]);
  isLoading = signal(true);
  errorMessage = signal('');

async ngOnInit(): Promise<void> {
  console.log('FAVORITES: début');
  try {
    const result = await this.favoriteService.list();
    console.log('FAVORITES: reçu', result);
    this.favorites.set(result);
  } catch (error) {
    console.error('FAVORITES: erreur', error);
    this.errorMessage.set(
      error instanceof Error ? error.message : 'Impossible de charger les favoris.'
    );
  } finally {
    console.log('FAVORITES: fin');
    this.isLoading.set(false);
  }
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
}