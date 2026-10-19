import { Injectable, inject } from '@angular/core';
import {
  collection, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, where,
} from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { Auth } from './auth';
import { Dislike as DislikeModel } from '../models/dislike.model';
import { Movie } from '../models/movie.model';
import { TranslationService } from '../i18n/translation.service';

/**
 * Persiste les films que l'utilisateur ne veut plus voir recommander.
 * L'interface filtre les recommandations avec ces identifiants ; les films
 * restent visibles dans /movies pour que le choix puisse etre annule.
 */
@Injectable({ providedIn: 'root' })
export class Dislike {
  private readonly firebase = inject(FirebaseService);
  private readonly auth = inject(Auth);
  private readonly i18n = inject(TranslationService);

  async list(): Promise<DislikeModel[]> {
    const userId = await this.requireUserId();
    const dislikesQuery = query(
      collection(this.firebase.firestore, 'dislikes'),
      where('userId', '==', userId),
    );
    const snapshot = await getDocs(dislikesQuery);
    return snapshot.docs.map((item) => {
      const data = item.data() as DislikeModel;
      const movieId = data.movieId ?? data.id ?? item.id.substring(item.id.indexOf('_') + 1);
      return { ...data, id: movieId, movieId };
    });
  }

  async add(movie: Movie): Promise<void> {
    const userId = await this.requireUserId();
    // Les champs optionnels ne sont ecrits que s'ils existent : Firestore
    // refuse les valeurs undefined.
    const data: Record<string, unknown> = {
      movieId: movie.id,
      userId,
      addedAt: serverTimestamp(),
    };
    if (typeof movie.tmdbId === 'number') {
      data['tmdbId'] = movie.tmdbId;
    }
    await setDoc(
      doc(this.firebase.firestore, 'dislikes', `${userId}_${movie.id}`),
      data,
    );
  }

  async remove(movieId: string): Promise<void> {
    const userId = await this.requireUserId();
    const documentId = movieId.startsWith(`${userId}_`) ? movieId : `${userId}_${movieId}`;
    await deleteDoc(doc(this.firebase.firestore, 'dislikes', documentId));
  }

  private async requireUserId(): Promise<string> {
    const user = await this.auth.waitForAuthState();
    if (!user) {
      throw new Error(this.i18n.t('errors.notLoggedInDislikes'));
    }
    return user.uid;
  }
}
