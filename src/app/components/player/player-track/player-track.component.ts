import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { PlayerState } from '../player.component';
import { MatSliderChange } from '@angular/material/slider';
import { MediaService } from '../../../services/media.service';
import { debounce, interval, Subject } from 'rxjs';

@Component({
  selector: 'app-player-track',
  templateUrl: './player-track.component.html',
  styleUrls: ['./player-track.component.scss'],
})
export class PlayerTrackComponent implements OnInit {
  progression: number;
  rawSeek = new Subject<number>();
  @Input()
  playerState: PlayerState;
  @Output()
  seek = new EventEmitter<number>();

  constructor(private mediaService: MediaService) {}

  ngOnInit(): void {
    this.mediaService.addProgressionListener(
      (progression) => (this.progression = progression)
    );
    this.rawSeek.pipe(debounce(() => interval(250))).subscribe({
      next: (value) => {
        this.seek.emit(this.getJumpOffset(value));
      },
    });
  }

  onSeek({ value }: MatSliderChange) {
    this.rawSeek.next(value);
  }

  getTimeDisplay(): string {
    return `${this.getDurationString(
      this.mediaService.getCurrentTime()
    )} / ${this.getDurationString(this.mediaService.getDuration())}`;
  }

  protected getJumpOffset(seekPercent): number {
    return Math.round(
      this.mediaService.getProgressionOffsetInSeconds(seekPercent) * 1000
    );
  }

  getDurationString(seconds: number): string {
    if (isNaN(seconds)) {
      return '';
    }
    const date = new Date(0);
    date.setSeconds(seconds); // specify value for SECONDS here
    return date.toISOString().substring(14, 19);
  }
}
