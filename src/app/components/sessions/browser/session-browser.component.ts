import {Component, OnInit} from '@angular/core';
import {Session} from '../../../models/session';
import {HttpHelperService} from '../../../services/http-helper.service';

@Component({
  selector: 'app-browser',
  templateUrl: './session-browser.component.html',
  styleUrls: ['./session-browser.component.scss']
})
export class SessionBrowserComponent implements OnInit {

  sessions: Session[] = [];

  constructor(private httpHelperService: HttpHelperService) {
  }

  ngOnInit(): void {
    this.httpHelperService.getArray('/sessions/all', Session)
      .then(value => this.sessions = value)
      .catch(console.error);
  }
}
