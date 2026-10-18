import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { AuthenticationService } from '../../services/authentication.service';
import { Media } from '../../models/media';
import { MediaService } from '../../services/media.service';
import { HttpHelperService } from '../../services/http-helper.service';
import { User } from '../../models/user';
import { GenericDataObject } from '../../models/genericDataObject';
import { WsService } from '../../services/ws.service';
import { MinimalMedia } from '../../models/minimalMedia';
import { Song } from '../../models/song';
import { Video } from '../../models/video';
import { AutoplayService } from '../../services/autoplay.service';
import { Chapter } from '../../models/chapter';
import { UserStatusService } from '../../services/user-status.service';
import { UserStatus } from '../../models/userStatus';
import { ClockSyncService } from '../../services/clock-sync.service';

export enum PlayerState {
  WAITING = 'WAITING',
  PLAY = 'PLAY',
  PAUSE = 'PAUSE',
  STOP = 'STOP',
}

/** A start later than this (ms) is compensated by starting further into the media. */
const LATE_START_TOLERANCE = 30;
/** Drift (ms) between the actual and the expected position that is tolerated during playback. */
const DRIFT_TOLERANCE = 40;
/** Drift (ms) up to which the playback rate is adjusted; a larger drift is corrected by seeking. */
const MAX_RATE_CORRECTED_DRIFT = 1000;
/** Maximum deviation of the playback rate from 1 when correcting a drift. */
const MAX_RATE_CORRECTION = 0.05;
/** Minimum time (ms) between two corrections by seeking, which need time to buffer. */
const SEEK_CORRECTION_COOLDOWN = 3000;
/**
 * Tolerance (s) when determining the current chapter: after jumping to a chapter, the position may end up slightly
 * before its start, which must not count as the previous chapter.
 */
const CHAPTER_START_TOLERANCE = 0.5;
/** Position (s) in a chapter after which "previous chapter" restarts the current chapter instead. */
const CHAPTER_RESTART_THRESHOLD = 3;

export abstract class PlayerComponent {
  static playerState: PlayerState = PlayerState.STOP;
  static loopMode = false;
  static queue: { id: number; title: string }[] = [];
  static history: { id: number; title: string }[] = [];
  static sessionUsers: User[] = [];
  /** Playback status of the session users reported by their clients, by user id. */
  static userStatuses = new Map<number, UserStatus>();
  static currentMedia: Media = new Media(-1, 'SONG', '', '', []);
  static songRating = 0;
  static userSongRating = 0;
  static videoElement: HTMLVideoElement;
  /** Id of the media currently loaded into the media element. currentMedia is updated asynchronously. */
  static preparedMediaId = -1;
  private static _lastReadyEvent: { mediaId: number; time: number } | null;
  /** Client time at which the current playback started at the given media position, used to correct drift. */
  private static playbackAnchor: { mediaId: number; startTime: number; mediaTime: number } | null = null;
  private static lastSeekCorrection = 0;
  private static mediaInfoRequest = 0;
  /** Pre-signed URL of the thumbnail sprite of the current video (seek bar preview), null if there is none. */
  private static thumbnailUrl: string | null = null;
  /** Chapters of the current video (seek bar markers), empty if there are none. */
  private static chapters: Chapter[] = [];
  /** Media whose thumbnails and chapters were requested. */
  private static seekBarMediaId = -1;
  selectedArtist: GenericDataObject[] = [];
  selectedAlbum: GenericDataObject[] = [];
  selectedGenres: GenericDataObject[] = [];
  selectedTags: GenericDataObject[] = [];
  protected httpHelperService!: HttpHelperService;
  protected authenticationService!: AuthenticationService;
  protected mediaService!: MediaService;
  protected wsService!: WsService;
  protected autoplayService!: AutoplayService;
  protected userStatusService!: UserStatusService;
  protected clockSyncService!: ClockSyncService;

  get sessionUsers() {
    return PlayerComponent.sessionUsers;
  }

  getUserStatus(userId: number): UserStatus | undefined {
    return PlayerComponent.userStatuses.get(userId);
  }

  get currentMedia() {
    return PlayerComponent.currentMedia;
  }

  get userSongRating() {
    return PlayerComponent.userSongRating;
  }

  get songRating() {
    return PlayerComponent.songRating;
  }

  get playerState() {
    return PlayerComponent.playerState;
  }

  get loopMode() {
    return PlayerComponent.loopMode;
  }

