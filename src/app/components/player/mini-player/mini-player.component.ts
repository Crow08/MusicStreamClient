import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { PlayerComponent } from '../player.component';
import { Router } from '@angular/router';
import { HttpHelperService } from '../../../services/http-helper.service';
import { AuthenticationService } from '../../../services/authentication.service';
import { MediaService } from '../../../services/media.service';
import { WsService } from '../../../services/ws.service';
import { LatencyComponent } from '../../latency/latency.component';

@Component({
  selector: 'app-mini-player',
  templateUrl: './mini-player.component.html',
  styleUrls: ['./mini-player.component.scss'],
})
export class MiniPlayerComponent extends PlayerComponent implements AfterViewInit, OnInit {
  @ViewChild('miniLatencyComponent') latencyComponent: LatencyComponent;

  constructor(
    private router: Router,
    httpHelperService: HttpHelperService,
    authenticationService: AuthenticationService,
    mediaService: MediaService,
    wsService: WsService
  ) {
    super();
    this.httpHelperService = httpHelperService;
    this.authenticationService = authenticationService;
    this.mediaService = mediaService;
    this.wsService = wsService;
  }

  ngOnInit(): void {
    this.mediaService.mediaEndedSubject.subscribe(() => {
      this.publishCommand(`end/${PlayerComponent.currentMedia.id}`);
    });
  }

  ngAfterViewInit(): void {
    this.wsService.subscribeToSessionTopic((body) => this.processCommand(body));
  }

  getLatencyComponent(): LatencyComponent {
    return this.latencyComponent;
  }

  displayMiniPlayer() {
    return !this.router.url.endsWith('lobby') && !this.router.url.endsWith('login');
  }
}
