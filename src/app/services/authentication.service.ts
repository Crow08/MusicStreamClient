import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {BehaviorSubject, Observable} from 'rxjs';
import {map} from 'rxjs/operators';

import {User} from '../models/user';
import {environment} from '../../environments/environment';
import {WsConfigService} from './ws-config.service';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {

  private currentUserSubject: BehaviorSubject<User>;

  constructor(private http: HttpClient,
              private wsConfigService: WsConfigService) {
    this.currentUserSubject = new BehaviorSubject<User>(JSON.parse(localStorage.getItem('currentUser')));
    this.currentUserSubject.subscribe(value =>
      this.wsConfigService.updateWsConfig({
        login: value?.username,
        auth: value?.password
      })
    );
  }

  public get currentUserValue(): User {
    return this.currentUserSubject.value;
  }

  private static getAuthHeaderForUser(user: User): HttpHeaders {
    return new HttpHeaders({Authorization: `Basic ${user.authdata}`});
  }

  public getAuthHeaderForCurrentUser(): HttpHeaders {
    return AuthenticationService.getAuthHeaderForUser(this.currentUserSubject.value);
  }

  login(username: string, password: string): Observable<User> {
    const user = new User();
    user.username = username;
    user.password = password;
    user.authdata = window.btoa(username + ':' + password);
    return this.http.get<any>(`http://${environment.dbServer}/users/login`, {headers: AuthenticationService.getAuthHeaderForUser(user)})
      .pipe(map(userDTO => {
        user.id = userDTO.id;
        console.log(`Login: ${JSON.stringify(userDTO)}`);
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSubject.next(user);
        return user;
      }));
  }

  logout(): void {
    // remove user from local storage to log user out
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }
}
