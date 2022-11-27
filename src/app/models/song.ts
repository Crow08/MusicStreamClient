import { Artist } from './artist';
import { Album } from './album';
import { Media } from './media';
import { Genre } from './genre';

export class Song extends Media {
  artist: Artist;
  album: Album;
  genres: Genre[];
  spotify: boolean;
}
