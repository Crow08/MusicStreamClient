/** IDLE: no media loaded, LOADING: loading or buffering the media, READY: the media can be played. */
export type UserState = 'IDLE' | 'LOADING' | 'READY';

/** Playback status of a session user, reported by its client. */
export interface UserStatus {
  userId: number;
  state: UserState;
  /** Average round trip time to the server in ms, null if not measured yet. */
  latency: number | null;
  /** Expected minus actual playback position in ms (positive: behind the session), null if not playing. */
  drift: number | null;
}
