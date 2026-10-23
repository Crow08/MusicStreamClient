import { Injectable } from '@angular/core';
import { distinctUntilChanged, pairwise } from 'rxjs';
import { AuthenticationService } from './authentication.service';
import { Media } from '../models/media';
import { MediaService } from './media.service';
import { HttpHelperService } from './http-helper.service';
import { User } from '../models/user';
import { GenericDataObject } from '../models/genericDataObject';
import { WsService } from './ws.service';
import { MinimalMedia } from '../models/minimalMedia';
import { Song } from '../models/song';
import { Video } from '../models/video';
import { AutoplayService } from './autoplay.service';
import { Chapter } from '../models/chapter';
import { UserStatusService } from './user-status.service';
import { UserStatus } from '../models/userStatus';
import { ClockSyncService } from './clock-sync.service';
import { SessionService } from './session.service';
import { SpotifyPlayerService } from './spotify-player.service';
import { PlayerState } from '../models/playerState';

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
/** Drift (ms) from which a player that can not change its speed (Spotify) seeks: a seek is audible. */
const NO_RATE_SEEK_DRIFT = 500;

const NO_MEDIA = () => new Media(-1, 'SONG', '', '', []);

/**
 * The playback of the session this client is in. It lives as long as the app, not as long as a page: the playback
 * continues when the user switches between the lobby and the other pages. The components (full player, mini player) only
 * display its state and send commands.
 */
@Injectable({
  providedIn: 'root',
})
export class PlayerEngineService {
  playerState: PlayerState = PlayerState.STOP;
  loopMode = false;
  queue: { id: number; title: string }[] = [];
  history: { id: number; title: string }[] = [];
  sessionUsers: User[] = [];
  /** Playback status of the session users reported by their clients, by user id. */
  userStatuses = new Map<number, UserStatus>();
  currentMedia: Media = NO_MEDIA();
  songRating = 0;
  userSongRating = 0;
  /** Id of the media currently loaded into the media element. currentMedia is updated asynchronously. */
  preparedMediaId = -1;
  lastReadyEvent: { mediaId: number; time: number } | null = null;
  /** Pre-signed URL of the thumbnail sprite of the current video (seek bar preview), null if there is none. */
  thumbnailUrl: string | null = null;
  /** Chapters of the current video (seek bar markers), empty if there are none. */
  chapters: Chapter[] = [];
  /** Why the current media can not be played by this client (e.g. no Spotify Premium), empty while it can. */
  playbackHint = '';
  selectedArtist: GenericDataObject[] = [];
  selectedAlbum: GenericDataObject[] = [];
  selectedGenres: GenericDataObject[] = [];
  selectedTags: GenericDataObject[] = [];

  /** Client time at which the current playback started at the given media position, used to correct drift. */
  private playbackAnchor: { mediaId: number; startTime: number; mediaTime: number } | null = null;
  private lastSeekCorrection = 0;
  private mediaInfoRequest = 0;
  /** Media whose thumbnails and chapters were requested. */
  private seekBarMediaId = -1;
  private inSession = false;

