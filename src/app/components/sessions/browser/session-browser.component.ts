import { Component, OnInit } from '@angular/core';
import { Session } from '../../../models/session';
import { HttpHelperService } from '../../../services/http-helper.service';
import { SessionService } from '../../../services/session.service';

@Component({
  selector: 'app-browser',
  templateUrl: './session-browser.component.html',
  styleUrls: ['./session-browser.component.scss'],
})
export class SessionBrowserComponent implements OnInit {
  sessions: Session[] = [];

  constructor(private httpHelperService: HttpHelperService, private sessionService: SessionService) {}

  ngOnInit(): void {
    this.httpHelperService
      .getArray('/api/v1/sessions/all', Session)
      .then((value) => (this.sessions = value))
      .catch(console.error);
  }

  joinSession(id: number): void {
    this.sessionService.joinSession(id);
  }
}
