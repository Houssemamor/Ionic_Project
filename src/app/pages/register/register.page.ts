import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
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
    CommonModule,
    FormsModule,
    RouterLink,
  ],
})
export class RegisterPage {
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
        throw new Error('La photo n’a pas pu être récupérée.');
      }
      this.photoDataUrl = await this.optimizePhoto(photo.dataUrl);
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Impossible de prendre la photo.';
    }
  }

  private optimizePhoto(dataUrl: string): Promise<string> {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        const maxSize = 512;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        if (!context) {
          resolve(dataUrl);
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      image.onerror = () => resolve(dataUrl);
      image.src = dataUrl;
    });
  }

  constructor(
    private readonly auth: Auth,
    private readonly router: Router,
  ) {}

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
      this.errorMessage = 'Veuillez remplir tous les champs et prendre une photo.';
      return;
    }

    if (this.age < 13 || this.age > 120) {
      this.errorMessage = 'L’âge doit être compris entre 13 et 120 ans.';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'Le mot de passe doit contenir au moins 6 caractères.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas.';
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
        return 'Cette adresse e-mail existe déjà. Utilisez une autre adresse ou connectez-vous avec ce compte.';
      case 'auth/invalid-email':
        return 'L’adresse e-mail est invalide.';
      case 'auth/weak-password':
        return 'Le mot de passe est trop faible.';
      case 'auth/password-does-not-meet-requirements':
        return 'Le mot de passe ne respecte pas les exigences Firebase.';
      case 'auth/operation-not-allowed':
        return 'L’inscription par e-mail/mot de passe n’est pas activée dans Firebase Authentication.';
      case 'auth/network-request-failed':
        return 'Impossible de contacter Firebase. Vérifiez votre connexion.';
      default:
        console.error('Erreur Firebase inscription :', error);
        return 'La création du compte a échoué. Consultez la console pour le code Firebase.';
    }
  }
}
