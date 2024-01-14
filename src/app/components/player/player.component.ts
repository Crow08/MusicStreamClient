import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { LatencyComponent } from '../latency/latency.component';
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

export enum PlayerState {
  WAITING = 'WAITING',
  PLAY = 'PLAY',
  PAUSE = 'PAUSE',
  STOP = 'STOP',
}

export abstract class PlayerComponent {
  static playerState: PlayerState = PlayerState.STOP;
  static loopMode = false;
  static queue: { id: number; title: string }[] = [];
  static history: { id: number; title: string }[] = [];
  static sessionUsers: User[] = [];
  static currentMedia: Media = new Media(-1, 'SONG', '', '', []);
  static songRating = 0;
  static userSongRating = 0;
  static videoElement: HTMLVideoElement;
  private static _lastReadyEvent: { mediaId: number; time: number } | null;
  selectedArtist: GenericDataObject[] = [];
  selectedAlbum: GenericDataObject[] = [];
  selectedGenres: GenericDataObject[] = [];
  selectedTags: GenericDataObject[] = [];
  protected httpHelperService!: HttpHelperService;
  protected authenticationService!: AuthenticationService;
  protected mediaService!: MediaService;
  protected wsService!: WsService;

  get sessionUsers() {
    return PlayerComponent.sessionUsers;
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

  static get lastReadyEvent(): { mediaId: number; time: number } | null {
    return this._lastReadyEvent;
  }

  static set lastReadyEvent(value: { mediaId: number; time: number } | null) {
    this._lastReadyEvent = value;
  }

  abstract getLatencyComponent(): LatencyComponent | undefined;

  publishCommand(name: string): void {
    this.wsService.publishSessionCommand(name, name);
  }

  loadNewMedia(media: MinimalMedia, startMediaTime: number): void {
    if (!media || media.id === -1) {
      PlayerComponent.playerState = PlayerState.STOP;
      return;
    }
    const isVideo = media.type.toUpperCase() == 'VIDEO';

    this.httpHelperService
      .getPlain(`/api/v1/media/data/${media.id}?X-NPE-PSU-Duration=PT1H`)
      .then((url) => {
        media.type.toUpperCase() == 'VIDEO'
          ? this.mediaService.activateVideoMode(PlayerComponent.videoElement)
          : this.mediaService.activateAudioMode();
        this.prepareMediaStart(url, startMediaTime);
      })
      .catch(console.error);

    if (isVideo) {
      this.httpHelperService
        .get(`/api/v1/media/video/${media.id}`, Video)
        .then((video) => {
          this.setNewMedia(video);
        })
        .catch(console.error);
    } else {
      this.httpHelperService
        .get(`/api/v1/media/song/${media.id}`, Song)
        .then((song) => {
          this.setNewMedia(song);
        })
        .catch(console.error);
    }
  }

  setVolume(value: number): void {
    this.mediaService.setVolume(value);
  }

  onRating(rating: number): void {
    this.httpHelperService
      .put(`api/v1/ratings/${PlayerComponent.currentMedia.id}/addUserRating/${rating}`, null)
      .then(() => {
        this.getRating();
      })
      .catch(console.error);
  }

  getRating(): void {
    this.httpHelperService
      .getPlain(`/api/v1/ratings/getSongRating/${PlayerComponent.currentMedia.id}`)
      .then((rating) => {
        PlayerComponent.songRating = Number(rating);
      })
      .catch(console.error);
  }

  getUserRating(): void {
    this.httpHelperService
      .getPlain(`/api/v1/ratings/getUserRating/${PlayerComponent.currentMedia.id}`)
      .then((rating) => {
        PlayerComponent.userSongRating = Number(rating);
      })
      .catch(console.error);
  }

  getDisplayHistoryStartIndex(): number {
    return Math.max(0, PlayerComponent.history.length - Math.max(5, 10 - PlayerComponent.queue.length));
  }

  getDisplayQueueLength(): number {
    return Math.max(5, 10 - PlayerComponent.history.length);
  }

  removeSongFromQueueOrHistory(queueIndex: number, type: string): void {
    this.publishCommand(`deleteMediaFromQueue/${queueIndex}/${type}`);
  }

  drop(event: CdkDragDrop<string[]>): void {
    this.publishCommand(
      `movedMedia/${this.getDisplayHistoryStartIndex() + event.previousIndex}/to/${
        this.getDisplayHistoryStartIndex() + event.currentIndex
      }`
    );
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
        const timeOffset = this.getLatencyComponent()?.serverTimeOffset ?? 0;
        this.schedulePlay(commandObject.startServerTime + timeOffset);
        break;
      case 'SetMedia':
        this.mediaService.stop();
        this.loadNewMedia(commandObject.currentMedia, 0);
        this.updateQueueAndHistory(commandObject.currentMedia.id);
        break;
      case 'Pause':
        this.mediaService.pauseAtPosition(commandObject.mediaStopTime);
        PlayerComponent.playerState = PlayerState.PAUSE;
        break;
      case 'Stop':
        this.mediaService.stop();
        PlayerComponent.playerState = PlayerState.STOP;
        break;
      case 'Leave':
        const userIndex = PlayerComponent.sessionUsers.findIndex((value) => value.id === commandObject.userId);
        if (userIndex != -1) {
          PlayerComponent.sessionUsers.splice(userIndex, 1);
        }
        break;
      case 'Jump':
        this.prepareMediaStart(null, commandObject.startMediaTime);
        break;
      case 'Join':
        PlayerComponent.sessionUsers = commandObject.sessionUsers;
        if (commandObject.userId === this.authenticationService.currentUserValue?.id) {
          // set join event as last ready object to not trigger a new sync on join.
          PlayerComponent.queue = commandObject.queue;
          PlayerComponent.history = commandObject.history;
          PlayerComponent.loopMode = commandObject.loopMode;
          switch (commandObject.sessionState) {
            case 'PLAY':
              PlayerComponent.lastReadyEvent = { mediaId: commandObject.currentMedia.id, time: commandObject.startMediaTime };
              this.loadNewMedia(commandObject.currentMedia, commandObject.startMediaTime);
              PlayerComponent.playerState = PlayerState.PLAY;
              const timeOffset = this.getLatencyComponent()?.serverTimeOffset ?? 0;
              this.schedulePlay(commandObject.startServerTime + timeOffset);
              break;
            case 'STOP':
              this.mediaService.stop();
              const media = commandObject.currentMedia;
              const mediaType = media.type.toUpperCase() as 'VIDEO' | 'SONG';
              PlayerComponent.currentMedia = new Media(media.id, mediaType, media.title, '', []);
              PlayerComponent.playerState = PlayerState.STOP;
              break;
            case 'PAUSE':
              this.loadNewMedia(commandObject.currentMedia, commandObject.startMediaTime);
              PlayerComponent.playerState = PlayerState.PAUSE;
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
        }
        break;
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

  private schedulePlay(startTime: number): void {
    PlayerComponent.playerState = PlayerState.WAITING;
    console.log('schedulePlay: waiting for: ' + (startTime - new Date().getTime()) + 'ms');
    console.log('media start time: ' + this.mediaService.getCurrentTime());
    setTimeout(() => {
      this.mediaService.play().catch((reason) => console.error(reason));
      PlayerComponent.playerState = PlayerState.PLAY;
    }, startTime - new Date().getTime());
  }

  /**
   * Move the given song in the playing position and update the history and/or the queue accordingly.
   * @param songId the song to be played
   */
  private updateQueueAndHistory(songId: number): void {
    const queueIndex = PlayerComponent.queue.findIndex((value) => value.id === songId);
    if (queueIndex !== -1) {
      // forward
      if (PlayerComponent.currentMedia) {
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
        if (PlayerComponent.currentMedia) {
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
