import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Session } from '../../../models/session';
import { HttpHelperService } from '../../../services/http-helper.service';

@Component({
  selector: 'app-browser',
  templateUrl: './session-browser.component.html',
  styleUrls: ['./session-browser.component.scss'],
})
export class SessionBrowserComponent implements OnInit {
  sessions: Session[] = [];

  constructor(private httpHelperService: HttpHelperService, private router: Router) {}

  ngOnInit(): void {
    this.httpHelperService
      .getArray('/api/v1/sessions/all', Session)
      .then((value) => (this.sessions = value))
      .catch(console.error);
  }

  openSession(id: number): void {
    // joining is done by the lobby, which also handles the required user interaction
    this.router.navigateByUrl(`/sessions/${id}/lobby`).catch(console.error);
  }
}
