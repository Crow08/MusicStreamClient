import { EventEmitter, Injectable } from '@angular/core';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root',
})
export class MediaService {
  mediaEndedSubject = new EventEmitter<void>();
  mediaCanPlayThrough = new EventEmitter<void>();
  timeUpdate = new EventEmitter<void>();
  /** Playback stopped because the next frame is not available yet (buffering). */
  mediaWaiting = new EventEmitter<void>();
  /** Playback is running (again), e.g. after buffering. */
  mediaPlaying = new EventEmitter<void>();
  private readonly audio = new Audio();
  /**
   * Owned by this app-wide service like the audio element, so the playback survives navigation. A video element only
   * keeps playing while it is part of the document: it lives in a hidden host and is moved into the page by the
   * components that display it (see attachVideo).
   */
  private readonly video = document.createElement('video');
  private readonly videoHost = document.createElement('div');
  private media: HTMLAudioElement | HTMLVideoElement = this.audio;
  private videoMode = false;
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

  private waitingListener = () => this.mediaWaiting.emit();

  private playingListener = () => this.mediaPlaying.emit();

  private timeUpdateListener = () => {
    this.progressionListeners.forEach((value) => {
      if (!!this.media) {
        value((this.media.currentTime / this.media.duration) * 100);
      }
    });
    this.timeUpdate.emit();
  };

  constructor(private settingsService: SettingsService) {
    this.setVolume(settingsService.defaultVolume);
    this.video.playsInline = true;
    this.video.style.width = '100%';
    this.video.style.height = '100%';
    // hidden but rendered: browsers may stop playing elements that are not rendered
    Object.assign(this.videoHost.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '1px',
      height: '1px',
      overflow: 'hidden',
      opacity: '0',
      pointerEvents: 'none',
    });
    this.videoHost.appendChild(this.video);
    document.body.appendChild(this.videoHost);
    [this.audio, this.video].forEach((element) => this.addListeners(element));
  }

  /** The events are only forwarded for the active element: the other one is not playing. */
  private addListeners(element: HTMLMediaElement): void {
    const forward = (listener: () => void) => () => element === this.media && listener();
    element.addEventListener('timeupdate', forward(this.timeUpdateListener));
    element.addEventListener('ended', forward(this.endedListener));
    element.addEventListener('canplaythrough', forward(this.canplaythroughListener));
    element.addEventListener('seeked', forward(this.seekedListener));
    element.addEventListener('waiting', forward(this.waitingListener));
    element.addEventListener('playing', forward(this.playingListener));
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

  /** Playback position in percent of the duration, 0 while the duration is unknown. */
  getProgression(): number {
    const progression = (this.media.currentTime / this.media.duration) * 100;
    return isFinite(progression) ? progression : 0;
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

  /** Moves the video element into the container (the video keeps playing). */
  attachVideo(container: HTMLElement): void {
    container.insertBefore(this.video, container.firstChild);
  }

  /** Moves the video element back into the hidden host, e.g. when the page that displays it is destroyed. */
  detachVideo(): void {
    this.videoHost.appendChild(this.video);
  }

  get videoElement(): HTMLVideoElement {
    return this.video;
  }

  activateVideoMode(): void {
    this.activate(this.video);
    this.videoMode = true;
  }

  getProgressionOffsetInSeconds(progressionPercent: number) {
    return progressionPercent * (this.media.duration / 100) - this.media.currentTime;
  }

  activateAudioMode(): void {
    this.activate(this.audio);
    this.videoMode = false;
  }

  isVideoMode(): boolean {
    return this.videoMode;
  }

  /** Makes the element the active one: the previous one is cleared, volume and mute state are taken over. */
  private activate(element: HTMLAudioElement | HTMLVideoElement): void {
    if (this.media !== element) {
      const volume = this.getVolume();
      this.stop();
      this.media = element;
      this.setVolume(volume);
    }
    this.media.muted = this.muted;
  }
}
