import { AfterViewInit, Component, DoCheck, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { PlayerComponent } from '../player.component';
import { ActivatedRoute } from '@angular/router';
import { HttpHelperService } from '../../../services/http-helper.service';
import { AuthenticationService } from '../../../services/authentication.service';
import { MediaService } from '../../../services/media.service';
import { WsService } from '../../../services/ws.service';
import { SessionService } from '../../../services/session.service';
import { SettingsService } from '../../../services/settings.service';
import { pairwise, Subscription } from 'rxjs';
import { AutoplayService } from '../../../services/autoplay.service';
import { UserStatusService } from '../../../services/user-status.service';
import { UserStatus } from '../../../models/userStatus';
import { ClockSyncService } from '../../../services/clock-sync.service';

/** Drift (ms) from which a listener is shown as out of sync, see correctDrift. */
const OUT_OF_SYNC_THRESHOLD = 200;
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
  private readonly mediaSubscriptions = new Subscription();

  constructor(
    route: ActivatedRoute,
    httpHelperService: HttpHelperService,
    authenticationService: AuthenticationService,
    mediaService: MediaService,
    wsService: WsService,
    private sessionService: SessionService,
    public settingsService: SettingsService,
    autoplayService: AutoplayService,
    userStatusService: UserStatusService,
    clockSyncService: ClockSyncService
  ) {
    super();
    this.httpHelperService = httpHelperService;
    this.authenticationService = authenticationService;
    this.mediaService = mediaService;
    this.wsService = wsService;
    this.autoplayService = autoplayService;
    this.userStatusService = userStatusService;
    this.clockSyncService = clockSyncService;

    this.autoplayService.check();
    sessionService.joinSession(Number(route.snapshot.paramMap.get('sessionId')));

    // MediaService is app-wide: these subscriptions have to end with this component (see ngOnDestroy)
    this.mediaSubscriptions.add(
      this.mediaService.mediaEndedSubject.subscribe(() => {
        this.publishCommand(`end/${PlayerComponent.currentMedia.id}`);
      })
    );
    this.mediaSubscriptions.add(this.mediaService.timeUpdate.subscribe(() => this.correctDrift()));
    this.mediaSubscriptions.add(
      this.clockSyncService.serverTimeOffset
        .pipe(pairwise())
        .subscribe(([previous, current]) => this.shiftPlaybackAnchor(current - previous))
    );
    this.mediaSubscriptions.add(
      this.clockSyncService.latency.subscribe((latency) => latency !== null && this.userStatusService.setLatency(latency))
    );
    // buffering counts as loading: in both cases the media can not be played right now
    this.mediaSubscriptions.add(this.mediaService.mediaWaiting.subscribe(() => this.userStatusService.setState('LOADING')));
    this.mediaSubscriptions.add(this.mediaService.mediaPlaying.subscribe(() => this.userStatusService.setState('READY')));
    this.mediaSubscriptions.add(
      this.mediaService.mediaCanPlayThrough.subscribe(() => {
        console.log('READY');
        this.userStatusService.setState('READY');
        const id = this.authenticationService.currentUserValue?.id;
        const time = Math.round(this.mediaService.getCurrentTime() * 1000);
        !!id && this.indicateReadyFor(PlayerComponent.preparedMediaId, time);
      })
    );
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
    this.sessionService.cancelJoin();
    this.userStatusService.setJoined(false);
    this.mediaSubscriptions.unsubscribe();
  }

  get isFullscreen(): boolean {
    return document.fullscreenElement != null;
  }

  @ViewChild('videoPlayer') set videoPlayer(videoPlayer: ElementRef) {
    PlayerComponent.videoElement = videoPlayer.nativeElement;
  }

  ngAfterViewInit(): void {
    this.wsService.subscribeToSessionTopic((body) => this.processCommand(body));
    this.sessionService.requestJoin();
  }

  protected override onJoined(): void {
    this.sessionService.acknowledgeJoin();
    this.userStatusService.setJoined(true);
  }

  getStateIcon(status: UserStatus | undefined): string {
    switch (status?.state) {
      case 'READY':
        return 'check_circle';
      case 'LOADING':
        return 'hourglass_empty';
      default:
        return 'radio_button_unchecked';
    }
  }

  getStateText(status: UserStatus | undefined): string {
    switch (status?.state) {
      case 'READY':
        return 'Ready';
      case 'LOADING':
        return 'Loading / buffering';
      case 'IDLE':
        return 'No media loaded';
      default:
        return 'Status unknown';
    }
  }

  formatLatency(status: UserStatus | undefined): string {
    return `${status?.latency ?? '–'} ms`;
  }

  /** The drift is only known while the user is playing. */
  hasDrift(status: UserStatus | undefined): boolean {
    return status?.drift != null;
  }

  isOutOfSync(status: UserStatus | undefined): boolean {
    return status?.drift != null && Math.abs(status.drift) >= OUT_OF_SYNC_THRESHOLD;
  }

  /** Formats the drift as signed seconds or ms, positive: behind the session. */
  formatDrift(drift: number): string {
    const sign = drift > 0 ? '+' : drift < 0 ? '-' : '±';
    const abs = Math.abs(drift);
    return abs >= 1000 ? `${sign}${(abs / 1000).toFixed(1)} s` : `${sign}${abs} ms`;
  }

  isVideoMode() {
    return this.mediaService.isVideoMode();
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
        this.publishCommand(this.playerState === 'STOP' ? 'start' : this.playerState === 'PAUSE' ? 'resume' : 'pause');
        this.singleVideoClickTimeout = null;
      }, 250);
    }
  }

  timeSkip() {
    this.jumpOffset(this.settingsService.defaultTimeSkipLength * 1000);
  }

  /** Formats seconds as m:ss or h:mm:ss. */
  formatTime(seconds: number): string {
    const total = Math.floor(seconds);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const ss = String(total % 60).padStart(2, '0');
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
  }
}
