import { AfterViewInit, Component, DoCheck, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { PlayerComponent } from '../player.component';
import { ActivatedRoute } from '@angular/router';
import { MediaService } from '../../../services/media.service';
import { SessionService } from '../../../services/session.service';
import { SettingsService } from '../../../services/settings.service';
import { AutoplayService } from '../../../services/autoplay.service';
import { PlayerEngineService } from '../../../services/player-engine.service';

/** Height (px) of a playlist row, all rows must have this height (virtual scrolling). */
const PLAYLIST_ROW_HEIGHT = 48;
/** Number of history rows shown above the current media when scrolling to it. */
const PLAYLIST_ROWS_BEFORE_CURRENT = 2;

/** A row of the playlist: history, current media and queue in one list. */
interface PlaylistRow {
  type: 'history' | 'current' | 'queue';
  media: { id: number; title: string };
  /** Index in the history or the queue. */
  index: number;
}

@Component({
  selector: 'app-full-player',
  templateUrl: './full-player.component.html',
  styleUrls: ['./full-player.component.scss'],
})
export class FullPlayerComponent extends PlayerComponent implements AfterViewInit, DoCheck, OnDestroy {
  @ViewChild('videoWrapper') videoWrapper: ElementRef | undefined;
  @ViewChild('playlistViewport') playlistViewport: CdkVirtualScrollViewport | undefined;
  readonly playlistRowHeight = PLAYLIST_ROW_HEIGHT;
  private playlistRowsCache: PlaylistRow[] = [];
  /** State the playlist rows were built from: history and queue are partly changed in place. */
  private playlistRowsSource: unknown[] = [];
  /** Current media (id and title) the playlist was last scrolled to, null before the first scroll. */
  private followedMedia: string | null = null;
  /** Row index of the followed media at the time it became current. */
  private followedRow = 0;
  private hideCursorTimeout: number | null = null;
  private singleVideoClickTimeout: number | null = null;
  private playlistResizeObserver: ResizeObserver | undefined;
  private readonly videoClickListener = () => this.onVideoClick();

  constructor(
    route: ActivatedRoute,
    engine: PlayerEngineService,
    mediaService: MediaService,
    settingsService: SettingsService,
    private sessionService: SessionService,
    private autoplayService: AutoplayService
  ) {
    super(engine, mediaService, settingsService);
    this.autoplayService.check();
    sessionService.joinSession(Number(route.snapshot.paramMap.get('sessionId')));
  }

  /** Playlist rows, rebuilt only when the history, the queue or the current media changed. */
  get playlistRows(): PlaylistRow[] {
    const history = this.history;
    const queue = this.queue;
    const current = this.currentMedia;
    const source = [history, history.length, queue, queue.length, current, current.title];
    if (source.some((value, i) => value !== this.playlistRowsSource[i])) {
      this.playlistRowsSource = source;
      this.playlistRowsCache = [
        ...history.map((media, index) => ({ type: 'history' as const, media, index })),
        { type: 'current' as const, media: current, index: 0 },
        ...queue.map((media, index) => ({ type: 'queue' as const, media, index })),
      ];
    }
    return this.playlistRowsCache;
  }

  trackByIndex(index: number): number {
    return index;
  }

  ngDoCheck(): void {
    // follow the current media, unless the user scrolled away from it
    const media = `${this.currentMedia.id}|${this.currentMedia.title}`;
    if (this.currentMedia.id !== -1 && media !== this.followedMedia) {
      const follow = this.followedMedia === null || this.isNearCurrent();
      this.followedMedia = media;
      this.followedRow = this.history.length;
      // scroll after the rows were rendered
      follow && setTimeout(() => this.scrollToCurrent());
    }
  }

  scrollToCurrent(): void {
    this.playlistViewport?.scrollToIndex(Math.max(0, this.history.length - PLAYLIST_ROWS_BEFORE_CURRENT));
  }

  dropPlaylistRow(event: CdkDragDrop<unknown, unknown, PlaylistRow>): void {
    // the drop index refers to the rendered rows
    const currentIndex = (this.playlistViewport?.getRenderedRange().start ?? 0) + event.currentIndex;
    this.moveMedia(this.combinedIndex(event.item.data), currentIndex);
  }

  /** Index of the row in the combined list of history, current media and queue. */
  combinedIndex(row: PlaylistRow): number {
    switch (row.type) {
      case 'history':
        return row.index;
      case 'current':
        return this.history.length;
      case 'queue':
        return this.history.length + 1 + row.index;
    }
  }

  /** Whether the viewport shows the current media or the rows around it. */
  private isNearCurrent(): boolean {
    const viewport = this.playlistViewport;
    if (!viewport) {
      return true;
    }
    const firstVisible = Math.floor(viewport.measureScrollOffset() / PLAYLIST_ROW_HEIGHT);
    const visibleRows = Math.ceil(viewport.getViewportSize() / PLAYLIST_ROW_HEIGHT);
    return this.followedRow >= firstVisible - 1 && this.followedRow <= firstVisible + visibleRows;
  }

  get autoplayBlocked(): boolean {
    return this.autoplayService.blocked.value;
  }

  ngOnDestroy(): void {
    // the session and its playback continue without the lobby, only the video element returns to its hidden host
    this.mediaService.videoElement.removeEventListener('click', this.videoClickListener);
    this.mediaService.detachVideo();
    this.playlistResizeObserver?.disconnect();
    if (!!this.hideCursorTimeout) {
      clearTimeout(this.hideCursorTimeout);
    }
  }

  get isFullscreen(): boolean {
    return document.fullscreenElement != null;
  }

  ngAfterViewInit(): void {
    // the session topic is listened to by the PlayerEngineService, the join is only needed if the session is not joined yet
    this.sessionService.ensureJoined();
    if (this.videoWrapper) {
      this.mediaService.attachVideo(this.videoWrapper.nativeElement);
      this.mediaService.videoElement.addEventListener('click', this.videoClickListener);
    }
    const viewport = this.playlistViewport;
    if (viewport) {
      // the playlist height depends on the space left in the card (e.g. a loaded video), not only on the window size
      this.playlistResizeObserver = new ResizeObserver(() => viewport.checkViewportSize());
      this.playlistResizeObserver.observe(viewport.elementRef.nativeElement);
    }
  }

  fullscreen() {
    if (!this.videoWrapper) {
      console.error('Page not loaded properly!');
      return;
    }
    this.videoWrapper.nativeElement.requestFullscreen();
    document.onmousemove = () => {
      if (!!this.hideCursorTimeout) {
        clearTimeout(this.hideCursorTimeout);
      }
      if (!!this.videoWrapper) {
        this.videoWrapper.nativeElement.style.cursor = 'default';
      }
      this.hideCursorTimeout = setTimeout(() => {
        if (!!this.videoWrapper) {
          this.videoWrapper.nativeElement.style.cursor = 'none';
        }
      }, 1000);
    };
  }

  exitFullscreen() {
    document.onmousemove = () => undefined;
    if (!!this.hideCursorTimeout) {
      clearTimeout(this.hideCursorTimeout);
    }
    if (!!this.videoWrapper) {
      this.videoWrapper.nativeElement.style.cursor = 'default';
    }
    document.exitFullscreen().catch(console.error);
  }

  onVideoClick() {
    if (!!this.singleVideoClickTimeout) {
      // double click
      clearTimeout(this.singleVideoClickTimeout);
      this.singleVideoClickTimeout = null;
      this.isFullscreen ? this.exitFullscreen() : this.fullscreen();
    } else {
      // single click
      this.singleVideoClickTimeout = setTimeout(() => {
        this.togglePlayback();
        this.singleVideoClickTimeout = null;
      }, 250);
    }
  }
}