  constructor(
    private httpHelperService: HttpHelperService,
    private authenticationService: AuthenticationService,
    private mediaService: MediaService,
    private wsService: WsService,
    private sessionService: SessionService,
    private autoplayService: AutoplayService,
    private userStatusService: UserStatusService,
    private clockSyncService: ClockSyncService,
    private spotifyPlayer: SpotifyPlayerService
  ) {
    this.mediaService.mediaEndedSubject.subscribe(() => this.publishCommand(`end/${this.currentMedia.id}`));
    this.mediaService.timeUpdate.subscribe(() => this.correctDrift());
    this.clockSyncService.serverTimeOffset
      .pipe(pairwise())
      .subscribe(([previous, current]) => this.shiftPlaybackAnchor(current - previous));
    this.clockSyncService.latency.subscribe((latency) => latency !== null && this.userStatusService.setLatency(latency));
    // buffering counts as loading: in both cases the media can not be played right now
    this.mediaService.mediaWaiting.subscribe(() => this.userStatusService.setState('LOADING'));
    this.mediaService.mediaPlaying.subscribe(() => this.userStatusService.setState('READY'));
    this.mediaService.mediaCanPlayThrough.subscribe(() => {
      console.log('READY');
      this.userStatusService.setState('READY');
      const id = this.authenticationService.currentUserValue?.id;
      const time = Math.round(this.mediaService.getCurrentTime() * 1000);
      !!id && this.indicateReadyFor(this.preparedMediaId, time);
    });

    // browsers only play the Spotify player after an interaction: then it is activated and the session joined again
    this.spotifyPlayer.autoplayFailed.subscribe(() =>
      this.autoplayService.reportBlocked(() => {
        this.spotifyPlayer.activateElement();
        const id = this.authenticationService.currentUserValue?.id;
        !!id && this.wsService.publishSessionCommand(`join/${id}`, 'join');
      })
    );

    // the session topic is listened to as long as the client is in a session, not only while the lobby is open
    this.sessionService.sessionId.pipe(distinctUntilChanged()).subscribe((id) => {
      if (this.inSession) {
        this.resetSession();
      }
      this.inSession = id !== null;
      if (id !== null) {
        this.wsService.subscribeToSessionTopic((body) => this.processCommand(body));
      }
    });
  }

  publishCommand(name: string): void {
    this.wsService.publishSessionCommand(name, name);
  }

  /** Forgets the state of the session that was left and stops the playback. */
  private resetSession(): void {
    this.wsService.unsubscribeFromSessionTopic();
    this.userStatusService.setJoined(false);
    this.clearPlaybackAnchor();
    this.mediaService.stop();
    this.playerState = PlayerState.STOP;
    this.loopMode = false;
    this.queue = [];
    this.history = [];
    this.sessionUsers = [];
    this.userStatuses = new Map();
    this.currentMedia = NO_MEDIA();
    this.songRating = 0;
    this.userSongRating = 0;
    this.preparedMediaId = -1;
    this.lastReadyEvent = null;
    this.thumbnailUrl = null;
    this.chapters = [];
    this.playbackHint = '';
    this.seekBarMediaId = -1;
  }

  loadNewMedia(media: MinimalMedia, startMediaTime: number): void {
    if (!media || media.id === -1) {
      this.playerState = PlayerState.STOP;
      this.userStatusService.setState('IDLE');
      return;
    }
    this.userStatusService.setState('LOADING');
    const isVideo = media.type.toUpperCase() == 'VIDEO';
    this.preparedMediaId = media.id;
    this.playbackHint = '';

    this.loadSeekBarInfo(media, isVideo);
    if (isVideo) {
      this.loadFile(media, true, startMediaTime);
      this.loadMediaInfo(media);
      return;
    }
    // a song may be a Spotify track, which is not played from a file: its details tell
    this.fetchMediaInfo(media)
      .then((details) => {
        // the media may have changed while the details were loaded
        if (this.preparedMediaId !== media.id) {
          return;
        }
        return details instanceof Song && details.spotify
          ? this.loadSpotifyTrack(media, details, startMediaTime)
          : this.loadFile(media, false, startMediaTime);
      })
      .catch(console.error);
  }

  private loadFile(media: MinimalMedia, isVideo: boolean, startMediaTime: number): Promise<void> {
    return this.httpHelperService
      .getPlain(`/api/v1/media/data/${media.id}?X-NPE-PSU-Duration=PT1H`)
      .then((url) => {
        isVideo ? this.mediaService.activateVideoMode() : this.mediaService.activateAudioMode();
        this.prepareMediaStart(url, startMediaTime);
      })
      .catch(console.error);
  }

