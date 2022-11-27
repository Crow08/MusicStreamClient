import { Tag } from './tag';

export class Media {
  id: number;
  type: 'SONG' | 'VIDEO';
  title: string;
  uri: string;
  tags: Tag[];
}
