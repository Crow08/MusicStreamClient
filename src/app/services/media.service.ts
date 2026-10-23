import { EventEmitter, Injectable } from '@angular/core';
import { SettingsService } from './settings.service';
import { SpotifyPlayerService } from './spotify-player.service';

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
  /** The Spotify player is the active one, not an element. */
  private spotifyMode = false;
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
    const progression = this.getProgression();
    this.progressionListeners.forEach((value) => value(progression));
    this.timeUpdate.emit();
  };

  constructor(private settingsService: SettingsService, private spotifyPlayer: SpotifyPlayerService) {
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
    // the Spotify player reports like an element, but only while it is the active one
    const spotify = (listener: () => void) => () => this.spotifyMode && listener();
    this.spotifyPlayer.tick.subscribe(spotify(this.timeUpdateListener));
    this.spotifyPlayer.ended.subscribe(spotify(this.endedListener));
    this.spotifyPlayer.playing.subscribe(spotify(this.playingListener));
  }

  /**
   * Delay (ms) between the call of play() and the audible start: the Spotify player starts audibly later than the call, so
   * the call has to be made that much earlier. Zero for the elements.
   */
  get startLatency(): number {
    return this.spotifyMode ? this.settingsService.spotifyLatency : 0;
  }

  /** The Spotify player can not change its speed: a drift can only be corrected by seeking. */
  get supportsPlaybackRate(): boolean {
    return !this.spotifyMode;
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
    return this.spotifyMode ? this.spotifyPlayer.resume() : this.media.play();
  }

  pause(): void {
    if (this.spotifyMode) {
      this.spotifyPlayer.pause().catch(console.error);
    } else {
      this.media.pause();
    }
  }

  stop(): void {
    if (this.spotifyMode) {
      this.spotifyPlayer.pause().catch(console.error);
    } else {
      this.media.src = '';
    }
  }

  setVolume(volume: number): void {
    if (this.spotifyMode) {
      this.spotifyPlayer.setVolume(volume);
    } else {
      this.media.volume = volume;
    }
  }

  /**
   * Mutes or unmutes the playback independently of the volume. Browsers allow muted playback without user interaction.
   */
  setMuted(muted: boolean): void {
    this.muted = muted;
    this.media.muted = muted;
    this.spotifyPlayer.setMuted(muted);
  }

  getVolume(): number {
    return this.spotifyMode ? this.spotifyPlayer.getVolume() : this.media.volume;
  }

  setSrc(src: string): void {
    this.media.src = src;
  }

  /**
   * Seeks. The Spotify player reports a position that runs the start latency ahead of what is audible (the audio starts
   * that long after the counter): a paused player is set to the position itself, a playing one that much further.
   */
  setCurrentTime(currentTime: number): void {
    if (!this.spotifyMode) {
      this.media.currentTime = currentTime;
      return;
    }
    const paused = this.spotifyPlayer.isPaused();
    const position = Math.round(currentTime * 1000 + (paused ? 0 : this.startLatency));
    this.spotifyPlayer
      .seek(position)
      .then(() => {
        // like seeked of an element: a prepared position is reported as ready
        if (paused) {
          this.mediaCanPlayThrough.emit();
        }
      })
      .catch(console.error);
  }

  /**
   * Pauses at the position and reports ready (canplaythrough) once it is reached, as the seeked event of an element does.
   * The Spotify player has to be paused first: it only reports a paused position as prepared.
   */
  prepareAt(seconds: number): void {
    if (!this.spotifyMode) {
      this.media.currentTime = seconds;
      this.media.pause();
      return;
    }
    this.spotifyPlayer
      .pauseAt(Math.round(seconds * 1000))
      .then(() => this.mediaCanPlayThrough.emit())
      .catch(console.error);
  }

  /** The audible position in seconds. */
  getCurrentTime(): number {
    if (!this.spotifyMode) {
      return this.media.currentTime;
    }
    const position = this.spotifyPlayer.getPositionMs() - (this.spotifyPlayer.isPaused() ? 0 : this.startLatency);
    return position / 1000;
  }

  /** Playback position in percent of the duration, 0 while the duration is unknown. */
  getProgression(): number {
    const progression = (this.getCurrentTime() / this.getDuration()) * 100;
    return isFinite(progression) ? progression : 0;
  }

  getDuration(): number {
    return this.spotifyMode ? this.spotifyPlayer.getDurationMs() / 1000 : this.media.duration;
  }

  isPaused(): boolean {
    return this.spotifyMode ? this.spotifyPlayer.isPaused() : this.media.paused;
  }

  setPlaybackRate(rate: number): void {
    if (!this.spotifyMode && this.media.playbackRate !== rate) {
      this.media.playbackRate = rate;
    }
  }

  pauseAtPosition(position: number): void {
    if (this.spotifyMode) {
      this.spotifyPlayer.pauseAt(position).catch(console.error);
      return;
    }
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
    return progressionPercent * (this.getDuration() / 100) - this.getCurrentTime();
  }

  /**
   * Makes the Spotify player the active one and loads the track paused at the start position, like setSrc of an element.
   * Resolves to whether the player is ready to play it.
   */
  async loadSpotify(uri: string, startSeconds: number): Promise<boolean> {
    this.activateSpotifyMode();
    try {
      this.spotifyPlayer.setMuted(this.muted);
      await this.spotifyPlayer.load(uri, Math.round(startSeconds * 1000));
      this.mediaCanPlayThrough.emit();
      return true;
    } catch (error) {
      console.error('Spotify track could not be loaded', error);
      return false;
    }
  }

  activateSpotifyMode(): void {
    if (!this.spotifyMode) {
      const volume = this.getVolume();
      this.stop();
      this.spotifyMode = true;
      this.videoMode = false;
      this.spotifyPlayer.setVolume(volume);
    }
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
    if (this.spotifyMode || this.media !== element) {
      const volume = this.getVolume();
      this.stop();
      this.spotifyMode = false;
      this.media = element;
      this.setVolume(volume);
    }
    this.media.muted = this.muted;
  }
}
