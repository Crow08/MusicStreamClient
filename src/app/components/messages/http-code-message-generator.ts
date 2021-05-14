import {CustomSnackBarComponent} from './custom-snack-bar.component';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Injectable} from '@angular/core';


@Injectable({
  providedIn: 'root'
})

export class HttpCodeMessageGenerator {

  constructor(private snackBar: MatSnackBar) {
  }

  message: string;

  public calculateReturnCodeMessage(httpCode: number, customMessages?: any): void {
    // ok, which component needs that message?
    switch (httpCode) {
      case 409:
        this.message = customMessages?.e409 ? customMessages.e409 : 'Data conflict!';
        break;
      case 404:
        this.message = customMessages?.e404 ? customMessages.e404 : 'Not found!';
        break;
      case 500:
        this.message = customMessages?.e500 ? customMessages.e500 : 'Something went terribly wrong!';
        break;
      default:
        this.message = 'There was an Error, but I dont know, what it means!';
        break;
    }
    this.snackBar.openFromComponent(CustomSnackBarComponent, {
      panelClass: ['http-error-notification'],
      data: {
        message: this.message
      },
      duration: this.message.length * 100
    });
  }

}
