import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  IonBackButton, IonButtons, IonButton, IonContent, IonHeader, IonItem, IonLabel, IonList,
  IonSearchbar, IonSegment, IonSegmentButton, IonSpinner, IonText,
  IonTitle, IonToolbar,
} from '@ionic/angular';
import { Auth } from '../../../services/auth';
import { UserProfile } from '../../../models/user.model';

type StatusFilter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-users',
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss'],
  imports: [
    IonBackButton, IonButtons, IonButton, IonContent, IonHeader, IonItem, IonLabel, IonList,
    IonSearchbar, IonSegment, IonSegmentButton, IonSpinner, IonText,
    IonTitle, IonToolbar,
  ],
})
export class UsersPage implements OnInit {
  private readonly auth = inject(Auth);

  users = signal<UserProfile[]>([]);
  search = signal('');
  statusFilter = signal<StatusFilter>('all');
  isLoading = signal(true);
  errorMessage = signal('');
  updatingUserId = signal('');

  filteredUsers = computed(() => {
    const query = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    return this.users().filter((user) => {
      const matchesSearch =
        !query ||
        `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase().includes(query);
      const matchesStatus =
        status === 'all' || (status === 'active' ? user.active : !user.active);
      return matchesSearch && matchesStatus;
    });
  });

  async ngOnInit(): Promise<void> {
    try {
      this.users.set(await this.auth.listUsers());
    } catch (error) {
      console.error('Erreur listUsers :', error);
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Impossible de charger les utilisateurs.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async toggleActive(user: UserProfile): Promise<void> {
    this.updatingUserId.set(user.id);
    this.errorMessage.set('');
    try {
      const newValue = !user.active;
      await this.auth.setUserActive(user.id, newValue);
      // on remplace l'objet pour que le signal détecte le changement
      this.users.update((list) =>
        list.map((u) => (u.id === user.id ? { ...u, active: newValue } : u))
      );
    } catch (error) {
      console.error('Erreur setUserActive :', error);
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Impossible de modifier le statut.'
      );
    } finally {
      this.updatingUserId.set('');
    }
  }
}