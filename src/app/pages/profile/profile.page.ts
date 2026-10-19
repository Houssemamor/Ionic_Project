import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
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
import { TranslationService } from '../../i18n/translation.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { AppLanguage } from '../../services/language-preference';

const PROFILE_LOAD_TIMEOUT_MS = 12000;

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  imports: [
    IonBackButton, IonButton, IonButtons, IonCard, IonCardContent, IonContent, IonHeader,
    IonItem, IonSelect, IonSelectOption, IonSpinner, IonText, IonTitle, IonToolbar,
    TranslatePipe,
  ],
})
export class ProfilePage implements OnInit {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  readonly i18n = inject(TranslationService);

  profile = signal<UserProfile | null>(null);
  isLoading = signal(true);
  isLoggingOut = signal(false);
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
    let timeoutId: number | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(new Error(this.i18n.t('errors.profileTimeout')));
        }, PROFILE_LOAD_TIMEOUT_MS);
      });

      const result = await Promise.race([this.loadProfile(), timeout]);
      this.profile.set(result);
      if (!result) {
        this.errorMessage.set(this.i18n.t('errors.profileNotFound'));
      }
    } catch (error) {
      console.error('Erreur profil :', error);
      // Le detail technique reste en console : l'interface n'affiche que la
      // langue choisie, jamais un message brut de Firebase.
      this.errorMessage.set(this.i18n.t('errors.profileLoad'));
    } finally {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
      this.isLoading.set(false);
    }
  }

  private async loadProfile(): Promise<UserProfile | null> {
    const user = await this.auth.waitForAuthState();
    if (!user) {
      return null;
    }
    return this.auth.getCurrentProfile(user);
  }

  /**
   * La langue choisie est globale : interface, messages et metadonnees TMDB.
   * Le service la conserve sur l'appareil et met a jour le signal partage.
   */
  changeLanguage(value: string | undefined): void {
    const language: AppLanguage = value === 'en' ? 'en' : 'fr';
    this.i18n.setLanguage(language);
  }

  async logout(): Promise<void> {
    this.isLoggingOut.set(true);
    try {
      await this.auth.logout();
      await this.router.navigateByUrl('/login', { replaceUrl: true });
    } catch (error) {
      console.error('Erreur deconnexion :', error);
      this.errorMessage.set(this.i18n.t('errors.logout'));
      this.isLoggingOut.set(false);
    }
  }
}
