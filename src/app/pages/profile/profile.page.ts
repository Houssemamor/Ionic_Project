import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { Auth } from '../../services/auth';
import { UserProfile } from '../../models/user.model';
import {
  MovieLanguage, readMovieLanguage, writeMovieLanguage,
} from '../../services/language-preference';

const PROFILE_LOAD_TIMEOUT_MS = 12000;

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [
    IonBackButton, IonButton, IonButtons, IonCard, IonCardContent, IonContent, IonHeader,
    IonItem, IonLabel, IonSelect, IonSelectOption, IonSpinner, IonText, IonTitle, IonToolbar,
    RouterLink,
  ],
})
export class ProfilePage implements OnInit {
  profile = signal<UserProfile | null>(null);
  isLoading = signal(true);
  isLoggingOut = signal(false);
  errorMessage = signal('');
  // Preference locale, independante du profil Firestore : elle reste sur
  // l'appareil comme le mode d'affichage grille/liste.
  language = signal<MovieLanguage>(readMovieLanguage());

  constructor(
    private readonly auth: Auth,
    private readonly router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    let timeoutId: number | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(new Error('Le chargement du profil a dépassé le délai. Vérifiez votre connexion et réessayez.'));
        }, PROFILE_LOAD_TIMEOUT_MS);
      });

      const result = await Promise.race([this.loadProfile(), timeout]);
      this.profile.set(result);
      if (!result) {
        this.errorMessage.set('Profil utilisateur introuvable.');
      }
    } catch (error) {
      console.error('Erreur profil :', error);   // utile pour voir la vraie cause
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Impossible de charger le profil.'
      );
    } finally {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      this.isLoading.set(false);
    }
  }

  private async loadProfile(): Promise<UserProfile | null> {
    const user = await this.auth.waitForAuthState();
    if (!user) return null;
    return this.auth.getCurrentProfile(user);
  }

  /** Enregistre la langue des metadonnees TMDB choisie dans le profil. */
  changeLanguage(value: string | undefined): void {
    const language: MovieLanguage = value === 'en' ? 'en' : 'fr';
    writeMovieLanguage(language);
    this.language.set(language);
  }

  async logout(): Promise<void> {    this.isLoggingOut.set(true);
    try {
      await this.auth.logout();
      await this.router.navigateByUrl('/login', { replaceUrl: true });
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'La déconnexion a échoué.'
      );
      this.isLoggingOut.set(false);
    }
  }
}