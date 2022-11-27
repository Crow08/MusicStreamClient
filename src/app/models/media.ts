import { Tag } from './tag';

export class Media {
  id: number;
  type: 'SONG' | 'VIDEO';
  title: string;
  uri: string;
  tags: Tag[];

  constructor(id: number, type: 'SONG' | 'VIDEO', title: string, uri: string, tags: Tag[]) {
    this.id = id;
    this.type = type;
    this.title = title;
    this.uri = uri;
    this.tags = tags;
  }
}