  get history() {
    return PlayerComponent.history;
  }

  get queue() {
    return PlayerComponent.queue;
  }

  get thumbnailUrl() {
    return PlayerComponent.thumbnailUrl;
  }

  get chapters() {
    return PlayerComponent.chapters;
  }

  static get lastReadyEvent(): { mediaId: number; time: number } | null {
    return this._lastReadyEvent;
  }

  static set lastReadyEvent(value: { mediaId: number; time: number } | null) {
    this._lastReadyEvent = value;
  }

  publishCommand(name: string): void {
    this.wsService.publishSessionCommand(name, name);
  }

  loadNewMedia(media: MinimalMedia, startMediaTime: number): void {
    if (!media || media.id === -1) {
      PlayerComponent.playerState = PlayerState.STOP;
      this.userStatusService.setState('IDLE');
      return;
    }
    this.userStatusService.setState('LOADING');
    const isVideo = media.type.toUpperCase() == 'VIDEO';
    PlayerComponent.preparedMediaId = media.id;

    this.httpHelperService
      .getPlain(`/api/v1/media/data/${media.id}?X-NPE-PSU-Duration=PT1H`)
      .then((url) => {
        isVideo ? this.mediaService.activateVideoMode(PlayerComponent.videoElement) : this.mediaService.activateAudioMode();
        this.prepareMediaStart(url, startMediaTime);
      })
      .catch(console.error);

    this.loadSeekBarInfo(media, isVideo);
    this.loadMediaInfo(media);
  }

  /**
   * Loads the URL of the thumbnail sprite shown when hovering over the seek bar of a video and the chapters of the
   * video (read by the server from the MP4, browsers do not expose them).
   */
  private loadSeekBarInfo(media: MinimalMedia, isVideo: boolean): void {
    if (media.id === PlayerComponent.seekBarMediaId) {
      return;
    }
    PlayerComponent.seekBarMediaId = media.id;
    PlayerComponent.thumbnailUrl = null;
    PlayerComponent.chapters = [];
    if (!isVideo) {
      return;
    }
    this.httpHelperService
      .getPlain(`/api/v1/media/thumbnails/${media.id}?X-NPE-PSU-Duration=PT1H`)
      .then((url) => {
        // the media may have changed while the request was running
        // the plain text response ends with a line break, which is not allowed in a CSS url()
        if (PlayerComponent.seekBarMediaId === media.id) {
          PlayerComponent.thumbnailUrl = url.trim();
        }
      })
      // thumbnails are optional: without them the seek bar shows no preview
      .catch(() => undefined);
    this.httpHelperService
      .getArray(`/api/v1/media/video/${media.id}/chapters`, Chapter)
      .then((chapters) => {
        if (PlayerComponent.seekBarMediaId === media.id) {
          PlayerComponent.chapters = chapters;
        }
      })
      // chapters are optional as well
      .catch(() => undefined);
  }

  /** Loads the details (title, artist, ...) and ratings of the media, without loading the media itself. */
  loadMediaInfo(media: MinimalMedia): void {
    // responses may arrive out of order when the media changes quickly: only the latest request is applied
    const request = ++PlayerComponent.mediaInfoRequest;
    const request$: Promise<Media> =
      media.type.toUpperCase() == 'VIDEO'
        ? this.httpHelperService.get(`/api/v1/media/video/${media.id}`, Video)
        : this.httpHelperService.get(`/api/v1/media/song/${media.id}`, Song);
    request$
      .then((details) => {
        if (request === PlayerComponent.mediaInfoRequest) {
          this.setNewMedia(details);
        }
      })
      .catch(console.error);
  }

  setVolume(value: number): void {
    this.mediaService.setVolume(value);
  }

  onRating(rating: number): void {
    const mediaId = PlayerComponent.currentMedia.id;
    if (mediaId === -1) {
      return;
    }
    PlayerComponent.userSongRating = rating;
    this.httpHelperService
      .put(`/api/v1/ratings/${mediaId}/addUserRating/${rating}`, null)
      .then(() => {
        this.getRating();
        this.getUserRating();
      })
      .catch(console.error);
  }

  getRating(): void {
    const mediaId = PlayerComponent.currentMedia.id;
    if (mediaId === -1) {
      PlayerComponent.songRating = 0;
      return;
    }
    this.httpHelperService
      .getPlain(`/api/v1/ratings/getSongRating/${mediaId}`)
      .then((rating) => {
        // the response may arrive after the media changed
        if (PlayerComponent.currentMedia.id === mediaId) {
          PlayerComponent.songRating = Number(rating);
        }
      })
      .catch(console.error);
  }

