import {Album} from './album';
import {Artist} from './artist';

export class Song {
  id: number;
  title: string;
  artist: Artist;
  path: string;
  album: Album;
}
