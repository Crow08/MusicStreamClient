export class Chapter {
  /** Start time in seconds. */
  start: number;
  title: string;

  constructor(start: number, title: string) {
    this.start = start;
    this.title = title;
  }
}
