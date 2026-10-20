import { withoutUndefined } from './firestore';

describe('withoutUndefined', () => {
  it('retire les proprietes undefined et conserve les autres', () => {
    const result = withoutUndefined({
      id: 'tmdb-1',
      title: 'Film',
      genres: undefined,
      posterPath: undefined,
      voteAverage: 0,
    });

    expect(result).toEqual({
      id: 'tmdb-1',
      title: 'Film',
      voteAverage: 0,
    });
  });
});
