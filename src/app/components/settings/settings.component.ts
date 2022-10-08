import { Component, OnInit } from '@angular/core';
import { SettingsService, Theme } from '../../services/settings.service';
import { MatSliderChange } from '@angular/material/slider';

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

  setVolume(event: MatSliderChange): void {
    this.settingsService.defaultVolume = event.value;
  }

  getCurrentTheme(): Theme {
    return this.settingsService.currentTheme;
  }

  getDefaultVolume(): number {
    return this.settingsService.defaultVolume;
  }
}
