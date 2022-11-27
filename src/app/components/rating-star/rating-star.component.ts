import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ThemePalette } from '@angular/material/core';

@Component({
  selector: 'app-rating-star',
  templateUrl: './rating-star.component.html',
  styleUrls: ['./rating-star.component.scss'],
})
export class RatingStarComponent implements OnInit {
  @Input() currentRating!: number;
  @Input() songRating!: number;
  @Output() rating = new EventEmitter<number>();

  maxRating = 5;
  colors: ThemePalette[] = [];

  ngOnInit(): void {
    this.resetColors();
  }

  public setRatingValue(newRating: number): void {
    this.currentRating = newRating;
    this.rating.emit(this.currentRating);
  }

  startHover(value: number): void {
    this.resetColors();
    for (let i = 0; i <= value; i++) {
      this.colors[i] = 'primary';
    }
  }

  endHover(e: MouseEvent): void {
    if (!!e && !!e.relatedTarget && (e.relatedTarget as Element).localName !== 'mat-icon') {
      this.resetColors();
    }
  }

  private resetColors(): void {
    for (let i = 0; i < Number(this.maxRating); i++) {
      this.colors[i] = 'accent';
    }
  }
}
