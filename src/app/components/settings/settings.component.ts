import { Component } from '@angular/core';
import { SettingsService, SPOTIFY_DEFAULT_LATENCY, Theme } from '../../services/settings.service';
import { SpotifyService } from '../../services/spotify.service';
import { SpotifyPlayerService } from '../../services/spotify-player.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent {
  availableThemes: Theme[];
  readonly spotifyDefaultLatency = SPOTIFY_DEFAULT_LATENCY;
  readonly spotifyAuthUrl = this.spotifyService.getAuthUrl();

  constructor(
    private settingsService: SettingsService,
    private spotifyService: SpotifyService,
    public spotifyPlayer: SpotifyPlayerService
  ) {
    this.availableThemes = settingsService.availableThemes;
  }

  get spotifyLoggedIn(): boolean {
    return this.spotifyService.loggedIn || this.spotifyService.canRestore;
  }

  /** Connects the Spotify player of this browser; has to be called by a click, browsers only play after a gesture. */
  connectSpotify(): void {
    this.spotifyPlayer.connect().then((connected) => connected && this.spotifyPlayer.activateElement());
  }

  disconnectSpotify(): void {
    this.spotifyPlayer.disconnect();
    this.spotifyService.logout();
  }

  getSpotifyLatencyCorrection(): number {
    return this.settingsService.spotifyLatencyCorrection;
  }

  getSpotifyLatency(): number {
    return this.settingsService.spotifyLatency;
  }

  setSpotifyLatencyCorrection(target: EventTarget | null): void {
    if (target instanceof HTMLInputElement && target.value !== '' && isFinite(Number(target.value))) {
      this.settingsService.spotifyLatencyCorrection = Number(target.value);
    }
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

  getVolumePercent(value: string) {
    return Math.round(Number(value) * 2 * 100);
  }
}
