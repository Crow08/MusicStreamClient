import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { PlayerState } from '../player.component';
import { MediaService } from '../../../services/media.service';
import { debounce, interval, Subject, Subscription } from 'rxjs';

@Component({
  selector: 'app-player-track',
  templateUrl: './player-track.component.html',
  styleUrls: ['./player-track.component.scss'],
})
export class PlayerTrackComponent implements OnInit, OnDestroy {
  progression = 0;
  rawSeek = new Subject<number>();
  @Input()
  playerState!: PlayerState;
  @Output()
  seek = new EventEmitter<number>();

  private seekSubscription: Subscription | null = null;
  private readonly progressionListener = (progression: number) => (this.progression = progression);

  constructor(private mediaService: MediaService) {}

  ngOnInit(): void {
    this.mediaService.addProgressionListener(this.progressionListener);
    this.seekSubscription = this.rawSeek.pipe(debounce(() => interval(250))).subscribe({
      next: (value) => {
        this.seek.emit(this.getJumpOffset(value));
      },
    });
  }

  ngOnDestroy(): void {
    this.mediaService.removeProgressionListener(this.progressionListener);
    this.seekSubscription?.unsubscribe();
  }

  onSeek(value: number) {
    this.rawSeek.next(value);
  }

  getTimeDisplay(): string {
    return `${this.getDurationString(this.mediaService.getCurrentTime())} / ${this.getDurationString(
      this.mediaService.getDuration()
    )}`;
  }

  getDurationString(seconds: number): string {
    if (isNaN(seconds)) {
      return '';
    }
    const date = new Date(0);
    date.setSeconds(seconds); // specify value for SECONDS here
    return date.toISOString().substring(14, 19);
  }

  protected getJumpOffset(seekPercent: number): number {
    return Math.round(this.mediaService.getProgressionOffsetInSeconds(seekPercent) * 1000);
  }
}
