import { EventEmitter, Injectable } from '@angular/core';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root',
})
export class MediaService {
  mediaEndedSubject = new EventEmitter<void>();
  private audio = new Audio();
  private video: HTMLVideoElement | null = null;
  private media: HTMLAudioElement | HTMLVideoElement;

  private progressionListeners: ((p: number) => void)[] = [];

  constructor(private settingsService: SettingsService) {
    this.media = this.audio;
    this.setVolume(settingsService.defaultVolume);
    this.audio.addEventListener('timeupdate', () => {
      this.progressionListeners.forEach((value) =>
        value((this.audio.currentTime / this.audio.duration) * 100)
      );
    });
    this.audio.addEventListener('ended', () => {
      this.mediaEndedSubject.emit();
    });
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

  pauseAtPosition(position: number): void {
    this.media.pause();
    this.setCurrentTime(position / 1000);
  }

  addProgressionListener(callback: (p: number) => void): void {
    this.progressionListeners.push(callback);
  }

  activateVideoMode(video: HTMLVideoElement) {
    this.video = video;
    this.media = this.video;
    this.video.addEventListener('timeupdate', () => {
      this.progressionListeners.forEach((value) =>
        value((this.video.currentTime / this.video.duration) * 100)
      );
    });
    this.video.addEventListener('ended', () => {
      this.mediaEndedSubject.emit();
    });
  }

  getProgressionOffsetInSeconds(progressionPercent) {
    return (
      progressionPercent * (this.media.duration / 100) - this.media.currentTime
    );
  }

  activateAudioMode() {
    this.video = null;
    this.media = this.audio;
  }

  isVideoMode() {
    return this.video !== null;
  }
}
