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
      this.photoDataUrl = photo.dataUrl;
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : 'Impossible de prendre la photo.';
    }
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
        return 'Cette adresse e-mail est déjà utilisée.';
      case 'auth/invalid-email':
        return 'L’adresse e-mail est invalide.';
      case 'auth/weak-password':
        return 'Le mot de passe est trop faible.';
      default:
        return error instanceof Error ? error.message : 'La création du compte a échoué.';
    }
  }
}
