import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { LatencyComponent } from '../latency/latency.component';
import { AuthenticationService } from '../../services/authentication.service';
import { Song } from '../../models/song';
import { AudioService } from '../../services/audio.service';
import { MatSliderChange } from '@angular/material/slider';
import { HttpHelperService } from '../../services/http-helper.service';
import { User } from '../../models/user';
import { GenericDataObject } from '../../models/genericDataObject';
import { WsService } from '../../services/ws.service';

enum PlayerState {
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
  static currentSong: Song;
  static progression = 0;
  static songTimeOffset = 0;
  static songRating = 0;
  static userSongRating = 0;
  selectedArtist: GenericDataObject[] = [];
  selectedAlbum: GenericDataObject[] = [];
  selectedGenres: GenericDataObject[] = [];
  selectedTags: GenericDataObject[] = [];
  protected httpHelperService: HttpHelperService;
  protected authenticationService: AuthenticationService;
  protected audioService: AudioService;
  protected wsService: WsService;

  get sessionUsers() {
    return PlayerComponent.sessionUsers;
  }

  get currentSong() {
    return PlayerComponent.currentSong;
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

  get progression() {
    return PlayerComponent.progression;
  }

  abstract getLatencyComponent(): LatencyComponent;

  publishCommand(name: string): void {
    this.getLatencyComponent().startLatencyMeasurement();
    this.wsService.publishSessionCommand(name, name);
  }

  loadNewSong(
    songId: number,
    startTime: number,
    offset: number,
    directPlay = true,
    updateQueueAndHistory = true
  ): void {
    if (updateQueueAndHistory) {
      this.updateQueueAndHistory(songId);
    }
    if (songId === -1) {
      PlayerComponent.playerState = PlayerState.STOP;
      return;
    }
    const basePath = `/songs/${songId}/data`;
    this.httpHelperService
      .getPlain(
        `${basePath}${offset === 0 ? '' : `/${offset}`}?X-NPE-PSU-Duration=PT1H`
      )
      .then((url) => {
        PlayerComponent.songTimeOffset = offset;
        this.prepareSongStart(url, startTime, 0, directPlay);
      })
      .catch((error) => {
        if (error.status === 422) {
          this.httpHelperService
            .getPlain(`${basePath}?X-NPE-PSU-Duration=PT1H`)
            .then((url) => {
              PlayerComponent.songTimeOffset = 0;
              this.prepareSongStart(url, startTime, offset, directPlay);
            }, console.error);
          return;
        }
      });
    this.httpHelperService
      .get(`/songs/${songId}`, Song)
      .then((song) => {
        this.setNewSong(song);
      })
      .catch(console.error);
  }

  setVolume(event: MatSliderChange): void {
    this.audioService.setVolume(event.value);
  }

  onRating(rating: number): void {
    this.httpHelperService
      .put(
        `/ratings/${PlayerComponent.currentSong.id}/addUserRating/${rating}`,
        null
      )
      .then(() => {
        this.getRating();
      })
      .catch(console.error);
  }

  getRating(): void {
    this.httpHelperService
      .getPlain(`/ratings/getSongRating/${PlayerComponent.currentSong.id}`)
      .then((rating) => {
        PlayerComponent.songRating = Number(rating);
      })
      .catch(console.error);
  }

  getUserRating(): void {
    this.httpHelperService
      .getPlain(`/ratings/getUserRating/${PlayerComponent.currentSong.id}`)
      .then((rating) => {
        PlayerComponent.userSongRating = Number(rating);
      })
      .catch(console.error);
  }

  getDisplayHistoryStartIndex(): number {
    return Math.max(
      0,
      PlayerComponent.history.length -
        Math.max(5, 10 - PlayerComponent.queue.length)
    );
  }

  getDisplayQueueLength(): number {
    return Math.max(5, 10 - PlayerComponent.history.length);
  }

  removeSongFromQueueOrHistory(queueIndex: number, type: string): void {
    this.publishCommand(`deleteSongFromQueue/${queueIndex}/${type}`);
  }

  drop(event: CdkDragDrop<string[]>): void {
    this.publishCommand(
      `movedSong/${event.previousIndex}/to/${event.currentIndex}`
    );
  }

  getVolume(): number {
    return this.audioService.getVolume();
  }

  protected processCommand(jsonString: string): void {
    this.getLatencyComponent().endLatencyMeasurement();
    const commandObject = JSON.parse(jsonString);
    switch (commandObject.type) {
      case 'Start':
        this.audioService.stop();
        this.loadNewSong(commandObject.songId, commandObject.time, 0);
        break;
      case 'Pause':
        this.audioService.pauseAtPosition(
          commandObject.position - PlayerComponent.songTimeOffset
        );
        PlayerComponent.playerState = PlayerState.PAUSE;
        break;
      case 'Resume':
        this.schedulePlay(commandObject.time);
        break;
      case 'Stop':
        this.audioService.stop();
        PlayerComponent.playerState = PlayerState.STOP;
        break;
      case 'Leave':
        const userIndex = PlayerComponent.sessionUsers.findIndex(
          (value) => value.id === commandObject.userId
        );
        if (userIndex != -1) {
          PlayerComponent.sessionUsers.splice(userIndex, 1);
        }
        break;
      case 'Join':
        PlayerComponent.sessionUsers = commandObject.sessionUsers;
        if (
          commandObject.userId ===
          this.authenticationService.currentUserValue.id
        ) {
          PlayerComponent.queue = commandObject.queue;
          PlayerComponent.history = commandObject.history;
          PlayerComponent.loopMode = commandObject.loopMode;
          switch (commandObject.sessionState) {
            case 'PLAY':
              this.loadNewSong(
                commandObject.currentSong.id,
                commandObject.time,
                commandObject.startOffset,
                true,
                false
              );
              break;
            case 'STOP':
              this.audioService.stop();
              PlayerComponent.currentSong = new Song();
              PlayerComponent.currentSong.id = commandObject.currentSong.id;
              PlayerComponent.currentSong.title =
                commandObject.currentSong.title;
              PlayerComponent.playerState = PlayerState.STOP;
              break;
            case 'PAUSE':
              this.loadNewSong(
                commandObject.currentSong.id,
                commandObject.time,
                commandObject.startOffset,
                false
              );
              PlayerComponent.playerState = PlayerState.STOP;
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

  private prepareSongStart(
    url: string,
    startTime: number,
    offset: number,
    directPlay: boolean
  ): void {
    this.audioService.setSrc(url);
    this.audioService.setCurrentTime(offset / 1000);
    if (directPlay) {
      this.schedulePlay(
        startTime + this.getLatencyComponent().serverTimeOffset
      );
    }
  }

  private schedulePlay(startTime: number): void {
    PlayerComponent.playerState = PlayerState.WAITING;
    setTimeout(() => {
      this.audioService.play().catch((reason) => console.error(reason));
      PlayerComponent.playerState = PlayerState.PLAY;
    }, startTime - new Date().getTime());
  }

  /**
   * Move the given song in the playing position and update the history and/or the queue accordingly.
   * @param songId the song to be played
   */
  private updateQueueAndHistory(songId: number): void {
    const queueIndex = PlayerComponent.queue.findIndex(
      (value) => value.id === songId
    );
    if (queueIndex !== -1) {
      // forward
      if (PlayerComponent.currentSong) {
        PlayerComponent.history.push({
          id: PlayerComponent.currentSong.id,
          title: PlayerComponent.currentSong.title,
        });
      }
      PlayerComponent.currentSong.title = PlayerComponent.queue.splice(
        queueIndex,
        1
      )[0].title;
      if (queueIndex !== 0) {
        // was actually backwards loop
        PlayerComponent.history = PlayerComponent.history.concat(
          PlayerComponent.queue
        );
        PlayerComponent.queue = [];
      }
    } else {
      const historyIndex = PlayerComponent.history.findIndex(
        (value) => value.id === songId
      );
      if (historyIndex !== -1) {
        // backwards
        if (PlayerComponent.currentSong) {
          PlayerComponent.queue.unshift({
            id: PlayerComponent.currentSong.id,
            title: PlayerComponent.currentSong.title,
          });
        }
        PlayerComponent.currentSong.title = PlayerComponent.history.splice(
          historyIndex,
          1
        )[0].title;
        if (historyIndex === 0) {
          // was actually forwards loop
          PlayerComponent.queue = PlayerComponent.history.concat(
            PlayerComponent.queue
          );
          PlayerComponent.history = [];
        }
      }
    }
  }

  private setNewSong(song: Song): void {
    PlayerComponent.currentSong = song;
    this.selectedAlbum = [
      new GenericDataObject(song.album.id, song.album.name),
    ];
    this.selectedArtist = [
      new GenericDataObject(song.artist.id, song.artist.name),
    ];
    this.selectedGenres = song.genres.map(
      (value) => new GenericDataObject(value.id, value.name)
    );
    this.selectedTags = song.tags.map(
      (value) => new GenericDataObject(value.id, value.name)
    );

    this.getRating();
    this.getUserRating();
  }
}