  /** Loads a Spotify track into the player of this client, or tells the session that this client can not play it. */
  private async loadSpotifyTrack(media: MinimalMedia, song: Song, startMediaTime: number): Promise<void> {
    // from now on the commands of the session go to the Spotify player (and fail without it)
    this.mediaService.activateSpotifyMode();
    if (!(await this.spotifyPlayer.connect())) {
      return this.spotifyUnavailable(media, startMediaTime, this.spotifyPlayer.error.value);
    }
    if (this.autoplayService.blocked.value) {
      this.autoplayService.reportBlocked(() => this.spotifyPlayer.activateElement());
    }
    if (this.preparedMediaId !== media.id) {
      return;
    }
    if (!(await this.mediaService.loadSpotify(song.uri, startMediaTime / 1000))) {
      return this.spotifyUnavailable(media, startMediaTime, 'The Spotify track could not be loaded');
    }
  }

  /** The others must not wait for a client that can not play the media: it reports ready right away. */
  private spotifyUnavailable(media: MinimalMedia, startMediaTime: number, reason: string): void {
    console.error(`Spotify is not available: ${reason}`);
    this.playbackHint = `${reason || 'Spotify is not available'}, ${media.title} can not be played here.`;
    this.userStatusService.setState('UNAVAILABLE');
    this.indicateReadyFor(media.id, startMediaTime);
  }

  /**
   * Loads the URL of the thumbnail sprite shown when hovering over the seek bar of a video and the chapters of the
   * video (read by the server from the MP4, browsers do not expose them).
   */
  private loadSeekBarInfo(media: MinimalMedia, isVideo: boolean): void {
    if (media.id === this.seekBarMediaId) {
      return;
    }
    this.seekBarMediaId = media.id;
    this.thumbnailUrl = null;
    this.chapters = [];
    if (!isVideo) {
      return;
    }
    this.httpHelperService
      .getPlain(`/api/v1/media/thumbnails/${media.id}?X-NPE-PSU-Duration=PT1H`)
      .then((url) => {
        // the media may have changed while the request was running
        // the plain text response ends with a line break, which is not allowed in a CSS url()
        if (this.seekBarMediaId === media.id) {
          this.thumbnailUrl = url.trim();
        }
      })
      // thumbnails are optional: without them the seek bar shows no preview
      .catch(() => undefined);
    this.httpHelperService
      .getArray(`/api/v1/media/video/${media.id}/chapters`, Chapter)
      .then((chapters) => {
        if (this.seekBarMediaId === media.id) {
          this.chapters = chapters;
        }
      })
      // chapters are optional as well
      .catch(() => undefined);
  }

  /** Loads the details (title, artist, ...) and ratings of the media, without loading the media itself. */
  loadMediaInfo(media: MinimalMedia): void {
    this.fetchMediaInfo(media).catch(console.error);
  }

  /** Like loadMediaInfo, resolves to the details (also when a newer request has replaced them in the state). */
  private fetchMediaInfo(media: MinimalMedia): Promise<Media> {
    // responses may arrive out of order when the media changes quickly: only the latest request is applied
    const request = ++this.mediaInfoRequest;
    const request$: Promise<Media> =
      media.type.toUpperCase() == 'VIDEO'
        ? this.httpHelperService.get(`/api/v1/media/video/${media.id}`, Video)
        : this.httpHelperService.get(`/api/v1/media/song/${media.id}`, Song);
    return request$.then((details) => {
      if (request === this.mediaInfoRequest) {
        this.setNewMedia(details);
      }
      return details;
    });
  }

  onRating(rating: number): void {
    const mediaId = this.currentMedia.id;
    if (mediaId === -1) {
      return;
    }
    this.userSongRating = rating;
    this.httpHelperService
      .put(`/api/v1/ratings/${mediaId}/addUserRating/${rating}`, null)
      .then(() => {
        this.getRating();
        this.getUserRating();
      })
      .catch(console.error);
  }

  getRating(): void {
    const mediaId = this.currentMedia.id;
    if (mediaId === -1) {
      this.songRating = 0;
      return;
    }
    this.httpHelperService
      .getPlain(`/api/v1/ratings/getSongRating/${mediaId}`)
      .then((rating) => {
        // the response may arrive after the media changed
        if (this.currentMedia.id === mediaId) {
          this.songRating = Number(rating);
        }
      })
      .catch(console.error);
  }

