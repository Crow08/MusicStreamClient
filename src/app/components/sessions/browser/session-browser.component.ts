import { Component, OnInit } from '@angular/core';
import {Session} from '../../../models/session';
import {HttpClient} from '@angular/common/http';
import {AuthenticationService} from '../../../services/authentication.service';
import {environment} from '../../../../environments/environment';
import {plainToClass} from 'class-transformer';

@Component({
  selector: 'app-browser',
  templateUrl: './session-browser.component.html',
  styleUrls: ['./session-browser.component.css']
})
export class SessionBrowserComponent implements OnInit {

  sessionId: string;
  sessions: Session[] = [];

  constructor(private http: HttpClient,
              private authenticationService: AuthenticationService) {
  }

  ngOnInit(): void {
    const options =  {headers: this.authenticationService.getAuthHeaderForCurrentUser()};
    this.http.get(`http://${environment.dbServer}/sessions/all`, options)
      .subscribe(valueArray => {
        this.sessions = [];
        (valueArray as any[]).forEach((rawSession) => this.sessions.push(plainToClass(Session, rawSession)));
      });
  }
}
