///<reference types="@types/spotify-web-playback-sdk"/>
import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { SpotifyService } from './spotify.service';

const SDK_URL = 'https://sdk.scdn.co/spotify-player.js';
/** Interval (ms) in which the position is read while connected, drives the time updates. */
const POLL_INTERVAL = 250;
/** Playback (ms) after which a started track counts as loaded: the SDK ignores a pause right at the start. */
const LOADED_AFTER = 800;
const SEEK_TOLERANCE = 1500;
const WAIT_TIMEOUT = 10000;
/** A track has ended when it stops at the start after it was playing this close (ms) to its end. */
const END_TOLERANCE = 3000;

export type SpotifyConnection = 'disconnected' | 'connecting' | 'connected' | 'unavailable';

/**
 * The Spotify Web Playback SDK as a player of the session. The SDK reports its state, but not when the audio becomes
 * audible: a start is prepared by loading the track paused and resumed ahead of time (see MediaService, spotifyLatency).
 * Needs a Spotify Premium account, every listener plays with their own.
 */
@Injectable({
  providedIn: 'root',
})
export class SpotifyPlayerService {
  readonly connection = new BehaviorSubject<SpotifyConnection>('disconnected');
  /** Why the player is not available, empty while it is. */
  readonly error = new BehaviorSubject<string>('');
  readonly ended = new Subject<void>();
  readonly tick = new Subject<void>();
  readonly playing = new Subject<void>();
  /** The browser blocked the playback: the user has to interact with the page first (see activateElement). */
  readonly autoplayFailed = new Subject<void>();

  private player: Spotify.Player | undefined;
  private connecting: Promise<boolean> | undefined;
  private state: Spotify.PlaybackState | null = null;
  /** performance.now() when the state was received: the position of a playing track is extrapolated from it. */
  private stateTime = 0;
  private lastPlayingPosition = 0;
  private volume = 0.1;
  private muted = false;
  private stateWaiters: ((state: Spotify.PlaybackState) => boolean)[] = [];
  private pollTimer: ReturnType<typeof setInterval> | undefined;

  constructor(private spotifyService: SpotifyService) {}

  get connected(): boolean {
    return this.connection.value === 'connected';
  }

  /** Connects the player; resolves to whether it can play. Safe to call repeatedly. */
  connect(): Promise<boolean> {
    if (this.connected) {
      return Promise.resolve(true);
    }
    if (!this.connecting) {
      this.connecting = this.doConnect().finally(() => (this.connecting = undefined));
    }
    return this.connecting;
  }

  disconnect(): void {
    clearInterval(this.pollTimer);
    this.player?.disconnect();
    this.player = undefined;
    this.state = null;
    this.spotifyService.deviceId = '';
    this.connection.next('disconnected');
  }

  /** Browsers only start the audio of the player after a user gesture: call it from a click handler. */
  activateElement(): void {
    this.player?.activateElement().catch(console.error);
  }

  /**
   * Loads the track and leaves it paused at the position, so that resume() starts it right away. The SDK only pauses a
   * track that is really playing, so it is started silently first.
   */
  async load(uri: string, positionMs: number): Promise<void> {
    const player = this.requirePlayer();
    this.lastPlayingPosition = 0;
    await player.setVolume(0);
    try {
      const playing = this.waitForState((state) => !state.paused && state.position >= positionMs + LOADED_AFTER);
      const response = await this.spotifyService.play(uri, positionMs);
      if (!response.ok) {
        throw new Error(`Spotify answered ${response.status}`);
      }
      await playing;
      await this.pauseAt(positionMs);
    } finally {
      await player.setVolume(this.effectiveVolume);
    }
  }

  async resume(): Promise<void> {
    await this.requirePlayer().resume();
  }

  async pause(): Promise<void> {
    if (this.player && this.state && !this.state.paused) {
      await this.player.pause();
    }
  }

  /** Pauses and seeks, resolves once the player shows the position. */
  async pauseAt(positionMs: number): Promise<void> {
    const player = this.requirePlayer();
    if (this.state && !this.state.paused) {
      const paused = this.waitForState((state) => state.paused);
      await player.pause();
      await paused;
    }
    await this.seek(positionMs);
  }

  async seek(positionMs: number): Promise<void> {
    const reached = this.waitForState((state) => Math.abs(state.position - positionMs) < SEEK_TOLERANCE);
    await this.requirePlayer().seek(positionMs);
    await reached;
  }

  /** The position (ms) the SDK reports; it runs ahead of what is audible, see MediaService. */
  getPositionMs(): number {
    if (!this.state) {
      return 0;
    }
    return this.state.paused ? this.state.position : this.state.position + (performance.now() - this.stateTime);
  }

