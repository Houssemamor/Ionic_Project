import { Injectable, inject } from '@angular/core';
import { Auth } from './auth';
import { Favorite } from './favorite';
import { UserProfile } from '../models/user.model';
import { TranslationService } from '../i18n/translation.service';

export interface MatchResult {
  user: UserProfile;
  rate: number;          // pourcentage, arrondi
  commonTitles: string[];
}

export interface MatchingOutcome {
  myFavoritesCount: number;
  matches: MatchResult[];
  checkedUsersCount: number;
  bestRate: number;
}

@Injectable({ providedIn: 'root' })
export class Matching {
  private readonly auth = inject(Auth);
  private readonly favorites = inject(Favorite);
  private readonly i18n = inject(TranslationService);

  async findMatches(threshold = 75): Promise<MatchingOutcome> {
    const me = await this.auth.waitForAuthState();
    if (!me) {
      throw new Error(this.i18n.t('errors.notLoggedIn'));
    }

    const [users, allFavorites] = await Promise.all([
      this.auth.listUsers(),
      this.favorites.listAll(),
    ]);

    // userId -> (idFilm -> titre)
    const byUser = new Map<string, Map<string, string>>();
    for (const fav of allFavorites) {
      if (!fav.userId) continue;
      const movieId = this.normalizeMovieId(fav.movieId ?? fav.id, fav.userId);
      if (!movieId) continue;
      const title = (fav as unknown as { title?: string }).title ?? movieId;
      if (!byUser.has(fav.userId)) {
        byUser.set(fav.userId, new Map());
      }
      byUser.get(fav.userId)!.set(movieId, title);
    }

    const mine = byUser.get(me.uid) ?? new Map<string, string>();
    if (mine.size === 0) {
      return { myFavoritesCount: 0, matches: [], checkedUsersCount: 0, bestRate: 0 };
    }

    const matches: MatchResult[] = [];
    let checkedUsersCount = 0;
    let bestRate = 0;
    for (const user of users) {
      if (user.id === me.uid || !user.active) continue;

      const theirs = byUser.get(user.id);
      if (!theirs || theirs.size === 0) continue;
      checkedUsersCount++;

      const commonIds = [...mine.keys()].filter((id) => theirs.has(id));
      const unionSize = new Set([...mine.keys(), ...theirs.keys()]).size;
      const rate = (commonIds.length / unionSize) * 100;
      bestRate = Math.max(bestRate, rate);

      if (rate > threshold) {
        matches.push({
          user,
          rate: Math.round(rate),
          commonTitles: commonIds.map((id) => mine.get(id) ?? id),
        });
      }
    }

    matches.sort((a, b) => b.rate - a.rate);
    return {
      myFavoritesCount: mine.size,
      matches,
      checkedUsersCount,
      bestRate: Math.round(bestRate),
    };
  }

  private normalizeMovieId(value: string | number | undefined, userId?: string): string {
    if (value === undefined || value === null) return '';
    let id = String(value).trim();
    if (userId && id.startsWith(`${userId}_`)) {
      id = id.substring(userId.length + 1);
    }
    if (id.startsWith('tmdb-')) {
      id = id.substring('tmdb-'.length);
    }
    return id;
  }
}