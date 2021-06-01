import {Injectable} from '@angular/core';

export class Theme {
  className: string;
  displayName: string;

  constructor(className: string, displayName: string) {
    this.className = className;
    this.displayName = displayName;
  }
}

export const availableThemes = [
  new Theme('parrot-theme', 'Parrot'),
  new Theme('turtle-theme', 'Turtle'),
  new Theme('shark-theme', 'Shark'),
];

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  public availableThemes = availableThemes;

  // User Settings
  public currentTheme = availableThemes[0];
  public defaultVolume = 0.1;
}


