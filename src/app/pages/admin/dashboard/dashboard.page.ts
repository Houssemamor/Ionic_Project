import { Component } from '@angular/core';
import { IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { TranslatePipe } from '../../../i18n/translate.pipe';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  imports: [
    IonBackButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar,
    TranslatePipe,
  ],
})
export class DashboardPage {
  // Page statique : tout le contenu est fourni par le template.
}
