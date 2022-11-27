import { GenericDataObject } from './genericDataObject';

export class Playlist extends GenericDataObject {
  author: string;

  constructor(id: number, name: string, author: string) {
    super(id, name);
    this.author = author;
  }
}
