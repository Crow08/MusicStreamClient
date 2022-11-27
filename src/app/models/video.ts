import { Season } from './season';
import { Series } from './series';
import { Media } from './media';
import { Tag } from './tag';

export class Video extends Media {
  series: Series;
  season: Season;

  constructor(id: number, type: 'SONG' | 'VIDEO', title: string, uri: string, tags: Tag[], series: Series, season: Season) {
    super(id, type, title, uri, tags);
    this.series = series;
    this.season = season;
  }
}