  getUserRating(): void {
    const mediaId = PlayerComponent.currentMedia.id;
    if (mediaId === -1) {
      PlayerComponent.userSongRating = 0;
      return;
    }
    this.httpHelperService
      .getPlain(`/api/v1/ratings/getUserRating/${mediaId}`)
      .then((rating) => {
        // the response may arrive after the media changed
        if (PlayerComponent.currentMedia.id === mediaId) {
          PlayerComponent.userSongRating = Number(rating);
        }
      })
      .catch(console.error);
  }

  getDisplayHistoryStartIndex(): number {
    return Math.max(0, PlayerComponent.history.length - Math.max(5, 10 - PlayerComponent.queue.length));
  }

  getDisplayQueueLength(): number {
    return Math.max(5, 10 - PlayerComponent.history.length);
  }

  removeSongFromQueueOrHistory(queueIndex: number, type: string, mediaId: number): void {
    // the index may be outdated on the server when others change the queue, so the media id is sent along
    this.publishCommand(`deleteMediaFromQueue/${queueIndex}/${type}/${mediaId}`);
  }

  drop(event: CdkDragDrop<string[]>): void {
    // indices in the combined list of history, current media and queue
    const previousIndex = this.getDisplayHistoryStartIndex() + event.previousIndex;
    const currentIndex = this.getDisplayHistoryStartIndex() + event.currentIndex;
    const history = PlayerComponent.history;
    const media =
      previousIndex < history.length ? history[previousIndex] : PlayerComponent.queue[previousIndex - history.length - 1];
    if (!media || previousIndex === currentIndex) {
      return;
    }
    this.publishCommand(`movedMedia/${previousIndex}/to/${currentIndex}/${media.id}`);
  }

  jumpTo(mediaId: number) {
    this.publishCommand(`skipTo/${mediaId}`);
  }

  getVolume(): number {
    return this.mediaService.getVolume();
  }

