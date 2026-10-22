import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { PlayerComponent } from '../player.component';
import { MediaService } from '../../../services/media.service';
import { SettingsService } from '../../../services/settings.service';
import { PlayerEngineService } from '../../../services/player-engine.service';
import { SessionService } from '../../../services/session.service';

/** Controls of the session shown on the pages other than the lobby, see AppComponent. */
@Component({
  selector: 'app-mini-player',
  templateUrl: './mini-player.component.html',
  styleUrls: ['./mini-player.component.scss'],
})
export class MiniPlayerComponent extends PlayerComponent {
  constructor(
    engine: PlayerEngineService,
    mediaService: MediaService,
    settingsService: SettingsService,
    private router: Router,
    private sessionService: SessionService
  ) {
    super(engine, mediaService, settingsService);
  }

  /** Opens the lobby of the current session. The session is already joined, so the playback is not interrupted. */
  backToSession(): void {
    const sessionId = this.sessionService.sessionId.value;
    if (sessionId !== null) {
      this.router.navigateByUrl(`/sessions/${sessionId}/lobby`).catch(console.error);
    }
  }
}
