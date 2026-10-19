// Importe les fonctionnalites Angular necessaires a la page.
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

// Importe les composants visuels Ionic utilises dans le template HTML.
import { IonBackButton, IonButtons, IonButton, IonContent, IonHeader, IonInput, IonItem, IonLabel, IonList, IonSelect, IonSelectOption, IonText, IonTitle, IonToolbar } from '@ionic/angular';

// Movie est le service d'acces a Firestore ; MovieModel decrit la forme d'un film.
import { Movie } from '../../../services/movie';
import { Movie as MovieModel } from '../../../models/movie.model';
import { TranslationService } from '../../../i18n/translation.service';
import { TranslatePipe } from '../../../i18n/translate.pipe';

// Declare la page autonome de gestion des films administrateur.
@Component({
  // Nom utilise par Angular pour identifier ce composant.
  selector: 'app-movies',
  // Fichiers contenant respectivement la structure HTML et les styles de la page.
  templateUrl: './movies.page.html',
  styleUrls: ['./movies.page.scss'],
  // Composants et modules utilisables dans le template.
  imports: [IonBackButton, IonButtons, IonButton, IonContent, IonHeader, IonInput, IonItem, IonLabel, IonList, IonSelect, IonSelectOption, IonText, IonTitle, IonToolbar, FormsModule, TranslatePipe]
})
export class MoviesPage implements OnInit {
  // Injecte le service responsable des operations Firestore sur les films.
  private readonly movieService = inject(Movie);
  private readonly i18n = inject(TranslationService);

  // Liste des films affiches dans la page.
  movies: MovieModel[] = [];

  // Valeurs saisies dans le formulaire d'ajout.
  title = '';
  overview = '';
  releaseDate = '';
  posterPath = '';
  genresText = '';

  // Identifiant du film choisi dans la liste deroulante de suppression.
  selectedMovieId = '';

  // Etats utilises pour afficher les chargements et desactiver les actions concurrentes.
  isLoading = true;
  isSaving = false;
  isDeletingMovieId: string | null = null;

  // Messages affiches a l'utilisateur apres une operation.
  errorMessage = '';
  successMessage = '';

  // Charge les films des l'ouverture de la page.
  async ngOnInit(): Promise<void> {
    await this.loadMovies();
  }

  // Recupere les films depuis Firestore et gere l'etat de chargement.
  async loadMovies(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    try {
      this.movies = await this.movieService.list();
    } catch (error) {
      // Conserve l'erreur dans la console et affiche un message traduit.
      console.error('Erreur chargement films admin :', error);
      this.errorMessage = this.i18n.t('errors.moviesLoad');
    } finally {
      this.isLoading = false;
    }
  }

  // Valide le formulaire puis cree un nouveau film dans Firestore.
  async addMovie(): Promise<void> {
    // Le titre et le synopsis sont les deux champs obligatoires.
    if (!this.title.trim() || !this.overview.trim()) {
      this.errorMessage = this.i18n.t('errors.movieRequired');
      return;
    }
    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';
    try {
      // Prepare les donnees en supprimant les espaces inutiles.
      const movie = await this.movieService.create({
        title: this.title.trim(),
        overview: this.overview.trim(),
        releaseDate: this.releaseDate || undefined,
        posterPath: this.posterPath.trim() || undefined,
        genres: this.genresText.split(',').map((genre) => genre.trim()).filter(Boolean),
      });

      // Ajoute le nouveau film en tete de la liste sans recharger la page.
      this.movies = [movie, ...this.movies];

      // Reinitialise le formulaire apres une creation reussie.
      this.title = '';
      this.overview = '';
      this.releaseDate = '';
      this.posterPath = '';
      this.genresText = '';

      // Informe l'administrateur que l'operation a reussi.
      this.successMessage = this.i18n.t('admin.movieAdded', { title: movie.title });
    } catch (error) {
      // Affiche l'erreur technique dans la console et le message traduit a l'ecran.
      console.error('Erreur ajout film admin :', error);
      this.errorMessage = this.i18n.t('errors.movieAdd');
    } finally {
      this.isSaving = false;
    }
  }

  // Supprime un film apres confirmation explicite de l'administrateur.
  async deleteMovie(movie: MovieModel): Promise<void> {
    // Evite une suppression accidentelle.
    if (!window.confirm(this.i18n.t('admin.confirmDelete', { title: movie.title }))) {
      return;
    }

    this.isDeletingMovieId = movie.id;
    this.errorMessage = '';
    this.successMessage = '';
    try {
      // Supprime le document correspondant dans la collection Firestore.
      await this.movieService.delete(movie.id);

      // Retire aussi le film de l'affichage local.
      this.movies = this.movies.filter((item) => item.id !== movie.id);
      if (this.selectedMovieId === movie.id) {
        // Reinitialise la selection si le film supprime etait selectionne.
        this.selectedMovieId = '';
      }

      // Informe l'administrateur que la suppression est terminee.
      this.successMessage = this.i18n.t('admin.movieDeleted', { title: movie.title });
    } catch (error) {
      // Signale explicitement l'echec de la suppression.
      console.error('Erreur suppression film admin :', error);
      this.errorMessage = this.i18n.t('errors.movieDelete');
    } finally {
      this.isDeletingMovieId = null;
    }
  }

  // Transforme la suppression depuis la liste deroulante en appel de deleteMovie.
  async deleteSelectedMovie(): Promise<void> {
    const movie = this.movies.find((item) => item.id === this.selectedMovieId);
    if (movie) {
      await this.deleteMovie(movie);
    }
  }
}
