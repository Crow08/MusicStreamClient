import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';
import {Subscription} from 'rxjs';
import {LatencyComponent} from '../latency/latency.component';
import {ActivatedRoute} from '@angular/router';
import {RxStompService} from '@stomp/ng2-stompjs';
import {AuthenticationService} from '../../services/authentication.service';
import {Song} from '../../models/song';
import {AudioService} from '../../services/audio.service';
import {MatSliderChange} from '@angular/material/slider';
import {HttpHelperService} from '../../services/http-helper.service';

enum PlayerState {
  WAITING = 'WAITING',
  PLAY = 'PLAY',
  PAUSE = 'PAUSE',
  STOP = 'STOP'
}

@Component({
  selector: 'app-session-lobby',
  templateUrl: './player.component.html',
  styleUrls: ['./player.component.scss']
})
export class PlayerComponent implements AfterViewInit, OnInit {

  private static topic: Subscription;

  playerState: PlayerState = PlayerState.STOP;
  loopMode = false;
  queue: string[] = [];
  sessionId: number;
  currentSong: Song;
  progression = 0;
  songTimeOffset = 0;
  songRating: number = 0;
  userSongRating: number = 0;

  @ViewChild('latencyComponent') latencyComponent: LatencyComponent;


  constructor(private route: ActivatedRoute,
              private httpHelperService: HttpHelperService,
              private rxStompService: RxStompService,
              private authenticationService: AuthenticationService,
              private audioService: AudioService) {
  }

  ngOnInit(): void {
    const routeParams = this.route.snapshot.paramMap;
    this.sessionId = Number(routeParams.get('sessionId'));
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
    if (this.sessionId) {
      this.latencyComponent.startLatencyMeasurement();
      this.rxStompService.publish({destination: `/app/sessions/${this.sessionId}/commands/${name}`, body: name});
    } else {
      alert('No active Session!');
    }
  }

  loadNewSong(songId: number, startTime: number, offset: number, directPlay = true): void {
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
        this.currentSong = song;
        this.getRating();
        this.getUserRating();
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
        console.log(`The user rating is: ${rating}`);
        this.userSongRating = Number(rating);
      })
      .catch(console.error);
  }

  private subscribeControlsTopic(): void {
    if (PlayerComponent.topic) {
      PlayerComponent.topic.unsubscribe();
    }
    PlayerComponent.topic = this.rxStompService.watch(`/topic/sessions/${this.sessionId}`).subscribe((message: any) => {
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
        this.currentSong = undefined;
        this.playerState = PlayerState.STOP;
        break;
      case 'Join':
        if (commandObject.userId === this.authenticationService.currentUserValue.id) {
          this.loopMode = commandObject.loopMode;
          this.queue = commandObject.queue;
          switch (commandObject.sessionState) {
            case 'PLAY':
              this.loadNewSong(commandObject.songId, commandObject.time, commandObject.startOffset);
              break;
            case 'STOP':
              this.audioService.stop();
              this.playerState = PlayerState.STOP;
              break;
            case 'PAUSE':
              this.loadNewSong(commandObject.songId, commandObject.time, commandObject.startOffset, false);
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
        }
        break;
    }
  }
}
