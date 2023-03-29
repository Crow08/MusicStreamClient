import { EventEmitter, Injectable } from '@angular/core';
import { SettingsService } from './settings.service';
import videojs from 'video.js';
import { MkvExtractService } from './mkv-extract-service';

@Injectable({
  providedIn: 'root',
})
export class MediaService {
  mediaEndedSubject = new EventEmitter<void>();
  mediaCanPlayThrough = new EventEmitter<void>();
  private audio = new Audio();
  private video: HTMLVideoElement | null = null;
  private media: HTMLAudioElement | HTMLVideoElement;

  private subtitles: any;

  private progressionListeners: ((p: number) => void)[] = [];

  private canplaythroughListener = () => this.mediaCanPlayThrough.emit();

  private endedListener = () => this.mediaEndedSubject.emit();

  private timeUpdateListener = () => {
    this.progressionListeners.forEach((value) => {
      if (!!this.media) {
        value((this.media.currentTime / this.media.duration) * 100);
      }
    });
  };

  constructor(private settingsService: SettingsService, private mkvExtractService: MkvExtractService) {
    this.media = this.audio;
    this.setVolume(settingsService.defaultVolume);
    this.audio.addEventListener('timeupdate', this.timeUpdateListener);
    this.audio.addEventListener('ended', this.endedListener);
    this.audio.addEventListener('canplaythrough', this.canplaythroughListener);
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

  activateVideoMode(video: HTMLVideoElement, src: string) {
    const oldVolume = this.getVolume();
    this.useVideoJSWithSubs(video, src);

    this.video = video;
    this.media = this.video;
    this.setVolume(oldVolume);
    this.video.removeEventListener('timeupdate', this.timeUpdateListener);
    this.video.addEventListener('timeupdate', this.timeUpdateListener);
    this.video.removeEventListener('ended', this.endedListener);
    this.video.addEventListener('ended', this.endedListener);
    this.video.removeEventListener('canplaythrough', this.canplaythroughListener);
    this.video.addEventListener('canplaythrough', this.canplaythroughListener);
  }

  private useVideoJSWithSubs(video: HTMLVideoElement, videoUrl: string, subUrl?: string, fontUrls: string[] = []) {
    const vidOptions = {
      autoplay: false,
      controls: false,
      fluid: true,
      sources: [
        {
          src: videoUrl,
          type: 'video/webm',
        },
      ],
    };
    const subOptions = {
      video: video,
      subUrl: subUrl,
      fonts: fontUrls,
      workerUrl: '/assets/subtitles-octopus/subtitles-octopus-worker.js',
    };

    videojs(video, vidOptions, () => {
      console.log('onPlayerReady', this);
      if (!subUrl) {
        return;
      }
      if (this.subtitles) {
        this.subtitles.dispose();
      }
      // SubtitlesOctopus is an oldschool js lib which is included as a script in index.html
      // @ts-ignore
      this.subtitles = new SubtitlesOctopus(subOptions);
    });
  }

  getProgressionOffsetInSeconds(progressionPercent: number) {
    return progressionPercent * (this.media.duration / 100) - this.media.currentTime;
  }

  activateAudioMode() {
    this.video = null;
    const oldVolume = this.getVolume();
    this.media = this.audio;
    this.setVolume(oldVolume);
  }

  isVideoMode() {
    return this.video !== null;
  }
}