  protected processCommand(jsonString: string): void {
    const commandObject = JSON.parse(jsonString);
    switch (commandObject.type) {
      case 'Start':
      case 'Resume':
        this.schedulePlay(commandObject.startServerTime + this.clockSyncService.serverTimeOffset.value);
        break;
      case 'SetMedia':
        // every SetMedia starts a new sync round on the server, even for the same media at the same position
        PlayerComponent.lastReadyEvent = null;
        this.clearPlaybackAnchor();
        this.mediaService.stop();
        this.loadNewMedia(commandObject.currentMedia, 0);
        this.reportReadyIfUnableToLoad(commandObject.currentMedia.id, 0);
        this.updateQueueAndHistory(commandObject.currentMedia.id);
        break;
      case 'Pause':
        this.clearPlaybackAnchor();
        this.mediaService.pauseAtPosition(commandObject.mediaStopTime);
        PlayerComponent.playerState = PlayerState.PAUSE;
        break;
      case 'Stop':
        this.clearPlaybackAnchor();
        this.mediaService.stop();
        this.userStatusService.setState('IDLE');
        PlayerComponent.playerState = PlayerState.STOP;
        break;
      case 'Leave':
        const userIndex = PlayerComponent.sessionUsers.findIndex((value) => value.id === commandObject.userId);
        if (userIndex != -1) {
          PlayerComponent.sessionUsers.splice(userIndex, 1);
        }
        PlayerComponent.userStatuses.delete(commandObject.userId);
        break;
      case 'Jump':
        PlayerComponent.lastReadyEvent = null;
        this.clearPlaybackAnchor();
        this.userStatusService.setState('LOADING');
        this.prepareMediaStart(null, commandObject.startMediaTime);
        this.reportReadyIfUnableToLoad(PlayerComponent.preparedMediaId, commandObject.startMediaTime);
        break;
      case 'Join':
        PlayerComponent.sessionUsers = commandObject.sessionUsers;
        PlayerComponent.userStatuses = new Map(
          (commandObject.userStatuses as UserStatus[]).map((status) => [status.userId, status])
        );
        if (commandObject.userId === this.authenticationService.currentUserValue?.id) {
          this.onJoined();
          // set join event as last ready object to not trigger a new sync on join.
          PlayerComponent.queue = commandObject.queue;
          PlayerComponent.history = commandObject.history;
          PlayerComponent.loopMode = commandObject.loopMode;
          switch (commandObject.sessionState) {
            case 'PLAY':
              PlayerComponent.lastReadyEvent = {
                mediaId: commandObject.currentMedia?.id ?? -1,
                time: commandObject.startMediaTime,
              };
              this.loadNewMedia(commandObject.currentMedia, commandObject.startMediaTime);
              PlayerComponent.playerState = PlayerState.PLAY;
              const startTime = commandObject.startServerTime + this.clockSyncService.serverTimeOffset.value;
              // the media element is still loading here, so pass the position instead of reading it
              this.schedulePlay(startTime, commandObject.startMediaTime);
              break;
            case 'STOP':
              this.mediaService.stop();
              this.userStatusService.setState('IDLE');
              const media = commandObject.currentMedia;
              if (media) {
                const mediaType = media.type.toUpperCase() as 'VIDEO' | 'SONG';
                PlayerComponent.currentMedia = new Media(media.id, mediaType, media.title, '', []);
                // the media is not loaded while stopped, but its details and ratings are shown
                this.loadMediaInfo(media);
              } else {
                // nothing has been played in this session yet
                PlayerComponent.currentMedia = new Media(-1, 'SONG', '', '', []);
              }
              PlayerComponent.playerState = PlayerState.STOP;
              break;
            case 'PAUSE':
              this.loadNewMedia(commandObject.currentMedia, commandObject.startMediaTime);
              PlayerComponent.playerState = PlayerState.PAUSE;
              break;
            case 'SYNC_PLAY':
            case 'SYNC_PAUSE':
            case 'SYNC_STOP':
              // a sync round is running: load the media and report ready so the round can include this user
              PlayerComponent.lastReadyEvent = null;
              this.loadNewMedia(commandObject.currentMedia, commandObject.startMediaTime);
              if (commandObject.currentMedia) {
                this.reportReadyIfUnableToLoad(commandObject.currentMedia.id, commandObject.startMediaTime);
              }
              PlayerComponent.playerState =
                commandObject.sessionState === 'SYNC_PLAY'
                  ? PlayerState.WAITING
                  : commandObject.sessionState === 'SYNC_PAUSE'
                  ? PlayerState.PAUSE
                  : PlayerState.STOP;
              break;
          }
        }
        break;
      case 'Update':
        switch (commandObject.updateType) {
          case 'LoopMode':
            PlayerComponent.loopMode = commandObject.loopMode;
            break;
          case 'Queue':
            PlayerComponent.queue = commandObject.queue;
            break;
          case 'History':
            PlayerComponent.history = commandObject.history;
            break;
          case 'QueueAndHistory':
            PlayerComponent.queue = commandObject.queue;
            PlayerComponent.history = commandObject.history;
            break;
          case 'UserStatus':
            PlayerComponent.userStatuses.set(commandObject.userStatus.userId, commandObject.userStatus);
            break;
        }
        break;
    }
  }

  /** Called when the own join response arrived. */
  protected onJoined(): void {}

  /**
   * Browsers do not load media in hidden tabs before the user interacted with the page. Such a tab would never report
   * ready, so the others would wait for the sync timeout: it reports ready right away instead and catches up (drift
   * correction) once the user returns to the tab and interacts with it.
   */
  private reportReadyIfUnableToLoad(mediaId: number, time: number): void {
    if (document.hidden && this.autoplayService.blocked.value) {
      console.log('Hidden tab without user interaction can not load media: reporting ready');
      this.indicateReadyFor(mediaId, time);
    }
  }

  protected indicateReadyFor(mediaId: number, time: number) {
    if (PlayerComponent.lastReadyEvent?.time == time && PlayerComponent._lastReadyEvent?.mediaId == mediaId) {
      return false;
    } else {
      PlayerComponent.lastReadyEvent = { mediaId, time };
      const id = this.authenticationService.currentUserValue?.id;
      this.publishCommand(`ready/${id}/${mediaId}/${time}`);
      return true;
    }
  }

  protected jumpOffset(offset: number) {
    this.publishCommand(`jump/${offset}`);
  }

  /** Index of the chapter at the current position, -1 without chapters or before the first one. */
  getCurrentChapterIndex(): number {
    const time = this.mediaService.getCurrentTime() + CHAPTER_START_TOLERANCE;
    let index = -1;
    PlayerComponent.chapters.forEach((chapter, i) => {
      if (chapter.start <= time) {
        index = i;
      }
    });
    return index;
  }

