import { Component } from '@angular/core';
import { SettingsService, Theme } from '../../services/settings.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent {
  availableThemes: Theme[];

  constructor(private settingsService: SettingsService) {
    this.availableThemes = settingsService.availableThemes;
  }

  volumeLabel(value: number): string {
    return Math.round((value / 0.4) * 100) + '%';
  }

  selectTheme(theme: Theme): void {
    this.settingsService.currentTheme = theme;
  }

  setVolume(value: number): void {
    this.settingsService.defaultVolume = value;
  }

  getCurrentTheme(): Theme {
    return this.settingsService.currentTheme;
  }

  getDefaultVolume(): number {
    return this.settingsService.defaultVolume;
  }
  getCurrentTimeSkipLength(): number {
    return this.settingsService.defaultTimeSkipLength;
  }
  setCurrentTimeSkipLength(target: EventTarget | null): void {
    if (target != null && target instanceof HTMLInputElement) {
      this.settingsService.defaultTimeSkipLength = Number(target.value);
    }
  }
}
