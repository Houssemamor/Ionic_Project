import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  IonBackButton, IonButtons, IonButton, IonContent, IonHeader, IonItem, IonLabel, IonList,
  IonSearchbar, IonSegment, IonSegmentButton, IonSpinner, IonText,
  IonTitle, IonToolbar,
} from '@ionic/angular';
import { Auth } from '../../../services/auth';
import { UserProfile } from '../../../models/user.model';
import { TranslationService } from '../../../i18n/translation.service';
import { TranslatePipe } from '../../../i18n/translate.pipe';

type StatusFilter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-users',
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.scss'],
  imports: [
    IonBackButton, IonButtons, IonButton, IonContent, IonHeader, IonItem, IonLabel, IonList,
    IonSearchbar, IonSegment, IonSegmentButton, IonSpinner, IonText,
    IonTitle, IonToolbar, TranslatePipe,
  ],
})
export class UsersPage implements OnInit {
  private readonly auth = inject(Auth);
  private readonly i18n = inject(TranslationService);

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
      this.errorMessage.set(this.i18n.t('errors.usersLoad'));
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
      // On remplace l'objet pour que le signal detecte le changement.
      this.users.update((list) =>
        list.map((u) => (u.id === user.id ? { ...u, active: newValue } : u)),
      );
    } catch (error) {
      console.error('Erreur setUserActive :', error);
      this.errorMessage.set(this.i18n.t('errors.statusUpdate'));
    } finally {
      this.updatingUserId.set('');
    }
  }
}
