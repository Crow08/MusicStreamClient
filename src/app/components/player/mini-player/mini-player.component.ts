import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { PlayerComponent } from '../player.component';
import { Router } from '@angular/router';
import { HttpHelperService } from '../../../services/http-helper.service';
import { AuthenticationService } from '../../../services/authentication.service';
import { AudioService } from '../../../services/audio.service';
import { WsService } from '../../../services/ws.service';
import { LatencyComponent } from '../../latency/latency.component';

@Component({
  selector: 'app-mini-player',
  templateUrl: './mini-player.component.html',
  styleUrls: ['./mini-player.component.scss'],
})
export class MiniPlayerComponent
  extends PlayerComponent
  implements AfterViewInit, OnInit
{
  @ViewChild('miniLatencyComponent') latencyComponent: LatencyComponent;

  constructor(
    private router: Router,
    httpHelperService: HttpHelperService,
    authenticationService: AuthenticationService,
    audioService: AudioService,
    wsService: WsService
  ) {
    super();
    this.httpHelperService = httpHelperService;
    this.authenticationService = authenticationService;
    this.audioService = audioService;
    this.wsService = wsService;
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

  displayMiniPlayer() {
    return !this.router.url.endsWith('lobby');
  }
}