  getNextChapter(): Chapter | undefined {
    return PlayerComponent.chapters[this.getCurrentChapterIndex() + 1];
  }

  isLastChapter(): boolean {
    return this.getCurrentChapterIndex() >= PlayerComponent.chapters.length - 1;
  }

  jumpToChapter(chapter: Chapter | undefined): void {
    if (chapter) {
      this.jumpOffset(Math.round((chapter.start - this.mediaService.getCurrentTime()) * 1000));
    }
  }

  nextChapter(): void {
    this.jumpToChapter(this.getNextChapter());
  }

  /** Restarts the current chapter, or goes to the previous one when the current chapter has just started. */
  previousChapter(): void {
    const index = this.getCurrentChapterIndex();
    const current = PlayerComponent.chapters[index];
    if (!current) {
      return;
    }
    const restart = this.mediaService.getCurrentTime() - current.start > CHAPTER_RESTART_THRESHOLD || index === 0;
    this.jumpToChapter(restart ? current : PlayerComponent.chapters[index - 1]);
  }

  protected getSubTitle() {
    return this.currentMedia.type == 'SONG'
      ? (this.currentMedia as Song).artist?.name
      : (this.currentMedia as Video).series?.name;
  }

  private prepareMediaStart(url: string | null, startMediaTime: number): void {
    if (!!url) {
      this.mediaService.setSrc(url);
    }
    this.mediaService.setCurrentTime(startMediaTime / 1000);
    this.mediaService.pause();
  }

  /**
   * Continuously compares the playback position with the position expected from the scheduled start and corrects the
   * drift, e.g. after buffering: small drifts by slightly changing the playback rate, large ones by seeking.
   */
  protected correctDrift(): void {
    const anchor = PlayerComponent.playbackAnchor;
    const now = new Date().getTime();
    if (
      !anchor ||
      anchor.mediaId !== PlayerComponent.preparedMediaId ||
      PlayerComponent.playerState !== PlayerState.PLAY ||
      this.mediaService.isPaused() ||
      now < anchor.startTime
    ) {
      return;
    }
    const expected = anchor.mediaTime + (now - anchor.startTime);
    if (expected >= this.mediaService.getDuration() * 1000) {
      return;
    }
    const drift = expected - this.mediaService.getCurrentTime() * 1000; // positive: behind the session
    this.userStatusService.setDrift(drift);
    if (Math.abs(drift) > MAX_RATE_CORRECTED_DRIFT) {
      if (now - PlayerComponent.lastSeekCorrection > SEEK_CORRECTION_COOLDOWN) {
        PlayerComponent.lastSeekCorrection = now;
        console.log(`Drift of ${Math.round(drift)}ms: seeking`);
        this.mediaService.setPlaybackRate(1);
        this.mediaService.setCurrentTime(expected / 1000);
      }
    } else if (Math.abs(drift) > DRIFT_TOLERANCE) {
      const correction = Math.max(-MAX_RATE_CORRECTION, Math.min(MAX_RATE_CORRECTION, drift / 3000));
      this.mediaService.setPlaybackRate(1 + correction);
    } else {
      this.mediaService.setPlaybackRate(1);
    }
  }

  /**
   * Applies a change of the clock offset to the running playback: the anchor was derived from the server start time
   * with the previous offset. The drift correction then moves the playback to the corrected position.
   */
  protected shiftPlaybackAnchor(offsetChange: number): void {
    if (PlayerComponent.playbackAnchor) {
      PlayerComponent.playbackAnchor.startTime += offsetChange;
    }
  }

  private clearPlaybackAnchor(): void {
    PlayerComponent.playbackAnchor = null;
    this.mediaService.setPlaybackRate(1);
    this.userStatusService.setDrift(null);
  }

