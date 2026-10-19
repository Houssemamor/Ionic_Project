import { Injectable, inject } from '@angular/core';
import {
  collection, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, where,
} from 'firebase/firestore';
import { FirebaseService } from './firebase.service';
import { Auth } from './auth';
import { Favorite as FavoriteModel } from '../models/favorite.model';
import { Movie } from '../models/movie.model';
import { TranslationService } from '../i18n/translation.service';

@Injectable({ providedIn: 'root' })
export class Favorite {
  private readonly firebase = inject(FirebaseService);
  private readonly auth = inject(Auth);
  private readonly i18n = inject(TranslationService);

async list(): Promise<FavoriteModel[]> {
  console.log('SERVICE: avant requireUserId');
  const userId = await this.requireUserId();
  console.log('SERVICE: userId =', userId);
  const q = query(
    collection(this.firebase.firestore, 'favorites'),
    where('userId', '==', userId),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((item) => {
    const data = item.data() as FavoriteModel;
    return {
      ...data,
      id: data.movieId ?? data.id ?? item.id,
      movieId: data.movieId ?? data.id ?? item.id,
    };
  });
}

  async add(movie: Movie): Promise<void> {
    const userId = await this.requireUserId();
    await setDoc(doc(this.firebase.firestore, 'favorites', `${userId}_${movie.id}`), {
      ...movie,
      movieId: movie.id,
      userId,
      addedAt: serverTimestamp(),
    });
  }

  async remove(movieId: string): Promise<void> {
    const userId = await this.requireUserId();
    const documentId = movieId.startsWith(`${userId}_`) ? movieId : `${userId}_${movieId}`;
    await deleteDoc(doc(this.firebase.firestore, 'favorites', documentId));
  }

  async listAll(): Promise<FavoriteModel[]> {
    const snapshot = await getDocs(collection(this.firebase.firestore, 'favorites'));
    return snapshot.docs.map((item) => {
      const data = item.data() as FavoriteModel;
      const movieId = data.movieId ?? data.id ?? item.id.substring(item.id.indexOf('_') + 1);
      return { ...data, id: movieId, movieId };
    });
  }

  private async requireUserId(): Promise<string> {
    const user = await this.auth.waitForAuthState();
    if (!user) {
      throw new Error(this.i18n.t('errors.notLoggedInFavorites'));
    }
    return user.uid;
  }
}