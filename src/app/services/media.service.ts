import { EventEmitter, Injectable } from '@angular/core';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root',
})
export class MediaService {
  mediaEndedSubject = new EventEmitter<void>();
  mediaCanPlayThrough = new EventEmitter<void>();
  timeUpdate = new EventEmitter<void>();
  private audio = new Audio();
  private video: HTMLVideoElement | null = null;
  private media: HTMLAudioElement | HTMLVideoElement;
  private muted = false;

  private progressionListeners: ((p: number) => void)[] = [];

  private canplaythroughListener = () => this.mediaCanPlayThrough.emit();

  // seeking inside the already buffered range does not reliably fire canplaythrough again
  private seekedListener = () => {
    if (this.media.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      this.mediaCanPlayThrough.emit();
    }
  };

  private endedListener = () => this.mediaEndedSubject.emit();

  private timeUpdateListener = () => {
    this.progressionListeners.forEach((value) => {
      if (!!this.media) {
        value((this.media.currentTime / this.media.duration) * 100);
      }
    });
    this.timeUpdate.emit();
  };

  constructor(private settingsService: SettingsService) {
    this.media = this.audio;
    this.setVolume(settingsService.defaultVolume);
    this.audio.addEventListener('timeupdate', this.timeUpdateListener);
    this.audio.addEventListener('ended', this.endedListener);
    this.audio.addEventListener('canplaythrough', this.canplaythroughListener);
    this.audio.addEventListener('seeked', this.seekedListener);
  }

  play(): Promise<void> {
    return this.media.play();
  }

  pause(): void {
    this.media.pause();
  }

  stop(): void {
    this.media.src = '';
  }

  setVolume(volume: number): void {
    this.media.volume = volume;
  }

  /**
   * Mutes or unmutes the playback independently of the volume. Browsers allow muted playback without user interaction.
   */
  setMuted(muted: boolean): void {
    this.muted = muted;
    this.media.muted = muted;
  }

  getVolume(): number {
    return this.media.volume;
  }

  setSrc(src: string): void {
    this.media.src = src;
  }

  setCurrentTime(currentTime: number): void {
    this.media.currentTime = currentTime;
  }

  getCurrentTime(): number {
    return this.media.currentTime;
  }

  getDuration(): number {
    return this.media.duration;
  }

  isPaused(): boolean {
    return this.media.paused;
  }

  setPlaybackRate(rate: number): void {
    if (this.media.playbackRate !== rate) {
      this.media.playbackRate = rate;
    }
  }

  pauseAtPosition(position: number): void {
    this.media.pause();
    this.setCurrentTime(position / 1000);
  }

  addProgressionListener(callback: (p: number) => void): void {
    this.progressionListeners.push(callback);
  }

  removeProgressionListener(callback: (p: number) => void): void {
    this.progressionListeners = this.progressionListeners.filter((listener) => listener !== callback);
  }

  activateVideoMode(video: HTMLVideoElement) {
    const oldVolume = this.getVolume();

    this.video = video;
    this.media = this.video;
    this.setVolume(oldVolume);
    this.media.muted = this.muted;
    this.video.removeEventListener('timeupdate', this.timeUpdateListener);
    this.video.addEventListener('timeupdate', this.timeUpdateListener);
    this.video.removeEventListener('ended', this.endedListener);
    this.video.addEventListener('ended', this.endedListener);
    this.video.removeEventListener('canplaythrough', this.canplaythroughListener);
    this.video.addEventListener('canplaythrough', this.canplaythroughListener);
    this.video.removeEventListener('seeked', this.seekedListener);
    this.video.addEventListener('seeked', this.seekedListener);
  }

  getProgressionOffsetInSeconds(progressionPercent: number) {
    return progressionPercent * (this.media.duration / 100) - this.media.currentTime;
  }

  activateAudioMode() {
    this.video = null;
    const oldVolume = this.getVolume();
    this.media = this.audio;
    this.setVolume(oldVolume);
    this.media.muted = this.muted;
  }

  isVideoMode() {
    return this.video !== null;
  }
}
