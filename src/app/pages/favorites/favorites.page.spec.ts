import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FavoritesPage } from './favorites.page';
import { Favorite } from '../../models/favorite.model';

describe('FavoritesPage', () => {
  let component: FavoritesPage;
  let fixture: ComponentFixture<FavoritesPage>;

  beforeEach(() => {
    // Le mode d'affichage est memorise dans localStorage : on repart d'un
    // etat neutre pour que le test de valeur par defaut reste fiable.
    localStorage.clear();
    fixture = TestBed.createComponent(FavoritesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('filtre la playlist sur le titre saisi', () => {
    component.favorites.set([
      { id: '1', title: 'Zorro', overview: '' },
      { id: '2', title: 'Amelie', overview: '' },
    ]);

    component.search.set('zor');

    expect(component.visibleFavorites().map((favorite) => favorite.id)).toEqual(['1']);
  });

  it('filtre la playlist sur le genre selectionne', () => {
    component.favorites.set([
      { id: '1', title: 'Zorro', overview: '', genres: ['Action'] },
      { id: '2', title: 'Amelie', overview: '', genres: ['Comédie'] },
    ]);
    component.selectedGenre.set('Comédie');

    expect(component.visibleFavorites().map((favorite) => favorite.id)).toEqual(['2']);
  });

  it('combine recherche et genre', () => {
    component.favorites.set([
      { id: '1', title: 'Zorro', overview: '', genres: ['Action'] },
      { id: '2', title: 'Amelie', overview: '', genres: ['Action'] },
    ]);
    component.search.set('amelie');
    component.selectedGenre.set('Action');

    expect(component.visibleFavorites().map((favorite) => favorite.id)).toEqual(['2']);
  });

  it('trie par date decroissante sans muter la source', () => {
    const source: Favorite[] = [
      { id: '1', title: 'Ancien', overview: '', releaseDate: '1990-01-01' },
      { id: '2', title: 'Recent', overview: '', releaseDate: '2024-05-02' },
    ];
    component.favorites.set(source);
    component.sortBy.set('date');

    expect(component.visibleFavorites().map((favorite) => favorite.id)).toEqual(['2', '1']);
    expect(source.map((favorite) => favorite.id)).toEqual(['1', '2']);
  });

  it('bascule entre grille et liste', () => {
    expect(component.view()).toBe('grid');

    component.toggleView();

    expect(component.view()).toBe('list');
  });
});