import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { pause, play, star } from 'ionicons/icons';
import { Movie } from '../../../models/movie.model';
import { TmdbService } from '../../../services/tmdb.service';
import { TranslatePipe } from '../../../i18n/translate.pipe';

// Les icones sont enregistrees localement : le composant ne depend pas de
// l'enregistrement realise par une autre page.
addIcons({ pause, play, star });

const AUTO_SLIDE_MS = 2500;
const SLIDE_LIMIT = 7;

/**
 * Diaporama de la page de connexion.
 * Les donnees TMDB sont chargees sans authentification. Le minuteur est
 * coupe au survol, au focus clavier, par le bouton pause et lorsque le systeme
 * demande une animation reduite.
 */
@Component({
  selector: 'app-login-hero',
  templateUrl: './login-hero.html',
  styleUrls: ['./login-hero.scss'],
  imports: [IonButton, IonIcon, TranslatePipe],
})
export class LoginHeroComponent implements OnInit {
  private readonly tmdb = inject(TmdbService);

  readonly slides = signal<Movie[]>([]);
  readonly activeIndex = signal(0);
  readonly isLoading = signal(true);
  readonly isPaused = signal(false);
  readonly isHovered = signal(false);
  readonly isFocused = signal(false);

  /** La preference systeme est lue une fois : elle ne change pas en cours de page. */
  private readonly reducedMotion = (() => {
    const matchMedia = (globalThis as {
      matchMedia?: (query: string) => { matches: boolean };
    }).matchMedia;
    return typeof matchMedia === 'function'
      && matchMedia('(prefers-reduced-motion: reduce)').matches;
  })();

  readonly activeMovie = computed(() => this.slides()[this.activeIndex()] ?? null);
  readonly activeYear = computed(() => this.activeMovie()?.releaseDate?.slice(0, 4) ?? '');
  readonly activeRating = computed(() => {
    const value = this.activeMovie()?.voteAverage;
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      return '';
    }
    return value.toFixed(1);
  });
  readonly canAutoPlay = computed(() =>
    !this.reducedMotion && this.slides().length > 1,
  );

  constructor() {
    // Un effet synchronise le minuteur avec les etats de pause : chaque
    // changement nettoie l'intervalle precedent, donc aucun minuteur orphelin.
    effect((onCleanup) => {
      const shouldPlay = this.canAutoPlay()
        && !this.isPaused()
        && !this.isHovered()
        && !this.isFocused();
      if (!shouldPlay) {
        return;
      }
      const timer = window.setInterval(() => this.next(), AUTO_SLIDE_MS);
      onCleanup(() => window.clearInterval(timer));
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      this.slides.set(await this.tmdb.nowPlayingHighlights(SLIDE_LIMIT));
    } catch (error) {
      // Le diaporama est decoratif : la connexion reste utilisable.
      console.error('Erreur diaporama de connexion :', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  next(): void {
    const count = this.slides().length;
    if (count === 0) {
      return;
    }
    this.activeIndex.update((current) => (current + 1) % count);
  }

  selectSlide(index: number): void {
    this.activeIndex.set(index);
  }

  togglePause(): void {
    this.isPaused.update((paused) => !paused);
    // Une reprise explicite doit fonctionner meme si le bouton garde le focus.
    if (!this.isPaused()) {
      this.isFocused.set(false);
    }
  }

  pauseOnHover(): void {
    this.isHovered.set(true);
  }

  resumeAfterHover(): void {
    this.isHovered.set(false);
  }

  pauseOnFocus(): void {
    this.isFocused.set(true);
  }

  resumeAfterFocus(): void {
    this.isFocused.set(false);
  }
}
