import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
  IonSpinner,
  IonText,
} from '@ionic/angular';
import { Auth } from '../../services/auth';
import { TranslationService } from '../../i18n/translation.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { LoginHeroComponent } from './login-hero/login-hero';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [
    IonButton,
    IonContent,
    IonInput,
    IonItem,
    IonLabel,
    IonSpinner,
    IonText,
    FormsModule,
    RouterLink,
    TranslatePipe,
    LoginHeroComponent,
  ],
})
export class LoginPage {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly i18n = inject(TranslationService);

  email = '';
  password = '';
  errorMessage = '';
  isSubmitting = false;

  async submit(): Promise<void> {
    this.errorMessage = '';

    if (!this.email.trim() || !this.password) {
      this.errorMessage = this.i18n.t('errors.loginMissing');
      return;
    }

    this.isSubmitting = true;
    try {
      await this.auth.login(this.email, this.password);
      await this.router.navigateByUrl('/home', { replaceUrl: true });
    } catch (error) {
      this.errorMessage = this.getErrorMessage(error);
    } finally {
      this.isSubmitting = false;
    }
  }

  private getErrorMessage(error: unknown): string {
    const code = error instanceof Error && 'code' in error
      ? String((error as Error & { code?: string }).code)
      : '';

    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return this.i18n.t('errors.invalidCredentials');
      case 'auth/invalid-email':
        return this.i18n.t('errors.invalidEmail');
      case 'auth/too-many-requests':
        return this.i18n.t('errors.tooManyRequests');
      case 'auth/account-disabled':
      case 'auth/user-disabled':
        return this.i18n.t('errors.accountDisabled');
      default:
        // Le message brut de Firebase est en anglais : on journalise la cause
        // technique et on n'affiche que le texte traduit.
        console.error('Erreur Firebase connexion :', error);
        return this.i18n.t('errors.loginFailed');
    }
  }
}
