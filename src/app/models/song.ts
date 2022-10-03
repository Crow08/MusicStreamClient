import {Album} from './album';
import {Artist} from './artist';
import {Genre} from './genre';
import {Tag} from './tag';

export class Song {
  id: number;
  title: string;
  artist: Artist;
  path: string;
  album: Album;
  genres: Genre[];
  tags: Tag[];
}
