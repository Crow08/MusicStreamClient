import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';
import {CdkDragDrop} from '@angular/cdk/drag-drop';
import {Subscription} from 'rxjs';
import {LatencyComponent} from '../latency/latency.component';
import {ActivatedRoute} from '@angular/router';
import {RxStompService} from '@stomp/ng2-stompjs';
import {AuthenticationService} from '../../services/authentication.service';
import {Song} from '../../models/song';
import {AudioService} from '../../services/audio.service';
import {MatSliderChange} from '@angular/material/slider';
import {HttpHelperService} from '../../services/http-helper.service';
import {WsConfigService} from '../../services/ws-config.service';
import {User} from '../../models/user';
import {GenericDataObject} from '../../models/genericDataObject';
import {SessionService} from '../../services/session.service';

enum PlayerState {
  WAITING = 'WAITING',
  PLAY = 'PLAY',
  PAUSE = 'PAUSE',
  STOP = 'STOP'
}

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.scss']
})
export class PlayerComponent implements AfterViewInit, OnInit {

  private static topic: Subscription;

  playerState: PlayerState = PlayerState.STOP;
  loopMode = false;
  queue: { id: number, title: string }[] = [];
  history: { id: number, title: string }[] = [];
  sessionUsers: User[] = [];
  currentSong: Song;
  progression = 0;
  songTimeOffset = 0;
  songRating = 0;
  userSongRating = 0;

  selectedArtist: GenericDataObject[] = [];
  selectedAlbum: GenericDataObject[] = [];
  selectedGenres: GenericDataObject[] = [];
  selectedTags: GenericDataObject[] = [];

  @ViewChild('latencyComponent') latencyComponent: LatencyComponent;


  constructor(private route: ActivatedRoute,
              private httpHelperService: HttpHelperService,
              private rxStompService: RxStompService,
              private authenticationService: AuthenticationService,
              private audioService: AudioService,
              private wsConfigService: WsConfigService,
              private sessionService: SessionService) {
    const routeParams = this.route.snapshot.paramMap;
    this.sessionService.joinSession(Number(routeParams.get('sessionId')));
    this.rxStompService.configure(this.wsConfigService.myRxStompConfig());
  }

  ngOnInit(): void {
    this.audioService.addProgressionListener((progression) => this.progression = progression);
    this.audioService.songEndedSubject.subscribe(() => {
      this.publishCommand(`end/${this.currentSong.id}`);
    });
  }

  ngAfterViewInit(): void {
    this.subscribeControlsTopic();
    setTimeout(() => this.publishCommand(`join/${this.authenticationService.currentUserValue.id}`), 1000);

  }

  publishCommand(name: string): void {
    if (this.sessionService.sessionId) {
      this.latencyComponent.startLatencyMeasurement();
      this.rxStompService.publish({destination: `/app/sessions/${this.sessionService.sessionId}/commands/${name}`, body: name});
    } else {
      alert('No active Session!');
    }
  }

  loadNewSong(songId: number, startTime: number, offset: number, directPlay = true): void {
    this.updateQueueAndHistory(songId);
    if (songId === -1) {
      this.playerState = PlayerState.STOP;
      return;
    }
    const basePath = `/songs/${songId}/data`;
    this.httpHelperService.getPlain(`${basePath}${(offset === 0 ? '' : `/${offset}`)}?X-NPE-PSU-Duration=PT1H`)
      .then(url => {
        this.songTimeOffset = offset;
        this.prepareSongStart(url, startTime, 0, directPlay);
      })
      .catch(error => {
        if (error.status === 422) {
          this.httpHelperService.getPlain(`${basePath}?X-NPE-PSU-Duration=PT1H`)
            .then(url => {
                this.songTimeOffset = 0;
                this.prepareSongStart(url, startTime, offset, directPlay);
              },
              console.error
            );
          return;
        }
      });
    this.httpHelperService.get(`/songs/${songId}`, Song)
      .then(song => {
        this.setNewSong(song);
      })
      .catch(console.error);
  }

  setVolume(event: MatSliderChange): void {
    this.audioService.setVolume(event.value);
  }

  onRating(rating: number): void {
    this.httpHelperService.put(`/ratings/${this.currentSong.id}/addUserRating/${rating}`, null)
      .then(() => {
        this.getRating();
      })
      .catch(console.error);
  }

  getRating(): void {
    this.httpHelperService.getPlain(`/ratings/getSongRating/${this.currentSong.id}`)
      .then((rating) => {
        this.songRating = Number(rating);
      })
      .catch(console.error);
  }

  getUserRating(): void {
    this.httpHelperService.getPlain(`/ratings/getUserRating/${this.currentSong.id}`)
      .then((rating) => {
        this.userSongRating = Number(rating);
      })
      .catch(console.error);
  }

