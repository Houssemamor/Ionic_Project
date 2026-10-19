import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { AppLanguage, readAppLanguage, writeAppLanguage } from '../services/language-preference';
import { TranslationKey, dictionaries } from './translations';

export type TranslationParams = Record<string, string | number>;

/**
 * Traduction runtime francaise/anglaise.
 * Le signal `language` rend les templates reactifs : changer la langue met a
 * jour toutes les chaines visibles sans rechargement, et le choix est conserve.
 */
@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly document = inject(DOCUMENT);

  readonly language = signal<AppLanguage>(readAppLanguage());

  constructor() {
    // Annonce la langue courante aux lecteurs d'ecran et aux moteurs de recherche.
    this.document.documentElement.lang = this.language();
  }

  setLanguage(language: AppLanguage): void {
    writeAppLanguage(language);
    this.language.set(language);
    this.document.documentElement.lang = language;
  }

  /** Traduit une cle et remplace les jetons {nom} par leurs valeurs. */
  t(key: TranslationKey, params: TranslationParams = {}): string {
    // Lecture du signal : les appels depuis un template participent a la
    // detection de changement et se rejouent quand la langue change.
    const template = dictionaries[this.language()][key];
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      params[name] === undefined ? match : String(params[name]),
    );
  }
}
