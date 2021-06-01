import { Component, OnInit } from '@angular/core';
import {SettingsService, Theme} from '../../../services/settings.service';
import {MatSliderChange} from '@angular/material/slider';

@Component({
  selector: 'app-site-options-dialog',
  templateUrl: './site-options-dialog.component.html',
  styleUrls: ['./site-options-dialog.component.scss'],
})
export class SiteOptionsDialogComponent implements OnInit {
  currentTheme: Theme;
  availableThemes: Theme[];
  volumeLabel(value: number): string {
    return Math.round((value / 0.4) * 100) + '%';
  }

  constructor(private settingsService: SettingsService) {
    this.currentTheme = settingsService.currentTheme;
    this.availableThemes = settingsService.availableThemes;
  }

  ngOnInit(): void {}

  selectTheme(theme: Theme): void {
    this.settingsService.currentTheme = theme;
  }

  setVolume(event: MatSliderChange): void {
    this.settingsService.defaultVolume = event.value;
  }
}
