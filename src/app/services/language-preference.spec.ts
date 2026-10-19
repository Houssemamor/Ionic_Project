import { readAppLanguage, writeAppLanguage } from './language-preference';

describe('language preference', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('utilise le francais par defaut', () => {
    expect(readAppLanguage()).toBe('fr');
  });

  it('relit la langue memorisee', () => {
    writeAppLanguage('en');
    expect(readAppLanguage()).toBe('en');

    writeAppLanguage('fr');
    expect(readAppLanguage()).toBe('fr');
  });

  it('retombe sur le francais si la valeur stockee est inconnue', () => {
    // Protege contre une entree localStorage corrompue ou modifiee a la main.
    localStorage.setItem('movieDataLanguage', 'de');
    expect(readAppLanguage()).toBe('fr');
  });
});
