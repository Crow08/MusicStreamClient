import { CustomSnackBarComponent } from "./custom-snack-bar.component";
import { MatSnackBar } from '@angular/material/snack-bar';
import { Injectable } from "@angular/core";


@Injectable({
    providedIn: 'root'
  })

export class HttpCodeMessageGenerator {

    constructor(private snackBar: MatSnackBar) { }
    message: String;

    public calculateReturnCodeMessage(httpCode: number, component: String): void {
        //ok, which component needs that message?
        switch (component) {
            case "addSongToPlaylist":
                switch (httpCode) {
                    case 409:
                        this.message = "Duplicate Song! Try for more variety!";
                        break;
                    case 404:
                        // Anweisungen werden ausgeführt,
                        // falls expression mit value2 übereinstimmt
                        break;
                    case 0:
                        // Anweisungen werden ausgeführt,
                        // falls expression mit valueN übereinstimmt
                        break;
                    default:
                        this.message = "There was an Error, but I dont know, what it means!";
                        break;
                }
                break;
            //that were all implemented components
            default:
                this.message = "Hi, I am a message, that wasn´t defined!";
                break;
        }

        this.snackBar.openFromComponent(CustomSnackBarComponent, {
            data: {
                theme: "true",
                message: this.message
            },
            duration: 60000
        });
    }

}
