import { CustomSnackBarComponent } from './custom-snack-bar.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class HttpCodeMessageGenerator {
  constructor(private snackBar: MatSnackBar) {}

  public calculateReturnCodeMessage(httpCode: number, customMessages?: any): void {
    let message: string;
    // ok, which component needs that message?
    switch (httpCode) {
      case 409:
        message = customMessages?.e409 ? customMessages.e409 : 'Data conflict!';
        break;
      case 404:
        message = customMessages?.e404 ? customMessages.e404 : 'Not found!';
        break;
      case 500:
        message = customMessages?.e500 ? customMessages.e500 : 'Something went terribly wrong!';
        break;
      default:
        message = 'There was an Error, but I dont know, what it means!';
        break;
    }
    this.snackBar.openFromComponent(CustomSnackBarComponent, {
      panelClass: ['http-error-notification'],
      data: {
        message: message,
      },
      duration: message.length * 100,
    });
  }

  public customMessage(message: string): void {
    this.snackBar.openFromComponent(CustomSnackBarComponent, {
      data: {
        message,
      },
      duration: message.length * 100,
    });
  }
}
