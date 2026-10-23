import { MediaService } from '../../services/media.service';
import { Song } from '../../models/song';
import { Video } from '../../models/video';
import { Chapter } from '../../models/chapter';
import { UserStatus } from '../../models/userStatus';
import { PlayerEngineService } from '../../services/player-engine.service';
import { SettingsService } from '../../services/settings.service';

/** Drift (ms) from which a listener is shown as out of sync, see PlayerEngineService.correctDrift. */
const OUT_OF_SYNC_THRESHOLD = 200;
/**
 * Tolerance (s) when determining the current chapter: after jumping to a chapter, the position may end up slightly
 * before its start, which must not count as the previous chapter.
 */
const CHAPTER_START_TOLERANCE = 0.5;
/** Position (s) in a chapter after which "previous chapter" restarts the current chapter instead. */
const CHAPTER_RESTART_THRESHOLD = 3;

/**
 * Base of the components that display the playback of the session. The playback itself is handled by the app-wide
 * {@link PlayerEngineService}, so it does not depend on which of these components exists.
 */
export abstract class PlayerComponent {
  protected constructor(
    protected readonly engine: PlayerEngineService,
    protected readonly mediaService: MediaService,
    public readonly settingsService: SettingsService
  ) {}

  get sessionUsers() {
    return this.engine.sessionUsers;
  }

  getUserStatus(userId: number): UserStatus | undefined {
    return this.engine.userStatuses.get(userId);
  }

  get currentMedia() {
    return this.engine.currentMedia;
  }

  get userSongRating() {
    return this.engine.userSongRating;
  }

  get songRating() {
    return this.engine.songRating;
  }

  get playerState() {
    return this.engine.playerState;
  }

  get loopMode() {
    return this.engine.loopMode;
  }

  get history() {
    return this.engine.history;
  }

  get queue() {
    return this.engine.queue;
  }

  get thumbnailUrl() {
    return this.engine.thumbnailUrl;
  }

  get chapters() {
    return this.engine.chapters;
  }

  get playbackHint() {
    return this.engine.playbackHint;
  }

  publishCommand(name: string): void {
    this.engine.publishCommand(name);
  }

  /** Starts, resumes or pauses the playback, depending on the state. */
  togglePlayback(): void {
    this.publishCommand(this.playerState === 'STOP' ? 'start' : this.playerState === 'PAUSE' ? 'resume' : 'pause');
  }

  onRating(rating: number): void {
    this.engine.onRating(rating);
  }

  setVolume(value: number): void {
    this.mediaService.setVolume(value);
  }

  getVolume(): number {
    return this.mediaService.getVolume();
  }

  isVideoMode(): boolean {
    return this.mediaService.isVideoMode();
  }

  removeSongFromQueueOrHistory(queueIndex: number, type: string, mediaId: number): void {
    // the index may be outdated on the server when others change the queue, so the media id is sent along
    this.publishCommand(`deleteMediaFromQueue/${queueIndex}/${type}/${mediaId}`);
  }

  /**
   * Moves a media within the playlist.
   * @param previousIndex index in the combined list of history, current media and queue
   * @param currentIndex target index in the same list
   */
  moveMedia(previousIndex: number, currentIndex: number): void {
    const history = this.history;
    const media = previousIndex < history.length ? history[previousIndex] : this.queue[previousIndex - history.length - 1];
    if (!media || previousIndex === currentIndex) {
      return;
    }
    this.publishCommand(`movedMedia/${previousIndex}/to/${currentIndex}/${media.id}`);
  }

  /**
   * Jumps to a media in the history or queue.
   * @param index index in the combined list of history, current media and queue
   * @param mediaId the media at that index, selects the right media if the index is outdated
   */
  jumpTo(index: number, mediaId: number) {
    this.publishCommand(`skipTo/${index}/${mediaId}`);
  }

  protected jumpOffset(offset: number) {
    this.publishCommand(`jump/${offset}`);
  }

  /** Jumps forward by the time skip length of the settings. */
  timeSkip() {
    this.jumpOffset(this.settingsService.defaultTimeSkipLength * 1000);
  }

  /** Index of the chapter at the current position, -1 without chapters or before the first one. */
  getCurrentChapterIndex(): number {
    const time = this.mediaService.getCurrentTime() + CHAPTER_START_TOLERANCE;
    let index = -1;
    this.chapters.forEach((chapter, i) => {
      if (chapter.start <= time) {
        index = i;
      }
    });
    return index;
  }

  getNextChapter(): Chapter | undefined {
    return this.chapters[this.getCurrentChapterIndex() + 1];
  }

  isLastChapter(): boolean {
    return this.getCurrentChapterIndex() >= this.chapters.length - 1;
  }

  jumpToChapter(chapter: Chapter | undefined): void {
    if (chapter) {
      this.jumpOffset(Math.round((chapter.start - this.mediaService.getCurrentTime()) * 1000));
    }
  }

  nextChapter(): void {
    this.jumpToChapter(this.getNextChapter());
  }

  /** Restarts the current chapter, or goes to the previous one when the current chapter has just started. */
  previousChapter(): void {
    const index = this.getCurrentChapterIndex();
    const current = this.chapters[index];
    if (!current) {
      return;
    }
    const restart = this.mediaService.getCurrentTime() - current.start > CHAPTER_RESTART_THRESHOLD || index === 0;
    this.jumpToChapter(restart ? current : this.chapters[index - 1]);
  }

  protected getSubTitle() {
    return this.currentMedia.type == 'SONG'
      ? (this.currentMedia as Song).artist?.name
      : (this.currentMedia as Video).series?.name;
  }

  getStateIcon(status: UserStatus | undefined): string {
    switch (status?.state) {
      case 'READY':
        return 'check_circle';
      case 'LOADING':
        return 'hourglass_empty';
      case 'UNAVAILABLE':
        return 'block';
      default:
        return 'radio_button_unchecked';
    }
  }

  getStateText(status: UserStatus | undefined): string {
    switch (status?.state) {
      case 'READY':
        return 'Ready';
      case 'LOADING':
        return 'Loading / buffering';
      case 'IDLE':
        return 'No media loaded';
      case 'UNAVAILABLE':
        return 'Can not play the current media (e.g. Spotify not connected)';
      default:
        return 'Status unknown';
    }
  }

  formatLatency(status: UserStatus | undefined): string {
    return `${status?.latency ?? '–'} ms`;
  }

  /** The drift is only known while the user is playing. */
  hasDrift(status: UserStatus | undefined): boolean {
    return status?.drift != null;
  }

  isOutOfSync(status: UserStatus | undefined): boolean {
    return status?.drift != null && Math.abs(status.drift) >= OUT_OF_SYNC_THRESHOLD;
  }

  /** Formats the drift as signed seconds or ms, positive: behind the session. */
  formatDrift(drift: number): string {
    const sign = drift > 0 ? '+' : drift < 0 ? '-' : '±';
    const abs = Math.abs(drift);
    return abs >= 1000 ? `${sign}${(abs / 1000).toFixed(1)} s` : `${sign}${abs} ms`;
  }

  /** Formats seconds as m:ss or h:mm:ss. */
  formatTime(seconds: number): string {
    const total = Math.floor(seconds);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const ss = String(total % 60).padStart(2, '0');
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
  }
}
