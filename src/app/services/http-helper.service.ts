import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { plainToInstance } from 'class-transformer';
import { HttpClient } from '@angular/common/http';
import { AuthenticationService } from './authentication.service';
import { ClassConstructor } from 'class-transformer/types/interfaces';

interface RestPage {
  content: any[];
  pageable: {
    sort: {
      empty: boolean;
      sorted: boolean;
      unsorted: boolean;
    };
    offset: number;
    pageSize: number;
    pageNumber: number;
    unpaged: boolean;
    paged: boolean;
  };
  last: boolean;
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  first: boolean;
  numberOfElements: number;
  empty: boolean;
}

export class Page<T> {
  content: T[];
  numberOfElements: number;

  constructor(content: T[], totalElements: number) {
    this.content = content;
    this.numberOfElements = totalElements;
  }
}

@Injectable({
  providedIn: 'root',
})
export class HttpHelperService {
  constructor(private http: HttpClient, private authenticationService: AuthenticationService) {}

  public get<T>(path: string, clazz: ClassConstructor<T>): Promise<T> {
    const options = {
      headers: this.authenticationService.getAuthHeaderForCurrentUser(),
    };
    return new Promise<T>((resolve, reject) => {
      this.http.get(`${environment.dbServer}${path}`, options).subscribe({
        next: (value) => {
          const result = plainToInstance(clazz, value);
          resolve(result);
        },
        error: reject,
      });
    });
  }

  public getPlain(path: string): Promise<string> {
    const options = {
      headers: this.authenticationService.getAuthHeaderForCurrentUser(),
      responseType: 'text' as 'text',
    };
    return new Promise<string>((resolve, reject) => {
      this.http.get(`${environment.dbServer}${path}`, options).subscribe({ next: resolve, error: reject });
    });
  }

  public getArray<T>(path: string, clazz: ClassConstructor<T>): Promise<T[]> {
    const options = {
      headers: this.authenticationService.getAuthHeaderForCurrentUser(),
    };
    return new Promise<T[]>((resolve, reject) => {
      this.http.get(`${environment.dbServer}${path}`, options).subscribe({
        next: (valueArray) => {
          const resultArray: T[] = [];
          (valueArray as any[]).forEach((rawObject) => resultArray.push(plainToInstance(clazz, rawObject)));
          resolve(resultArray);
        },
        error: reject,
      });
    });
  }

  getPage<T>(path: string, clazz: ClassConstructor<T>): Promise<Page<T>> {
    const options = {
      headers: this.authenticationService.getAuthHeaderForCurrentUser(),
    };
    return new Promise<Page<T>>((resolve, reject) => {
      this.http.get(`${environment.dbServer}${path}`, options).subscribe({
        next: (value) => {
          const restPage = value as RestPage;
          const resultPage = new Page<T>(
            restPage.content.map((rawObject) => plainToInstance(clazz, rawObject)),
            restPage.totalElements
          );
          resolve(resultPage);
        },
        error: reject,
      });
    });
  }

  public post<T>(path: string, body: any): Promise<T> {
    const options = {
      headers: this.authenticationService.getAuthHeaderForCurrentUser(),
    };
    return new Promise<T>((resolve, reject) => {
      this.http.post(`${environment.dbServer}${path}`, body, options).subscribe({
        next: (value) => {
          resolve(value as T);
        },
        error: reject,
      });
    });
  }

  public put<T>(path: string, body: any): Promise<T> {
    const options = {
      headers: this.authenticationService.getAuthHeaderForCurrentUser(),
    };
    return new Promise<T>((resolve, reject) => {
      this.http.put(`${environment.dbServer}${path}`, body, options).subscribe({
        next: (value) => {
          resolve(value as T);
        },
        error: reject,
      });
    });
  }

  public putPlain(path: string, body: any): Promise<string> {
    const options = {
      headers: this.authenticationService.getAuthHeaderForCurrentUser(),
      responseType: 'text' as 'text',
    };
    return new Promise<string>((resolve, reject) => {
      this.http.put(`${environment.dbServer}${path}`, body, options).subscribe({ next: resolve, error: reject });
    });
  }
}