  getDurationMs(): number {
    return this.state?.duration ?? NaN;
  }

  isPaused(): boolean {
    return this.state?.paused ?? true;
  }

  getVolume(): number {
    return this.volume;
  }

  setVolume(volume: number): void {
    this.volume = volume;
    this.player?.setVolume(this.effectiveVolume).catch(console.error);
  }

  /** Mutes without changing the volume, e.g. while the browser only allows muted playback. */
  setMuted(muted: boolean): void {
    this.muted = muted;
    this.player?.setVolume(this.effectiveVolume).catch(console.error);
  }

  private get effectiveVolume(): number {
    return this.muted ? 0 : this.volume;
  }

  private async doConnect(): Promise<boolean> {
    this.connection.next('connecting');
    this.error.next('');
    if (!(await this.spotifyService.restore())) {
      return this.fail('Not logged in to Spotify');
    }
    try {
      await this.loadSdk();
    } catch (error) {
      return this.fail('The Spotify player could not be loaded');
    }
    const player = new Spotify.Player({
      name: 'StreamSync',
      getOAuthToken: (callback) => callback(this.spotifyService.loginToken.token),
      volume: this.effectiveVolume,
    });
    // the audio of the player is only allowed after a gesture: the click that asked for the connection is still valid now
    if (navigator.userActivation?.isActive) {
      player.activateElement().catch(console.error);
    }
    player.addListener('player_state_changed', (state) => this.onState(state));
    player.addListener('autoplay_failed', () => this.autoplayFailed.next());
    player.addListener('account_error', () => this.fail('Spotify Premium is required'));
    player.addListener('authentication_error', () => this.fail('Spotify login failed, please log in again'));
    player.addListener('initialization_error', () => this.fail('This browser can not play Spotify (EME)'));
    player.addListener('playback_error', ({ message }) => console.error(`Spotify playback error: ${message}`));
    const ready = new Promise<string>((resolve) => player.addListener('ready', ({ device_id }) => resolve(device_id)));
    if (!(await player.connect())) {
      return this.fail('The Spotify player could not connect');
    }
    const deviceId = await Promise.race([ready, new Promise<string>((resolve) => setTimeout(() => resolve(''), WAIT_TIMEOUT))]);
    if (!deviceId) {
      return this.fail('The Spotify player did not become ready');
    }
    this.player = player;
    this.spotifyService.deviceId = deviceId;
    this.pollTimer = setInterval(() => this.poll(), POLL_INTERVAL);
    this.connection.next('connected');
    return true;
  }

  private fail(message: string): boolean {
    this.error.next(message);
    this.connection.next('unavailable');
    return false;
  }

  private requirePlayer(): Spotify.Player {
    if (!this.player || !this.connected) {
      throw new Error(this.error.value || 'The Spotify player is not connected');
    }
    return this.player;
  }

  private async poll(): Promise<void> {
    const state = await this.player?.getCurrentState();
    if (state && !state.paused) {
      this.receive(state);
      this.tick.next();
    }
  }

  private onState(state: Spotify.PlaybackState | null): void {
    if (!state) {
      // the playback was moved to another device of the account
      this.state = null;
      return;
    }
    if (state.paused && state.position < 1000 && this.lastPlayingPosition > state.duration - END_TOLERANCE) {
      this.lastPlayingPosition = 0;
      this.receive(state);
      this.ended.next();
      return;
    }
    this.receive(state);
    if (!state.paused) {
      this.playing.next();
    }
    this.stateWaiters = this.stateWaiters.filter((waiter) => !waiter(state));
  }

  private receive(state: Spotify.PlaybackState): void {
    this.state = state;
    this.stateTime = performance.now();
    if (!state.paused) {
      this.lastPlayingPosition = state.position;
    }
  }

  /** Resolves with the first state event that matches; the wait has to start before the action that causes the event. */
  private waitForState(matches: (state: Spotify.PlaybackState) => boolean): Promise<Spotify.PlaybackState> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.stateWaiters = this.stateWaiters.filter((entry) => entry !== waiter);
        reject(new Error('The Spotify player did not answer in time'));
      }, WAIT_TIMEOUT);
      const waiter = (state: Spotify.PlaybackState) => {
        if (!matches(state)) {
          return false;
        }
        clearTimeout(timer);
        resolve(state);
        return true;
      };
      this.stateWaiters.push(waiter);
    });
  }

  private loadSdk(): Promise<void> {
    if ((window as any).Spotify) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      (window as any).onSpotifyWebPlaybackSDKReady = () => resolve();
      const script = document.createElement('script');
      script.src = SDK_URL;
      script.onerror = () => reject(new Error('The Spotify SDK could not be loaded'));
      document.body.appendChild(script);
    });
  }
}
