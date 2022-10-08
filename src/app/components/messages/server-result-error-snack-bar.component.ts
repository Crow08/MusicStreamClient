import { Component } from '@angular/core';

@Component({
  selector: 'app-snack-bar-component-upload-result',
  template: `<span class="result-bar"> Error! </span>`,
  styles: [
    `
      :host {
        text-align: center;
        display: block;
      }

      .result-bar {
        color: darkred;
        font-weight: bold;
      }
    `,
  ],
})
export class ServerResultErrorSnackBarComponent {}