  getDisplayHistoryStartIndex(): number {

    return Math.max(0, this.history.length - Math.max(5, 10 - this.queue.length));
  }

  getDisplayQueueLength(): number {
    return Math.max(5, 10 - this.history.length);
  }

  private subscribeControlsTopic(): void {
    if (PlayerComponent.topic) {
      PlayerComponent.topic.unsubscribe();
    }
    PlayerComponent.topic = this.rxStompService.watch(`/topic/sessions/${this.sessionService.sessionId}`).subscribe((message: any) => {
      this.processCommand(message.body);
    });
  }

  private prepareSongStart(url: string, startTime: number, offset: number, directPlay: boolean): void {
    this.audioService.setSrc(url);
    this.audioService.setCurrentTime(offset / 1000);
    if (directPlay) {
      this.schedulePlay(startTime + this.latencyComponent.serverTimeOffset);
    }
  }

  private schedulePlay(startTime: number): void {
    this.playerState = PlayerState.WAITING;
    setTimeout(() => {
      this.audioService.play().catch(reason => console.error(reason));
      this.playerState = PlayerState.PLAY;
    }, startTime - (new Date()).getTime());
  }

  private processCommand(jsonString: string): void {
    this.latencyComponent.endLatencyMeasurement();
    const commandObject = JSON.parse(jsonString);
    switch (commandObject.type) {
      case 'Start':
        this.audioService.stop();
        this.loadNewSong(commandObject.songId, commandObject.time, 0);
        break;
      case 'Pause':
        this.audioService.pauseAtPosition(commandObject.position - this.songTimeOffset);
        this.playerState = PlayerState.PAUSE;
        break;
      case 'Resume':
        this.schedulePlay(commandObject.time);
        break;
      case 'Stop':
        this.audioService.stop();
        this.playerState = PlayerState.STOP;
        break;
      case 'Leave':
        this.sessionUsers.splice(this.sessionUsers.findIndex(value => value.id === commandObject.userId), 1);
        break;
      case 'Join':
        this.sessionUsers = commandObject.sessionUsers;
        if (commandObject.userId === this.authenticationService.currentUserValue.id) {
          this.queue = commandObject.queue;
          this.history = commandObject.history;
          this.loopMode = commandObject.loopMode;
          switch (commandObject.sessionState) {
            case 'PLAY':
              this.loadNewSong(commandObject.currentSong.id, commandObject.time, commandObject.startOffset);
              break;
            case 'STOP':
              this.audioService.stop();
              this.currentSong = new Song();
              this.currentSong.id = commandObject.currentSong.id;
              this.currentSong.title = commandObject.currentSong.title;
              this.playerState = PlayerState.STOP;
              break;
            case 'PAUSE':
              this.loadNewSong(commandObject.currentSong.id, commandObject.time, commandObject.startOffset, false);
              this.playerState = PlayerState.STOP;
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
        }
        break;
    }
  }

  /**
   * Move the given song in the playing position and update the history and/or the queue accordingly.
   * @param songId the song to be played
   */
  private updateQueueAndHistory(songId: number): void {
    const queueIndex = this.queue.findIndex(value => value.id === songId);
    if (queueIndex !== -1) {
      // forward
      if (this.currentSong) {
        this.history.push({id: this.currentSong.id, title: this.currentSong.title});
      }
      this.currentSong.title = this.queue.splice(queueIndex, 1)[0].title;
      if (queueIndex !== 0) {
        // was actually backwards loop
        this.history = this.history.concat(this.queue);
        this.queue = [];
      }
    } else {
      const historyIndex = this.history.findIndex(value => value.id === songId);
      if (historyIndex !== -1) {
        // backwards
        if (this.currentSong) {
          this.queue.unshift({id: this.currentSong.id, title: this.currentSong.title});
        }
        this.currentSong.title = this.history.splice(historyIndex, 1)[0].title;
        if (historyIndex === 0) {
          // was actually forwards loop
          this.queue = this.history.concat(this.queue);
          this.history = [];
        }
      }
    }
  }

  private setNewSong(song: Song): void {
    this.currentSong = song;
    this.selectedAlbum = [new GenericDataObject(song.album.id, song.album.name)];
    this.selectedArtist = [new GenericDataObject(song.artist.id, song.artist.name)];
    this.selectedGenres = song.genres.map(value => new GenericDataObject(value.id, value.name));
    this.selectedTags = song.tags.map(value => new GenericDataObject(value.id, value.name));

    this.getRating();
    this.getUserRating();
  }

  removeSongFromQueueOrHistory(queueIndex: number, type: string): void {
    this.publishCommand(`deleteSongFromQueue/${queueIndex}/${type}`);
  }

  drop(event: CdkDragDrop<string[]>): void {
    this.publishCommand(`movedSong/${event.previousIndex}/to/${event.currentIndex}`);
  }
}
