import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonAvatar, IonButton, IonCard, IonCardContent, IonContent, IonHeader,
  IonItem, IonLabel, IonSpinner, IonText, IonTitle, IonToolbar,
} from '@ionic/angular';
import { Matching, MatchResult } from '../../services/matching';

@Component({
  selector: 'app-matching',
  templateUrl: './matching.page.html',
  styleUrls: ['./matching.page.scss'],
  imports: [
    IonAvatar, IonButton, IonCard, IonCardContent, IonContent, IonHeader,
    IonItem, IonLabel, IonSpinner, IonText, IonTitle, IonToolbar, RouterLink,
  ],
})
export class MatchingPage implements OnInit {
  private readonly matching = inject(Matching);

  matches = signal<MatchResult[]>([]);
  myFavoritesCount = signal(0);
  isLoading = signal(true);
  errorMessage = signal('');

  async ngOnInit(): Promise<void> {
    try {
      const outcome = await this.matching.findMatches(75);
      this.myFavoritesCount.set(outcome.myFavoritesCount);
      this.matches.set(outcome.matches);
    } catch (error) {
      console.error('Erreur matching :', error);
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Impossible de calculer les correspondances.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}