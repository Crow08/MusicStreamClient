import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
} from '@angular/core';
import { PlayerComponent } from '../player.component';
import { ActivatedRoute } from '@angular/router';
import { HttpHelperService } from '../../../services/http-helper.service';
import { AuthenticationService } from '../../../services/authentication.service';
import { MediaService } from '../../../services/media.service';
import { WsService } from '../../../services/ws.service';
import { SessionService } from '../../../services/session.service';
import { LatencyComponent } from '../../latency/latency.component';

@Component({
  selector: 'app-full-player',
  templateUrl: './full-player.component.html',
  styleUrls: ['./full-player.component.scss'],
})
export class FullPlayerComponent
  extends PlayerComponent
  implements AfterViewInit, OnInit
{
  @ViewChild('latencyComponent') latencyComponent: LatencyComponent;
  @ViewChild('videoPlayer') set videoPlayer(videoPlayer: ElementRef) {
    PlayerComponent.videoElement = videoPlayer.nativeElement;
  }

  constructor(
    route: ActivatedRoute,
    httpHelperService: HttpHelperService,
    authenticationService: AuthenticationService,
    mediaService: MediaService,
    wsService: WsService,
    sessionService: SessionService
  ) {
    super();
    this.httpHelperService = httpHelperService;
    this.authenticationService = authenticationService;
    this.mediaService = mediaService;
    this.wsService = wsService;
    const routeParams = route.snapshot.paramMap;
    sessionService.joinSession(Number(routeParams.get('sessionId')));
  }

  ngOnInit(): void {
    this.mediaService.addProgressionListener(
      (progression) => (PlayerComponent.progression = progression)
    );
    this.mediaService.mediaEndedSubject.subscribe(() => {
      this.publishCommand(`end/${PlayerComponent.currentSong.id}`);
    });
  }

  ngAfterViewInit(): void {
    this.wsService.subscribeToSessionTopic((body) => this.processCommand(body));
  }

  getLatencyComponent(): LatencyComponent {
    return this.latencyComponent;
  }

  isVideoMode() {
    return this.mediaService.isVideoMode();
  }

  fs() {
    PlayerComponent.videoElement.requestFullscreen();
  }
}
