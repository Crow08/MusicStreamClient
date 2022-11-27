import { Season } from './season';
import { Series } from './series';
import { Media } from './media';

export class Video extends Media {
  series: Series;
  season: Season;
}
