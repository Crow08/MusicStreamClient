import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { User } from '../models/user';
import { environment } from '../../environments/environment';
import { WsConfigService } from './ws-config.service';

@Injectable({
  providedIn: 'root',
})
export class AuthenticationService {
  private currentUserSubject: BehaviorSubject<User | null>;

  constructor(private http: HttpClient, private wsConfigService: WsConfigService) {
    const storedUser = localStorage.getItem('currentUser');
    this.currentUserSubject = new BehaviorSubject<User | null>(storedUser ? JSON.parse(storedUser) : null);
    this.currentUserSubject.subscribe((value) =>
      this.wsConfigService.updateWsConfig({
        login: value?.username,
        auth: value?.password,
      })
    );
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  private static getAuthHeaderForUser(user: User | null): HttpHeaders {
    if (user) {
      return new HttpHeaders({ Authorization: `Basic ${user.authdata}` });
    } else {
      return new HttpHeaders();
    }
  }

  public getAuthHeaderForCurrentUser(): HttpHeaders {
    return AuthenticationService.getAuthHeaderForUser(this.currentUserSubject.value);
  }

  login(username: string, password: string): Observable<User> {
    const user = new User(-1, username, password, window.btoa(username + ':' + password));
    return this.http
      .get<any>(`${environment.dbServer}/api/v1/users/login`, {
        headers: AuthenticationService.getAuthHeaderForUser(user),
      })
      .pipe(
        map((userDTO) => {
          user.id = userDTO.id;
          console.log(`Login: ${JSON.stringify(userDTO)}`);
          localStorage.setItem('currentUser', JSON.stringify(user));
          this.currentUserSubject.next(user);
          return user;
        })
      );
  }

  logout(): void {
    // remove user from local storage to log user out
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }
}
