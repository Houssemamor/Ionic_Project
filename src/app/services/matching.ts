import { Injectable, inject } from '@angular/core';
import { Auth } from './auth';
import { Favorite } from './favorite';
import { UserProfile } from '../models/user.model';

export interface MatchResult {
  user: UserProfile;
  rate: number;          // pourcentage, arrondi
  commonTitles: string[];
}

export interface MatchingOutcome {
  myFavoritesCount: number;
  matches: MatchResult[];
}

@Injectable({ providedIn: 'root' })
export class Matching {
  private readonly auth = inject(Auth);
  private readonly favorites = inject(Favorite);

  async findMatches(threshold = 75): Promise<MatchingOutcome> {
    const me = await this.auth.waitForAuthState();
    if (!me) {
      throw new Error('Vous devez être connecté.');
    }

    const [users, allFavorites] = await Promise.all([
      this.auth.listUsers(),
      this.favorites.listAll(),
    ]);

    // userId -> (idFilm -> titre)
    const byUser = new Map<string, Map<string, string>>();
    for (const fav of allFavorites) {
      const movieId = fav.id.replace(`${fav.userId}_`, '');
      const title = (fav as unknown as { title?: string }).title ?? movieId;
      if (!byUser.has(fav.userId)) {
        byUser.set(fav.userId, new Map());
      }
      byUser.get(fav.userId)!.set(movieId, title);
    }

    const mine = byUser.get(me.uid) ?? new Map<string, string>();
    if (mine.size === 0) {
      return { myFavoritesCount: 0, matches: [] };
    }

    const matches: MatchResult[] = [];
    for (const user of users) {
      if (user.id === me.uid || !user.active) continue;

      const theirs = byUser.get(user.id);
      if (!theirs || theirs.size === 0) continue;

      const commonIds = [...mine.keys()].filter((id) => theirs.has(id));
      const unionSize = new Set([...mine.keys(), ...theirs.keys()]).size;
      const rate = (commonIds.length / unionSize) * 100;

      if (rate >= threshold) {
        matches.push({
          user,
          rate: Math.round(rate),
          commonTitles: commonIds.map((id) => mine.get(id) ?? id),
        });
      }
    }

    matches.sort((a, b) => b.rate - a.rate);
    return { myFavoritesCount: mine.size, matches };
  }
}