import {Injectable} from '@angular/core';
import {environment} from '../../environments/environment';
import {plainToClass, plainToInstance} from 'class-transformer';
import {HttpClient} from '@angular/common/http';
import {AuthenticationService} from './authentication.service';
import {ClassConstructor} from 'class-transformer/types/interfaces';

@Injectable({
  providedIn: 'root',
})
export class HttpHelperService {
  constructor(
    private http: HttpClient,
    private authenticationService: AuthenticationService
  ) {
  }

  public get<T>(path: string, clazz: ClassConstructor<T>): Promise<T> {
    const options = {
      headers: this.authenticationService.getAuthHeaderForCurrentUser(),
    };
    return new Promise<T>((resolve, reject) => {
      this.http
        .get(`http://${environment.dbServer}${path}`, options)
        .subscribe({
          next: (value) => {
            const result = plainToInstance(clazz, value);
            resolve(result);
          },
          error: reject
        });
    });
  }

  public getPlain(path: string): Promise<string> {
    const options = {
      headers: this.authenticationService.getAuthHeaderForCurrentUser(),
      responseType: 'text' as 'text',
    };
    return new Promise<string>((resolve, reject) => {
      this.http
        .get(`http://${environment.dbServer}${path}`, options)
        .subscribe({next: resolve, error: reject});
    });
  }

  public getArray<T>(path: string, clazz: ClassConstructor<T>): Promise<T[]> {
    const options = {
      headers: this.authenticationService.getAuthHeaderForCurrentUser(),
    };
    return new Promise<T[]>((resolve, reject) => {
      this.http
        .get(`http://${environment.dbServer}${path}`, options)
        .subscribe({
          next: (valueArray) => {
            const resultArray: T[] = [];
            (valueArray as any[]).forEach((rawArtist) =>
              resultArray.push(plainToInstance(clazz, rawArtist))
            );
            resolve(resultArray);
          },
          error: reject
        });
    });
  }

  public post<T>(path: string, body: any): Promise<T> {
    const options = {
      headers: this.authenticationService.getAuthHeaderForCurrentUser(),
    };
    return new Promise<T>((resolve, reject) => {
      this.http
        .post(`http://${environment.dbServer}${path}`, body, options)
        .subscribe({next: resolve, error: reject});
    });
  }

  public put<T>(path: string, body: any): Promise<T> {
    const options = {
      headers: this.authenticationService.getAuthHeaderForCurrentUser(),
    };
    return new Promise<T>((resolve, reject) => {
      this.http
        .put(`http://${environment.dbServer}${path}`, body, options)
        .subscribe({next: resolve, error: reject});
    });
  }

  public putPlain(path: string, body: any): Promise<string> {
    const options = {
      headers: this.authenticationService.getAuthHeaderForCurrentUser(),
      responseType: 'text' as 'text',
    };
    return new Promise<string>((resolve, reject) => {
      this.http
        .put(`http://${environment.dbServer}${path}`, body, options)
        .subscribe({next: resolve, error: reject});
    });
  }
}
