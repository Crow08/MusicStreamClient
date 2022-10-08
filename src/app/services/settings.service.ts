import { Injectable } from '@angular/core';

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

  get currentTheme(): Theme {
    const index = localStorage.getItem('msc_currentTheme');
    return availableThemes[index === null ? 0 : index];
  }

  set currentTheme(theme: Theme) {
    localStorage.setItem(
      'msc_currentTheme',
      String(availableThemes.findIndex((t) => t.className === theme.className))
    );
  }

  get defaultVolume(): number {
    const value = localStorage.getItem('msc_defaultVolume');
    return value === null ? 0.1 : Number(value);
  }

  set defaultVolume(value: number) {
    localStorage.setItem('msc_defaultVolume', String(value));
  }
}
