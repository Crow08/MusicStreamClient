import {Component} from '@angular/core';

@Component({
  selector: 'app-snack-bar-component-database-search-result',
  template: `<span class="result-bar">
    Didn´t find the thing you were looking for. Feel free to add it!
  </span>`,
  styles: [`
    :host {
      text-align: center;
      display: block;
    }

    .result-bar {
      color: darkred;
      font-weight: bold;
    }
  `],
})
export class ServerResultNoSearchResultSnackBarComponent {
}
