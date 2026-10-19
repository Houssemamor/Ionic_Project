// Importe les fonctionnalités Angular nécessaires à la page.
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Importe les composants visuels Ionic utilisés dans le template HTML.
import { IonBackButton, IonButtons, IonButton, IonContent, IonHeader, IonInput, IonItem, IonLabel, IonList, IonSelect, IonSelectOption, IonText, IonTitle, IonToolbar } from '@ionic/angular';

// Movie est le service d'accès à Firestore ; MovieModel décrit la forme d'un film.
import { Movie } from '../../../services/movie';
import { Movie as MovieModel } from '../../../models/movie.model';

// Déclare la page autonome de gestion des films administrateur.
@Component({
  // Nom utilisé par Angular pour identifier ce composant.
  selector: 'app-movies',
  // Fichiers contenant respectivement la structure HTML et les styles de la page.
  templateUrl: './movies.page.html',
  styleUrls: ['./movies.page.scss'],
  // Composants et modules utilisables dans le template.
  imports: [IonBackButton, IonButtons, IonButton, IonContent, IonHeader, IonInput, IonItem, IonLabel, IonList, IonSelect, IonSelectOption, IonText, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class MoviesPage implements OnInit {
  // Injecte le service responsable des opérations Firestore sur les films.
  private readonly movieService = inject(Movie);

  // Liste des films affichés dans la page.
  movies: MovieModel[] = [];

  // Valeurs saisies dans le formulaire d'ajout.
  title = '';
  overview = '';
  releaseDate = '';
  posterPath = '';
  genresText = '';

  // Identifiant du film choisi dans la liste déroulante de suppression.
  selectedMovieId = '';

  // États utilisés pour afficher les chargements et désactiver les actions concurrentes.
  isLoading = true;
  isSaving = false;
  isDeletingMovieId: string | null = null;

  // Messages affichés à l'utilisateur après une opération.
  errorMessage = '';
  successMessage = '';

  // Charge les films dès l'ouverture de la page.
  async ngOnInit(): Promise<void> {
    await this.loadMovies();
  }

  // Récupère les films depuis Firestore et gère l'état de chargement.
  async loadMovies(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    try {
      this.movies = await this.movieService.list();
    } catch (error) {
      // Conserve l'erreur dans la console et affiche un message compréhensible.
      console.error('Erreur chargement films admin :', error);
      this.errorMessage = error instanceof Error ? error.message : 'Impossible de charger les films.';
    } finally {
      this.isLoading = false;
    }
  }

  // Valide le formulaire puis crée un nouveau film dans Firestore.
  async addMovie(): Promise<void> {
    // Le titre et le synopsis sont les deux champs obligatoires.
    if (!this.title.trim() || !this.overview.trim()) {
      this.errorMessage = 'Le titre et le synopsis sont obligatoires.';
      return;
    }
    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';
    try {
      // Prépare les données en supprimant les espaces inutiles.
      const movie = await this.movieService.create({
        title: this.title.trim(),
        overview: this.overview.trim(),
        releaseDate: this.releaseDate || undefined,
        posterPath: this.posterPath.trim() || undefined,
        genres: this.genresText.split(',').map((genre) => genre.trim()).filter(Boolean),
      });

      // Ajoute le nouveau film en tête de la liste sans recharger la page.
      this.movies = [movie, ...this.movies];

      // Réinitialise le formulaire après une création réussie.
      this.title = '';
      this.overview = '';
      this.releaseDate = '';
      this.posterPath = '';
      this.genresText = '';

      // Informe l'administrateur que l'opération a réussi.
      this.successMessage = `Le film « ${movie.title } » a été ajouté avec succès.`;
    } catch (error) {
      // Affiche l'erreur technique dans la console et l'erreur fonctionnelle à l'écran.
      console.error('Erreur ajout film admin :', error);
      this.errorMessage = error instanceof Error ? error.message : 'Impossible d’ajouter le film.';
    } finally {
      this.isSaving = false;
    }
  }

  // Supprime un film après confirmation explicite de l'administrateur.
  async deleteMovie(movie: MovieModel): Promise<void> {
    // Évite une suppression accidentelle.
    if (!window.confirm(`Voulez-vous vraiment supprimer le film « ${movie.title} » ?`)) {
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
        // Réinitialise la sélection si le film supprimé était sélectionné.
        this.selectedMovieId = '';
      }

      // Informe l'administrateur que la suppression est terminée.
      this.successMessage = `Le film « ${movie.title} » a été supprimé avec succès.`;
    } catch (error) {
      // Signale explicitement l'échec de la suppression.
      console.error('Erreur suppression film admin :', error);
      this.errorMessage = error instanceof Error ? error.message : 'Impossible de supprimer le film.';
    } finally {
      this.isDeletingMovieId = null;
    }
  }

  // Transforme la suppression depuis la liste déroulante en appel de deleteMovie.
  async deleteSelectedMovie(): Promise<void> {
    const movie = this.movies.find((item) => item.id === this.selectedMovieId);
    if (movie) {
      await this.deleteMovie(movie);
    }
  }
}
