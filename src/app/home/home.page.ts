import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  chevronForwardOutline, filmOutline, heartOutline, peopleOutline, speedometerOutline, star,
} from 'ionicons/icons';
import {
  IonContent, IonHeader, IonIcon, IonSpinner, IonText, IonTitle, IonToolbar,
} from '@ionic/angular';
import { Auth } from '../services/auth';
import { Favorite } from '../services/favorite';
import { TranslatePipe } from '../i18n/translate.pipe';
import { TmdbService } from '../services/tmdb.service';
import { Movie } from '../models/movie.model';
import { UserProfile } from '../models/user.model';
import { TranslationService } from '../i18n/translation.service';

// Les icones sont enregistrees ici : ion-icon ne resout que celles du registre.
addIcons({
  chevronForwardOutline, filmOutline, heartOutline, peopleOutline, speedometerOutline, star,
});

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    IonContent, IonHeader, IonIcon, IonSpinner, IonText, IonTitle, IonToolbar,
    RouterLink, TranslatePipe,
  ],
})
export class HomePage implements OnInit {
  private readonly auth = inject(Auth);
  private readonly favorites = inject(Favorite);
  private readonly tmdb = inject(TmdbService);
  private readonly i18n = inject(TranslationService);

  profile = signal<UserProfile | null>(null);
  recommendations = signal<Movie[]>([]);
  recommendationGenre = signal('');
  isLoading = signal(true);
  errorMessage = signal('');

  /** Initiales affichees quand le profil n'a pas de photo. */
  readonly initials = computed(() => {
    const user = this.profile();
    if (!user) {
      return '';
    }
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  });

  async ngOnInit(): Promise<void> {
    // Le profil et les recommandations sont independants : un echec des
    // recommandations ne doit pas empecher l'accueil de s'afficher.
    await Promise.all([this.loadProfile(), this.loadRecommendations()]);
  }

  private async loadProfile(): Promise<void> {
    try {
      const user = await this.auth.waitForAuthState();
      if (user) {
        this.profile.set(await this.auth.getCurrentProfile(user));
      }
    } catch (error) {
      console.error('Erreur chargement accueil :', error);
      // Le detail technique reste en console : l'interface n'affiche que la
      // langue choisie, jamais un message brut de Firebase.
      this.errorMessage.set(this.i18n.t('errors.profileLoad'));
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Recommande trois films du genre le plus present dans les favoris.
   * La section reste vide si l'utilisateur n'a pas de favoris exploitables.
   */
  private async loadRecommendations(): Promise<void> {
    try {
      const favorites = await this.favorites.list();
      const genres = favorites.flatMap((favorite) => favorite.genres ?? []);
      if (genres.length === 0) {
        return;
      }
      const excluded = favorites
        .map((favorite) => favorite.tmdbId)
        .filter((id): id is number => typeof id === 'number');
      const result = await this.tmdb.recommend(genres, excluded, 3);
      this.recommendationGenre.set(result.genreName);
      this.recommendations.set(result.movies);
    } catch (error) {
      console.error('Erreur recommandations :', error);
    }
  }
}
