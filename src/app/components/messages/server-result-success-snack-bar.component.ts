import {Component} from '@angular/core';

@Component({
  selector: 'app-snack-bar-component-upload-result',
  template: `<span class="result-bar"> Success! </span>`,
  styles: [
    `
      :host {
        text-align: center;
        display: block;
      }

      .result-bar {
        color: darkgreen;
        font-weight: bold;
      }
    `,
  ],
})
export class ServerResultSuccessSnackBarComponent {
}
