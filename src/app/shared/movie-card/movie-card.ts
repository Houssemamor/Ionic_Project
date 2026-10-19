import { Component, computed, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonCard, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { heart, heartOutline, informationCircleOutline, star, thumbsDown, thumbsDownOutline, trashOutline } from 'ionicons/icons';
import { Movie } from '../../models/movie.model';
import { ViewMode } from '../../services/view-preference';
import { TranslationService } from '../../i18n/translation.service';
import { TranslatePipe } from '../../i18n/translate.pipe';

// Les SVG ne sont pas embarques automatiquement : ion-icon ne resout que les
// icones enregistrees ici, sinon il tente un chargement d'asset qui echoue.
// addIcons enregistre aussi la variante kebab-case (heartOutline devient
// heart-outline), qui est celle utilisee dans le template.
addIcons({ heart, heartOutline, informationCircleOutline, star, thumbsDown, thumbsDownOutline, trashOutline });

// Duree d'appui au-dela de laquelle la carte est consideree comme un appui long.
const LONG_PRESS_MS = 500;

/**
 * Carte de film partagee par /movies et /favorites.
 * Deux modes d'affichage : grille (affiche au-dessus, contenu centre) et
 * liste (affiche a gauche, texte et boutons sur une seule rangee).
 */
@Component({
  selector: 'app-movie-card',
  templateUrl: './movie-card.html',
  styleUrls: ['./movie-card.scss'],
  imports: [IonButton, IonCard, IonIcon, TranslatePipe],
})
export class MovieCardComponent {
  readonly movie = input.required<Movie>();
  readonly view = input.required<ViewMode>();

  /** Etat favori, uniquement pertinent quand favoriteAction vaut 'favorite'. */
  readonly isFavorite = input(false);

  /** 'favorite' pour la liste des films, 'remove' pour la playlist. */
  readonly favoriteAction = input<'favorite' | 'remove'>('favorite');

  /** Affiche le controle "ne pas recommander" sur les listes de decouverte. */
  readonly showDislike = input(false);

  /** Etat du film dans les preferences de recommandation. */
  readonly isDisliked = input(false);

  /** Emis lorsque l'utilisateur declenche le bouton d'action de la carte. */
  readonly actionToggled = output<Movie>();

  /** Emis lorsque l'utilisateur bascule le refus de recommandation. */
  readonly dislikeToggled = output<Movie>();

  private readonly router = inject(Router);
  private readonly i18n = inject(TranslationService);
  private pressTimeout: number | undefined;

  /** Année extraite de la date de sortie, premiere annee du format ISO. */
  readonly year = computed(() => this.movie().releaseDate?.slice(0, 4) ?? '');

  /** Trois premiers genres au maximum, pour tenir sur une seule ligne. */
  readonly genresLabel = computed(() => (this.movie().genres ?? []).slice(0, 3).join(', '));

  /**
   * Note TMDB formatee sur une decimale, ou chaine vide si le film n'a pas
   * encore de votes : TMDB renvoie 0 dans ce cas, et un film cree depuis
   * l'administration peut ne pas avoir de note du tout.
   */
  readonly rating = computed(() => {
    const value = this.movie().voteAverage;
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      return '';
    }
    return value.toFixed(1);
  });

  /** Libelle complet de la note, lu par les lecteurs d'ecran. */
  readonly ratingLabel = computed(() =>
    this.i18n.t('card.ratingLabel', { value: this.rating() }),
  );

  readonly actionLabel = computed(() => {
    if (this.favoriteAction() === 'remove') {
      return this.i18n.t('card.remove');
    }
    return this.isFavorite()
      ? this.i18n.t('card.favoriteRemove')
      : this.i18n.t('card.favoriteAdd');
  });

  /** Nom d'icone ionicons correspondant a l'action, pour les boutons compacts du mode liste. */
  readonly actionIcon = computed(() => {
    if (this.favoriteAction() === 'remove') {
      return 'trash-outline';
    }
    return this.isFavorite() ? 'heart' : 'heart-outline';
  });

  readonly actionColor = computed(() =>
    this.favoriteAction() === 'remove' || this.isFavorite() ? 'danger' : 'medium',
  );

  /** Libelle accessible et infobulle du refus de recommandation. */
  readonly dislikeLabel = computed(() =>
    this.isDisliked()
      ? this.i18n.t('card.dislikeRemove')
      : this.i18n.t('card.dislikeAdd'),
  );

  /** Icone pleine une fois le film exclu, contour sinon. */
  readonly dislikeIcon = computed(() =>
    this.isDisliked() ? 'thumbs-down' : 'thumbs-down-outline',
  );

  openDetails(): void {
    void this.router.navigate(['/movie-details', this.movie().id]);
  }

  /** Demarre le minuteur d'appui long. */
  onPressStart(): void {
    this.cancelPress();
    this.pressTimeout = window.setTimeout(() => {
      this.pressTimeout = undefined;
      this.openDetails();
    }, LONG_PRESS_MS);
  }

  /** Relache, sortie ou deplacement du doigt : l'appui long est abandonne. */
  onPressEnd(): void {
    this.cancelPress();
  }

  cancelPress(): void {
    if (this.pressTimeout !== undefined) {
      window.clearTimeout(this.pressTimeout);
      this.pressTimeout = undefined;
    }
  }
}