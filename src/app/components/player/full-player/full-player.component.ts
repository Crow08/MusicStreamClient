import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { PlayerComponent } from '../player.component';
import { ActivatedRoute } from '@angular/router';
import { HttpHelperService } from '../../../services/http-helper.service';
import { AuthenticationService } from '../../../services/authentication.service';
import { AudioService } from '../../../services/audio.service';
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

  constructor(
    route: ActivatedRoute,
    httpHelperService: HttpHelperService,
    authenticationService: AuthenticationService,
    audioService: AudioService,
    wsService: WsService,
    sessionService: SessionService
  ) {
    super();
    this.httpHelperService = httpHelperService;
    this.authenticationService = authenticationService;
    this.audioService = audioService;
    this.wsService = wsService;
    const routeParams = route.snapshot.paramMap;
    sessionService.joinSession(Number(routeParams.get('sessionId')));
  }

  ngOnInit(): void {
    this.audioService.addProgressionListener(
      (progression) => (PlayerComponent.progression = progression)
    );
    this.audioService.songEndedSubject.subscribe(() => {
      this.publishCommand(`end/${PlayerComponent.currentSong.id}`);
    });
  }

  ngAfterViewInit(): void {
    this.wsService.subscribeToSessionTopic((body) => this.processCommand(body));
  }

  getLatencyComponent(): LatencyComponent {
    return this.latencyComponent;
  }
}