  getUserRating(): void {
    const mediaId = this.currentMedia.id;
    if (mediaId === -1) {
      this.userSongRating = 0;
      return;
    }
    this.httpHelperService
      .getPlain(`/api/v1/ratings/getUserRating/${mediaId}`)
      .then((rating) => {
        // the response may arrive after the media changed
        if (this.currentMedia.id === mediaId) {
          this.userSongRating = Number(rating);
        }
      })
      .catch(console.error);
  }

  private processCommand(jsonString: string): void {
    const commandObject = JSON.parse(jsonString);
    switch (commandObject.type) {
      case 'Start':
      case 'Resume':
        this.schedulePlay(commandObject.startServerTime + this.clockSyncService.serverTimeOffset.value);
        break;
      case 'SetMedia':
        // every SetMedia starts a new sync round on the server, even for the same media at the same position
        this.lastReadyEvent = null;
        this.clearPlaybackAnchor();
        this.mediaService.stop();
        this.loadNewMedia(commandObject.currentMedia, 0);
        this.reportReadyIfUnableToLoad(commandObject.currentMedia.id, 0);
        // the details of the media are loaded asynchronously, the title is shown right away
        this.currentMedia.title = commandObject.currentMedia.title;
        // the server sends the queue and history along: they can not be derived from the media id, which may occur
        // several times in both
        this.queue = commandObject.queue;
        this.history = commandObject.history;
        break;
      case 'Pause':
        this.clearPlaybackAnchor();
        this.mediaService.pauseAtPosition(commandObject.mediaStopTime);
        this.playerState = PlayerState.PAUSE;
        break;
      case 'Stop':
        this.clearPlaybackAnchor();
        this.mediaService.stop();
        this.userStatusService.setState('IDLE');
        this.playerState = PlayerState.STOP;
        // at the end of the queue the server sends the new queue and history: there is no current media any more
        if (commandObject.history) {
          this.queue = commandObject.queue;
          this.history = commandObject.history;
          this.currentMedia = NO_MEDIA();
        }
        break;
      case 'Leave':
        const userIndex = this.sessionUsers.findIndex((value) => value.id === commandObject.userId);
        if (userIndex != -1) {
          this.sessionUsers.splice(userIndex, 1);
        }
        this.userStatuses.delete(commandObject.userId);
        break;
      case 'Jump':
        this.lastReadyEvent = null;
        this.clearPlaybackAnchor();
        this.userStatusService.setState('LOADING');
        this.prepareMediaStart(null, commandObject.startMediaTime);
        this.reportReadyIfUnableToLoad(this.preparedMediaId, commandObject.startMediaTime);
        break;
      case 'Join':
        this.sessionUsers = commandObject.sessionUsers;
        this.userStatuses = new Map((commandObject.userStatuses as UserStatus[]).map((status) => [status.userId, status]));
        if (commandObject.userId === this.authenticationService.currentUserValue?.id) {
          this.sessionService.acknowledgeJoin();
          this.userStatusService.setJoined(true);
          // set join event as last ready object to not trigger a new sync on join.
          this.queue = commandObject.queue;
          this.history = commandObject.history;
          this.loopMode = commandObject.loopMode;
          switch (commandObject.sessionState) {
            case 'PLAY':
              this.lastReadyEvent = {
                mediaId: commandObject.currentMedia?.id ?? -1,
                time: commandObject.startMediaTime,
              };
              this.loadNewMedia(commandObject.currentMedia, commandObject.startMediaTime);
              this.playerState = PlayerState.PLAY;
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
                this.currentMedia = new Media(media.id, mediaType, media.title, '', []);
                // the media is not loaded while stopped, but its details and ratings are shown
                this.loadMediaInfo(media);
              } else {
                // nothing has been played in this session yet
                this.currentMedia = NO_MEDIA();
              }
              this.playerState = PlayerState.STOP;
              break;
            case 'PAUSE':
              this.loadNewMedia(commandObject.currentMedia, commandObject.startMediaTime);
              this.playerState = PlayerState.PAUSE;
              break;
            case 'SYNC_PLAY':
            case 'SYNC_PAUSE':
            case 'SYNC_STOP':
              // a sync round is running: load the media and report ready so the round can include this user
              this.lastReadyEvent = null;
              this.loadNewMedia(commandObject.currentMedia, commandObject.startMediaTime);
              if (commandObject.currentMedia) {
                this.reportReadyIfUnableToLoad(commandObject.currentMedia.id, commandObject.startMediaTime);
              }
              this.playerState =
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
            this.loopMode = commandObject.loopMode;
            break;
          case 'Queue':
            this.queue = commandObject.queue;
            break;
          case 'History':
            this.history = commandObject.history;
            break;
          case 'QueueAndHistory':
            this.queue = commandObject.queue;
            this.history = commandObject.history;
            break;
          case 'UserStatus':
            this.userStatuses.set(commandObject.userStatus.userId, commandObject.userStatus);
            break;
        }
        break;
    }
  }

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