  /**
   * Starts the playback at the given client time.
   *
   * @param startTime client time in ms at which the playback starts.
   * @param mediaTime media position in ms at the start time, defaults to the position the media is prepared at.
   */
  private schedulePlay(startTime: number, mediaTime = Math.round(this.mediaService.getCurrentTime() * 1000)): void {
    PlayerComponent.playerState = PlayerState.WAITING;
    PlayerComponent.playbackAnchor = { mediaId: PlayerComponent.preparedMediaId, startTime, mediaTime };
    console.log('schedulePlay: waiting for: ' + (startTime - new Date().getTime()) + 'ms');
    console.log('media start time: ' + mediaTime);
    setTimeout(() => {
      // the start command may arrive late, or the timeout fires late: start where the others already are
      const lateness = new Date().getTime() - startTime;
      if (lateness > LATE_START_TOLERANCE) {
        console.log(`Late start by ${lateness}ms: starting further into the media`);
        this.mediaService.setCurrentTime((mediaTime + lateness) / 1000);
      }
      if (this.autoplayService.blocked.value) {
        this.playMuted();
      } else {
        this.mediaService.play().catch((reason) => {
          if (reason?.name === 'NotAllowedError') {
            this.playMuted();
          } else {
            console.error(reason);
          }
        });
      }
      PlayerComponent.playerState = PlayerState.PLAY;
    }, startTime - new Date().getTime());
  }

  /**
   * Browsers only allow playback with sound after a user interaction. Muted playback is allowed and keeps the client in
   * sync; the sound is enabled with the next interaction.
   */
  private playMuted(): void {
    this.mediaService.setMuted(true);
    this.autoplayService.reportBlocked(() => this.mediaService.setMuted(false));
    this.mediaService.play().catch((reason) => {
      if (reason?.name === 'NotAllowedError') {
        // not even muted playback is allowed: join again after the interaction to catch up with the session
        this.autoplayService.reportBlocked(() => {
          const id = this.authenticationService.currentUserValue?.id;
          !!id && this.wsService.publishSessionCommand(`join/${id}`, 'join');
        });
      } else {
        console.error(reason);
      }
    });
  }

  /**
   * Move the given song in the playing position and update the history and/or the queue accordingly.
   * @param songId the song to be played
   */
  private updateQueueAndHistory(songId: number): void {
    const queueIndex = PlayerComponent.queue.findIndex((value) => value.id === songId);
    if (queueIndex !== -1) {
      // forward
      // id -1 is the placeholder for "no current media", which must not end up in the history or queue
      if (PlayerComponent.currentMedia && PlayerComponent.currentMedia.id !== -1) {
        PlayerComponent.history.push({
          id: PlayerComponent.currentMedia.id,
          title: PlayerComponent.currentMedia.title,
        });
      }
      PlayerComponent.currentMedia.title = PlayerComponent.queue.splice(queueIndex, 1)[0].title;
      if (queueIndex !== 0) {
        // was actually backwards loop
        PlayerComponent.history = PlayerComponent.history.concat(PlayerComponent.queue);
        PlayerComponent.queue = [];
      }
    } else {
      const historyIndex = PlayerComponent.history.findIndex((value) => value.id === songId);
      if (historyIndex !== -1) {
        // backwards
        // id -1 is the placeholder for "no current media", which must not end up in the history or queue
        if (PlayerComponent.currentMedia && PlayerComponent.currentMedia.id !== -1) {
          PlayerComponent.queue.unshift({
            id: PlayerComponent.currentMedia.id,
            title: PlayerComponent.currentMedia.title,
          });
        }
        PlayerComponent.currentMedia.title = PlayerComponent.history.splice(historyIndex, 1)[0].title;
        if (historyIndex === 0) {
          // was actually forwards loop
          PlayerComponent.queue = PlayerComponent.history.concat(PlayerComponent.queue);
          PlayerComponent.history = [];
        }
      }
    }
  }

  private setNewMedia(media: Media): void {
    PlayerComponent.currentMedia = media;
    // do not show the ratings of the previous media until the new ones are loaded
    PlayerComponent.songRating = 0;
    PlayerComponent.userSongRating = 0;
    if (media.type == 'SONG') {
      this.selectedAlbum = [new GenericDataObject((media as Song).album.id, (media as Song).album.name)];
      this.selectedArtist = [new GenericDataObject((media as Song).artist.id, (media as Song).artist.name)];
      this.selectedGenres = (media as Song).genres.map((value) => new GenericDataObject(value.id, value.name));
    } else {
      // TODO: dont assign video values to song variables
      this.selectedAlbum = [new GenericDataObject((media as Video).season.id, (media as Video).season.name)];
      this.selectedArtist = [new GenericDataObject((media as Video).series.id, (media as Video).series.name)];
    }
    this.selectedTags = media.tags.map((value) => new GenericDataObject(value.id, value.name));

    this.getRating();
    this.getUserRating();
  }
}
