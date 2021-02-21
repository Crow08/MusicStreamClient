import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {BehaviorSubject, Observable} from 'rxjs';
import {map} from 'rxjs/operators';

import {User} from '../models/user';
import {environment} from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  private currentUserSubject: BehaviorSubject<User>;
  public currentUser: Observable<User>;

  constructor(private http: HttpClient) {
    this.currentUserSubject = new BehaviorSubject<User>(JSON.parse(localStorage.getItem('currentUser')));
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User {
    return this.currentUserSubject.value;
  }

  public getAuthHeaderForCurrentUser(): HttpHeaders {
    return this.getAuthHeaderForUser(this.currentUserSubject.value);
  }

  private getAuthHeaderForUser(user: User): HttpHeaders {
    return  new HttpHeaders({Authorization: `Basic ${user.authdata}`});
  }

  login(username: string, password: string): Observable<User> {
    const user = new User();
    user.username = username;
    user.password = password;
    user.authdata = window.btoa(username + ':' + password);
    return this.http.get<any>(`http://${environment.dbServer}/users/login`, {headers: this.getAuthHeaderForUser(user)})
      .pipe(map(userDTO => {
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