  private indicateReadyFor(mediaId: number, time: number): boolean {
    if (this.lastReadyEvent?.time == time && this.lastReadyEvent?.mediaId == mediaId) {
      return false;
    } else {
      this.lastReadyEvent = { mediaId, time };
      const id = this.authenticationService.currentUserValue?.id;
      this.publishCommand(`ready/${id}/${mediaId}/${time}`);
      return true;
    }
  }

  private prepareMediaStart(url: string | null, startMediaTime: number): void {
    if (!!url) {
      this.mediaService.setSrc(url);
    }
    this.mediaService.prepareAt(startMediaTime / 1000);
  }

  /**
   * Continuously compares the playback position with the position expected from the scheduled start and corrects the
   * drift, e.g. after buffering: small drifts by slightly changing the playback rate, large ones by seeking.
   */
  private correctDrift(): void {
    const anchor = this.playbackAnchor;
    const now = new Date().getTime();
    if (
      !anchor ||
      anchor.mediaId !== this.preparedMediaId ||
      this.playerState !== PlayerState.PLAY ||
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
    // without a changeable speed (Spotify) only a large drift is corrected, by an audible seek
    const rateCorrectable = this.mediaService.supportsPlaybackRate;
    if (Math.abs(drift) > (rateCorrectable ? MAX_RATE_CORRECTED_DRIFT : NO_RATE_SEEK_DRIFT)) {
      if (now - this.lastSeekCorrection > SEEK_CORRECTION_COOLDOWN) {
        this.lastSeekCorrection = now;
        console.log(`Drift of ${Math.round(drift)}ms: seeking`);
        this.mediaService.setPlaybackRate(1);
        this.mediaService.setCurrentTime(expected / 1000);
      }
    } else if (rateCorrectable && Math.abs(drift) > DRIFT_TOLERANCE) {
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
  private shiftPlaybackAnchor(offsetChange: number): void {
    if (this.playbackAnchor) {
      this.playbackAnchor.startTime += offsetChange;
    }
  }

  private clearPlaybackAnchor(): void {
    this.playbackAnchor = null;
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
    this.playerState = PlayerState.WAITING;
    this.playbackAnchor = { mediaId: this.preparedMediaId, startTime, mediaTime };
    console.log('schedulePlay: waiting for: ' + (startTime - new Date().getTime()) + 'ms');
    console.log('media start time: ' + mediaTime);
    // the Spotify player starts audibly later than the call: the call is made ahead, the position is corrected if it is late
    const latency = this.mediaService.startLatency;
    setTimeout(() => {
      // the start command may arrive late, or the timeout fires late: start where the others already are
      const lateness = new Date().getTime() - (startTime - this.mediaService.startLatency);
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
      this.playerState = PlayerState.PLAY;
    }, startTime - latency - new Date().getTime());
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

  private setNewMedia(media: Media): void {
    this.currentMedia = media;
    // do not show the ratings of the previous media until the new ones are loaded
    this.songRating = 0;
    this.userSongRating = 0;
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
