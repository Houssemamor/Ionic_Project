// Opérations Firestore utilisées pour gérer les films.
import { Injectable, inject } from '@angular/core';
import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { Movie as MovieModel } from '../models/movie.model';
import { TranslationService } from '../i18n/translation.service';

// Limite le temps d'attente afin d'éviter un écran bloqué indéfiniment.
const MOVIES_REQUEST_TIMEOUT_MS = 10000;

// Rend le service injectable partout dans l'application.
@Injectable({ providedIn: 'root' })
export class Movie {
  // Accès partagé à l'instance Firestore configurée dans FirebaseService.
  private readonly firebase = inject(FirebaseService);
  private readonly i18n = inject(TranslationService);

  // Retourne tous les films stockés dans la collection Firestore "movies".
  async list(): Promise<MovieModel[]> {
    let timeoutId: number | undefined;
    try {
      // Lance la requête Firestore et prépare un délai de sécurité parallèle.
      const moviesRequest = getDocs(collection(this.firebase.firestore, 'movies'));
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(new Error(this.i18n.t('errors.moviesLoadTimeout')));
        }, MOVIES_REQUEST_TIMEOUT_MS);
      });

      // Utilise le premier résultat disponible : Firestore ou le délai d'expiration.
      const snapshot = await Promise.race([moviesRequest, timeout]);

      // Transforme chaque document Firestore en objet contenant son identifiant.
      return snapshot.docs.map((movieDoc) => ({
        id: movieDoc.id,
        ...movieDoc.data(),
      } as MovieModel));
    } finally {
      // Nettoie le minuteur lorsque la requête est terminée, réussie ou échouée.
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    }
  }

  // Recherche un film précis par son identifiant.
  async get(id: string): Promise<MovieModel | null> {
    const snapshot = await getDocs(collection(this.firebase.firestore, 'movies'));
    const movieDoc = snapshot.docs.find((item) => item.id === id);
    return movieDoc
      ? ({ id: movieDoc.id, ...movieDoc.data() } as MovieModel)
      : null;
  }

  // Ajoute un nouveau film et enregistre la date de création côté serveur.
  async create(movie: Omit<MovieModel, 'id'>): Promise<MovieModel> {
    const reference = await addDoc(collection(this.firebase.firestore, 'movies'), {
      ...movie,
      createdAt: serverTimestamp(),
    });
    return { id: reference.id, ...movie };
  }

  // Met à jour uniquement les propriétés fournies pour un film existant.
  async update(id: string, movie: Partial<Omit<MovieModel, 'id'>>): Promise<void> {
    await updateDoc(doc(this.firebase.firestore, 'movies', id), movie);
  }

  // Supprime définitivement le document du film dans Firestore.
  async delete(id: string): Promise<void> {
    await deleteDoc(doc(this.firebase.firestore, 'movies', id));
  }
}
