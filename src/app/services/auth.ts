import { Injectable, inject } from '@angular/core';
import {
  User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  doc,
  getDocs,
  getDocFromServer,
  collection,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import { Capacitor } from '@capacitor/core';
import { FirebaseService } from './firebase.service';
import { UserProfile } from '../models/user.model';
import { TranslationService } from '../i18n/translation.service';
import {
  PROFILE_PHOTO_MAX_DATA_URL_LENGTH,
  ProfilePhotoTooLargeError,
} from '../shared/photo';

export interface RegisterData {
  firstName: string;
  lastName: string;
  age: number;
  email: string;
  password: string;
  photoDataUrl: string;
}

const PROFILE_REQUEST_TIMEOUT_MS = 10000;
const USERS_REQUEST_TIMEOUT_MS = 10000;

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private readonly firebase = inject(FirebaseService);
  private readonly i18n = inject(TranslationService);

  async register(data: RegisterData): Promise<UserProfile> {
    const credential = await createUserWithEmailAndPassword(
      this.firebase.auth,
      data.email.trim(),
      data.password,
    );

    const profile: UserProfile = {
      id: credential.user.uid,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      age: data.age,
      email: data.email.trim(),
      role: 'user',
      active: true,
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(this.firebase.firestore, 'users', credential.user.uid), {
      ...profile,
      createdAt: serverTimestamp(),
    });
    // Firebase Storage uploads from localhost require a bucket CORS policy.
    // Keep web registration usable while Storage is configured, and use Storage
    // on the native app where the camera requirement applies.
    const photoUrl = Capacitor.isNativePlatform()
      ? await this.uploadProfilePhoto(credential.user.uid, data.photoDataUrl)
      : data.photoDataUrl;
    await updateDoc(doc(this.firebase.firestore, 'users', credential.user.uid), { photoUrl });
    profile.photoUrl = photoUrl;

    return profile;
  }

  private async uploadProfilePhoto(userId: string, photoDataUrl: string): Promise<string> {
    const photoReference = ref(this.firebase.storage, `profile-photos/${userId}`);
    await uploadString(photoReference, photoDataUrl, 'data_url');
    return getDownloadURL(photoReference);
  }

  /**
   * Met a jour la photo de profil sans Firebase Storage. La data URL est
   * deja compressee par l'appelant et validee contre la limite Firestore.
   */
  async updateProfilePhoto(photoDataUrl: string): Promise<string> {
    if (photoDataUrl.length > PROFILE_PHOTO_MAX_DATA_URL_LENGTH) {
      throw new ProfilePhotoTooLargeError();
    }

    const user = await this.waitForAuthState();
    if (!user) {
      throw new Error(this.i18n.t('errors.notLoggedIn'));
    }

    await updateDoc(doc(this.firebase.firestore, 'users', user.uid), {
      photoUrl: photoDataUrl,
    });
    return photoDataUrl;
  }

  async login(email: string, password: string): Promise<UserProfile> {
    const credential = await signInWithEmailAndPassword(
      this.firebase.auth,
      email.trim(),
      password,
    );
    const profile = await this.getProfile(credential.user);

    if (!profile.active) {
      await signOut(this.firebase.auth);
      // Code explicite pour que les pages distinguent ce refus des erreurs
      // Firebase brutes, dont le message reste en anglais.
      const error = new Error(this.i18n.t('errors.accountDisabled')) as Error & { code: string };
      error.code = 'auth/account-disabled';
      throw error;
    }

    return profile;
  }

  async logout(): Promise<void> {
    await signOut(this.firebase.auth);
  }

  async listUsers(): Promise<UserProfile[]> {
    let timeoutId: number | undefined;
    try {
      const usersRequest = getDocs(collection(this.firebase.firestore, 'users'));
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(new Error(this.i18n.t('errors.usersLoadTimeout')));
        }, USERS_REQUEST_TIMEOUT_MS);
      });
      const snapshot = await Promise.race([usersRequest, timeout]);
      return snapshot.docs.map((userDoc) => ({
        id: userDoc.id,
        ...userDoc.data(),
      } as UserProfile));
    } finally {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    }
  }

  async setUserActive(userId: string, active: boolean): Promise<void> {
    await updateDoc(doc(this.firebase.firestore, 'users', userId), { active });
  }

  getCurrentUser(): User | null {
    return this.firebase.auth.currentUser;
  }

  async getCurrentProfile(user: User | null = this.getCurrentUser()): Promise<UserProfile | null> {
    if (!user) {
      return null;
    }

    return this.getProfile(user);
  }

  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(this.firebase.auth, callback);
  }

  waitForAuthState(): Promise<User | null> {
    return new Promise((resolve) => {
      const currentUser = this.firebase.auth.currentUser;
      if (currentUser) {
        resolve(currentUser);
        return;
      }

      let settled = false;
      let unsubscribe: (() => void) | undefined;
      let timeoutId: number | undefined;
      const finish = (user: User | null): void => {
        if (settled) {
          return;
        }
        settled = true;
        unsubscribe?.();
        if (timeoutId !== undefined) {
          window.clearTimeout(timeoutId);
        }
        resolve(user);
      };

      unsubscribe = onAuthStateChanged(this.firebase.auth, finish);
      timeoutId = window.setTimeout(() => finish(null), 5000);
    });
  }

  private async getProfile(user: User): Promise<UserProfile> {
    let timeoutId: number | undefined;
    try {
      const profileRequest = getDocFromServer(
        doc(this.firebase.firestore, 'users', user.uid),
      );
      const timeout = new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(new Error(this.i18n.t('errors.profileRequestTimeout')));
        }, PROFILE_REQUEST_TIMEOUT_MS);
      });
      const snapshot = await Promise.race([profileRequest, timeout]);

      if (!snapshot.exists()) {
        throw new Error(this.i18n.t('errors.userProfileNotFound'));
      }

      return {
        id: snapshot.id,
        ...snapshot.data(),
      } as UserProfile;
    } finally {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    }
  }
}
