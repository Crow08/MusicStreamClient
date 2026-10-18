import { Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { PlayerState } from '../player.component';
import { MediaService } from '../../../services/media.service';
import { debounce, interval, Subject, Subscription } from 'rxjs';
import { Chapter } from '../../../models/chapter';

// Layout of the thumbnail sprite, must match musicStreamServer/convert-video.ps1:
// tile n shows the time n * THUMBNAIL_INTERVAL, at column n % THUMBNAIL_COLUMNS and row floor(n / THUMBNAIL_COLUMNS).
const THUMBNAIL_INTERVAL = 2;
const THUMBNAIL_WIDTH = 160;
const THUMBNAIL_HEIGHT = 90;
const THUMBNAIL_COLUMNS = 10;

interface SeekPreview {
  /** Horizontal center of the preview, relative to the progress wrapper. */
  left: number;
  time: string;
  /** CSS background-position of the tile, null without thumbnails. */
  tilePosition: string | null;
  /** Title of the chapter at the hovered position, null without chapters. */
  chapter: string | null;
}

@Component({
  selector: 'app-player-track',
  templateUrl: './player-track.component.html',
  styleUrls: ['./player-track.component.scss'],
})
export class PlayerTrackComponent implements OnInit, OnChanges, OnDestroy {
  progression = 0;
  rawSeek = new Subject<number>();
  @Input()
  playerState!: PlayerState;
  /** Pre-signed URL of the thumbnail sprite of the current video, null if there is none. */
  @Input()
  thumbnailUrl: string | null = null;
  /** Chapters of the current video, ordered by start time, empty if there are none. */
  @Input()
  chapters: Chapter[] = [];
  @Output()
  seek = new EventEmitter<number>();
  @ViewChild('wrapper', { static: true })
  wrapper!: ElementRef<HTMLElement>;
  @ViewChild('slider', { read: ElementRef, static: true })
  slider!: ElementRef<HTMLElement>;

  preview: SeekPreview | null = null;
  readonly thumbnailWidth = THUMBNAIL_WIDTH;
  readonly thumbnailHeight = THUMBNAIL_HEIGHT;
  /**
   * CSS background of the sprite once it is loaded. The preview is only shown with a loaded sprite, so videos without
   * thumbnails (and songs) show no preview, and a hover never shows a half loaded or broken image.
   */
  thumbnailBackground: string | null = null;
  private requestedThumbnailUrl: string | null = null;
  /** Number of tiles in the loaded sprite; the last ones may be cut off by rounding of the video duration. */
  private thumbnailCount = 0;

  private seekSubscription: Subscription | null = null;
  private hovering = false;
  private dragging = false;
  private readonly progressionListener = (progression: number) => (this.progression = progression);
  // while dragging, the pointer may leave the slider: follow it on the document until it is released
  private readonly dragMoveListener = (event: PointerEvent) => this.updatePreview(event.clientX);
  private readonly dragEndListener = (event: PointerEvent) => this.endDrag(event);

  constructor(private mediaService: MediaService) {}

  ngOnInit(): void {
    this.mediaService.addProgressionListener(this.progressionListener);
    this.seekSubscription = this.rawSeek.pipe(debounce(() => interval(250))).subscribe({
      next: (value) => {
        this.seek.emit(this.getJumpOffset(value));
      },
    });
  }

  ngOnChanges(): void {
    this.preloadThumbnails();
  }

  ngOnDestroy(): void {
    this.mediaService.removeProgressionListener(this.progressionListener);
    this.seekSubscription?.unsubscribe();
    this.removeDragListeners();
  }

  onSeek(value: number) {
    this.rawSeek.next(value);
  }

  onPointerMove(event: PointerEvent) {
    this.hovering = true;
    this.updatePreview(event.clientX);
  }

  onPointerDown(event: PointerEvent) {
    this.dragging = true;
    this.updatePreview(event.clientX);
    document.addEventListener('pointermove', this.dragMoveListener);
    document.addEventListener('pointerup', this.dragEndListener);
    document.addEventListener('pointercancel', this.dragEndListener);
  }

  onPointerLeave() {
    this.hovering = false;
    if (!this.dragging) {
      this.preview = null;
    }
  }

  getTimeDisplay(): string {
    return `${this.getDurationString(this.mediaService.getCurrentTime())} / ${this.getDurationString(
      this.mediaService.getDuration()
    )}`;
  }

  /** Positions (percent of the seek bar) of the chapter boundaries; the first chapter starts at 0 and has no marker. */
  getChapterMarkers(): number[] {
    const duration = this.mediaService.getDuration();
    if (!isFinite(duration) || duration <= 0) {
      return [];
    }
    return this.chapters.filter((c) => c.start > 0 && c.start < duration).map((c) => (c.start / duration) * 100);
  }

  getDurationString(seconds: number): string {
    if (isNaN(seconds)) {
      return '';
    }
    const date = new Date(0);
    date.setSeconds(seconds); // specify value for SECONDS here
    return date.toISOString().substring(14, 19);
  }

  protected getJumpOffset(seekPercent: number): number {
    return Math.round(this.mediaService.getProgressionOffsetInSeconds(seekPercent) * 1000);
  }

  private endDrag(event: PointerEvent) {
    this.dragging = false;
    this.removeDragListeners();
    // touch has no hover: hide the preview once the finger is lifted
    if (!this.hovering || event.pointerType !== 'mouse') {
      this.preview = null;
    }
  }

  private removeDragListeners() {
    document.removeEventListener('pointermove', this.dragMoveListener);
    document.removeEventListener('pointerup', this.dragEndListener);
    document.removeEventListener('pointercancel', this.dragEndListener);
  }

  private updatePreview(clientX: number) {
    const duration = this.mediaService.getDuration();
    // the slider values map to the track, which is inset from the slider element
    const track = this.slider.nativeElement.querySelector('.mdc-slider__track') ?? this.slider.nativeElement;
    const trackRect = track.getBoundingClientRect();
    const hasChapters = this.chapters.length > 0;
    if ((!this.thumbnailBackground && !hasChapters) || !isFinite(duration) || duration <= 0 || trackRect.width === 0) {
      this.preview = null;
      return;
    }
    const time = this.clamp((clientX - trackRect.left) / trackRect.width, 0, 1) * duration;

    let tilePosition: string | null = null;
    if (this.thumbnailBackground) {
      const tile = Math.min(Math.floor(time / THUMBNAIL_INTERVAL), this.thumbnailCount - 1);
      const x = (tile % THUMBNAIL_COLUMNS) * THUMBNAIL_WIDTH;
      const y = Math.floor(tile / THUMBNAIL_COLUMNS) * THUMBNAIL_HEIGHT;
      tilePosition = `-${x}px -${y}px`;
    }
    const chapter = hasChapters ? this.getChapterAt(time)?.title ?? null : null;

    // keep the preview inside the player
    const wrapperRect = this.wrapper.nativeElement.getBoundingClientRect();
    const halfWidth = THUMBNAIL_WIDTH / 2;
    const left = this.clamp(clientX - wrapperRect.left, halfWidth, Math.max(halfWidth, wrapperRect.width - halfWidth));

    this.preview = { left, time: this.getDurationString(time), tilePosition, chapter };
  }

  private getChapterAt(time: number): Chapter | undefined {
    let current: Chapter | undefined;
    for (const chapter of this.chapters) {
      if (chapter.start > time) {
        break;
      }
      current = chapter;
    }
    return current;
  }

  private preloadThumbnails() {
    const url = this.thumbnailUrl;
    if (url === this.requestedThumbnailUrl) {
      return;
    }
    this.requestedThumbnailUrl = url;
    this.thumbnailBackground = null;
    this.preview = null;
    if (!url) {
      return;
    }
    const image = new Image();
    // a missing sprite (404) never fires load: no preview for this video
    image.onload = () => {
      const tiles = Math.floor(image.naturalWidth / THUMBNAIL_WIDTH) * Math.floor(image.naturalHeight / THUMBNAIL_HEIGHT);
      if (this.requestedThumbnailUrl === url && tiles > 0) {
        this.thumbnailCount = tiles;
        this.thumbnailBackground = `url("${url}")`;
      }
    };
    image.src = url;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}
