import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { Auth } from '../../services/auth';
import { Camera, CameraResultType } from '@capacitor/camera';
import { TranslationService } from '../../i18n/translation.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { prepareProfilePhoto, ProfilePhotoTooLargeError } from '../../shared/photo';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  imports: [
    IonButton,
    IonContent,
    IonHeader,
    IonInput,
    IonItem,
    IonLabel,
    IonSpinner,
    IonText,
    IonTitle,
    IonToolbar,
    FormsModule,
    RouterLink,
    TranslatePipe,
  ],
})
export class RegisterPage {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly i18n = inject(TranslationService);

  firstName = '';
  lastName = '';
  age: number | null = null;
  email = '';
  password = '';
  confirmPassword = '';
  errorMessage = '';
  isSubmitting = false;
  photoDataUrl = '';

  async takePhoto(): Promise<void> {
    this.errorMessage = '';
    try {
      const photo = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
      });
      if (!photo.dataUrl) {
        this.errorMessage = this.i18n.t('errors.photoNotRetrieved');
        return;
      }
      this.photoDataUrl = await prepareProfilePhoto(photo.dataUrl);
    } catch (error) {
      this.errorMessage = error instanceof ProfilePhotoTooLargeError
        ? this.i18n.t('errors.photoTooLarge')
        : this.i18n.t('errors.photoCaptureFailed');
    }
  }

  async submit(): Promise<void> {
    this.errorMessage = '';

    if (
      !this.firstName.trim() ||
      !this.lastName.trim() ||
      !this.age ||
      !this.email.trim() ||
      !this.password ||
      !this.photoDataUrl
    ) {
      this.errorMessage = this.i18n.t('errors.fillAllFields');
      return;
    }

    if (this.age < 13 || this.age > 120) {
      this.errorMessage = this.i18n.t('errors.ageRange');
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = this.i18n.t('errors.passwordLength');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = this.i18n.t('errors.passwordMismatch');
      return;
    }

    this.isSubmitting = true;
    try {
      await this.auth.register({
        firstName: this.firstName,
        lastName: this.lastName,
        age: this.age,
        email: this.email,
        password: this.password,
        photoDataUrl: this.photoDataUrl,
      });
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
      case 'auth/email-already-in-use':
        return this.i18n.t('errors.emailInUse');
      case 'auth/invalid-email':
        return this.i18n.t('errors.invalidEmail');
      case 'auth/weak-password':
        return this.i18n.t('errors.weakPassword');
      case 'auth/password-does-not-meet-requirements':
        return this.i18n.t('errors.passwordRequirements');
      case 'auth/operation-not-allowed':
        return this.i18n.t('errors.operationNotAllowed');
      case 'auth/network-request-failed':
        return this.i18n.t('errors.network');
      default:
        console.error('Erreur Firebase inscription :', error);
        return this.i18n.t('errors.registerFailed');
    }
  }
}
