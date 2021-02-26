import {AfterViewInit, Component, ElementRef, ViewChild} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../environments/environment';
import {AuthenticationService} from '../../services/authentication.service';
import {Session} from '../../models/session';
import {plainToClass} from 'class-transformer';
import {RxStompService} from '@stomp/ng2-stompjs';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  sessionId: string;
  sessions: Session[] = [];

  constructor(private http: HttpClient,
              private authenticationService: AuthenticationService) {
  }

  browseSessions(): void {
    const options =  {headers: this.authenticationService.getAuthHeaderForCurrentUser()};
    this.http.get(`http://${environment.dbServer}/sessions/all`, options)
      .subscribe(valueArray => {
        this.sessions = [];
        (valueArray as any[]).forEach((rawSession) => this.sessions.push(plainToClass(Session, rawSession)));
      });
  }

  joinSession(id: string): void {
    this.sessionId = id;
    console.log('SESSION ID IS: ' + this.sessionId);

  }

  createSession(): void {
    const options = {headers: this.authenticationService.getAuthHeaderForCurrentUser(), responseType: 'text' as 'text' };
    this.http.put(`http://${environment.dbServer}/sessions/`, 'TEST SESSION', options)
      .subscribe(value => {
        console.log(value);
      });
  }
}
