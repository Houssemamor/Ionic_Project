import { readMovieLanguage, writeMovieLanguage } from './language-preference';

describe('language preference', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('utilise le francais par defaut', () => {
    expect(readMovieLanguage()).toBe('fr');
  });

  it('relit la langue memorisee', () => {
    writeMovieLanguage('en');
    expect(readMovieLanguage()).toBe('en');

    writeMovieLanguage('fr');
    expect(readMovieLanguage()).toBe('fr');
  });

  it('retombe sur le francais si la valeur stockee est inconnue', () => {
    // Protect against a corrupted or manually edited localStorage entry.
    localStorage.setItem('movieDataLanguage', 'de');
    expect(readMovieLanguage()).toBe('fr');
  });
});
