import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton, IonCard, IonCardContent, IonContent, IonHeader,
  IonLabel, IonList, IonItem, IonSpinner, IonText, IonTitle, IonToolbar,
} from '@ionic/angular';
import { Auth } from '../services/auth';
import { UserProfile } from '../models/user.model';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    IonButton, IonCard, IonCardContent, IonContent, IonHeader,
    IonItem, IonLabel, IonList, IonSpinner, IonText, IonTitle, IonToolbar,
    RouterLink,
  ],
})
export class HomePage implements OnInit {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  profile = signal<UserProfile | null>(null);
  isLoading = signal(true);
  errorMessage = signal('');
  isLoggingOut = false;

  async ngOnInit(): Promise<void> {
    try {
      const user = await this.auth.waitForAuthState();
      if (user) {
        this.profile.set(await this.auth.getCurrentProfile(user));
      }
    } catch (error) {
      console.error('Erreur chargement accueil :', error);
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Impossible de charger votre profil.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async logout(): Promise<void> {
    this.isLoggingOut = true;
    try {
      await this.auth.logout();
      await this.router.navigateByUrl('/login', { replaceUrl: true });
    } catch (error) {
      console.error('Erreur déconnexion :', error);
      this.errorMessage.set(
        error instanceof Error ? error.message : 'La déconnexion a échoué.'
      );
      this.isLoggingOut = false;
    }
  }
}
