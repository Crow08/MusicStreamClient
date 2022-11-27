import { Artist } from './artist';
import { Album } from './album';
import { Media } from './media';
import { Genre } from './genre';
import { Tag } from './tag';

export class Song extends Media {
  artist: Artist;
  album: Album;
  genres: Genre[];
  spotify: boolean;

  constructor(
    id: number,
    type: 'SONG' | 'VIDEO',
    title: string,
    uri: string,
    tags: Tag[],
    artist: Artist,
    album: Album,
    genres: Genre[],
    spotify: boolean
  ) {
    super(id, type, title, uri, tags);
    this.artist = artist;
    this.album = album;
    this.genres = genres;
    this.spotify = spotify;
  }
}
