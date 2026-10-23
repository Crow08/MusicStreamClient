/**
 * IDLE: no media loaded, LOADING: loading or buffering the media, READY: the media can be played, UNAVAILABLE: the media
 * can not be played by this client (e.g. a Spotify song without a connected Spotify Premium account).
 */
export type UserState = 'IDLE' | 'LOADING' | 'READY' | 'UNAVAILABLE';

/** Playback status of a session user, reported by its client. */
export interface UserStatus {
  userId: number;
  state: UserState;
  /** Median round trip time to the server in ms (see ClockSyncService), null if not measured yet. */
  latency: number | null;
  /** Expected minus actual playback position in ms (positive: behind the session), null if not playing. */
  drift: number | null;
}
