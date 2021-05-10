import {Component, ViewChild} from '@angular/core';
import {FormBuilder, FormGroup} from '@angular/forms';
import {Song} from 'src/app/models/song';
import {HttpHelperService} from '../../../services/http-helper.service';
import {MatPaginator} from '@angular/material/paginator';
import {ObjectSelectInputData} from '../../util/object-select/object-select.component';
import {Artist} from 'src/app/models/artist';
import {Genre} from 'src/app/models/genre';
import {GenericDataObject} from 'src/app/models/genericDataObject';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ServerResultNoSearchResultSnackBarComponent} from '../../messages/server-result-no-search-result-snack-bar.component';
import {SelectionModel} from '@angular/cdk/collections';
import {from, merge, Observable, of} from 'rxjs';
import {catchError, delay, startWith, switchMap, tap} from 'rxjs/operators';
import {MatSort} from '@angular/material/sort';
import {ServerResultErrorSnackBarComponent} from '../../messages/server-result-error-snack-bar.component';


@Component({
  selector: 'app-database-browser',
  templateUrl: './database-browser.component.html',
  styleUrls: ['./database-browser.component.scss']
})
export class DatabaseBrowserComponent {
  isLoadingResults = false;
  currentSongData: Song[] = [];

  constructor(private formBuilder: FormBuilder,
              private httpHelperService: HttpHelperService,
              private snackBar: MatSnackBar) {
  }

  dataSource: Observable<Song[]>;
  displayedColumns: string[] = ['select', 'title', 'album', 'artist', 'genre', 'menu'];
  modeSelect;
  dataBaseData: ObjectSelectInputData;
  selectedOptions: GenericDataObject[] = [];
  selection = new SelectionModel<Song>(true, []);

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  searchQuery: FormGroup = this.formBuilder.group({
    searchObject: ['song', {updateOn: 'change'}],
    searchKeyword: [undefined, {updateOn: 'change'}],
  });

  onSelectionChange(): void {
    this.dataSource = of([]);
    this.selectedOptions = [];
    switch (this.modeSelect) {
      case 'artist':
        this.httpHelperService.getArray('/artists/all', Artist)
          .then((artists) => {
            this.dataBaseData = new ObjectSelectInputData('Artist', artists.map(artist => new GenericDataObject(artist.id, artist.name)));
          });
        break;
        case 'genre':
          this.httpHelperService.getArray('/genres/all', Genre)
            .then((genres) => {
              this.dataBaseData = new ObjectSelectInputData('Genre', genres.map(genre => new GenericDataObject(genre.id, genre.name)));
            });
          break;
      default:
    }
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.currentSongData.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle(): void {
    this.isAllSelected() ?
      this.selection.clear() :
      this.currentSongData.forEach(row => this.selection.select(row));
  }

  submitSearch(): void {
    this.dataSource = merge(this.sort.sortChange, this.paginator.page)
      .pipe(
        startWith({}),
        delay(0),
        switchMap(() => {
          this.isLoadingResults = true;
          let searchQuery: Promise<Song[]>;
          let searchArray = this.selectedOptions.map(song => song.id);
          switch (this.searchQuery.value.searchObject) {
            case 'song':
              if (this.searchQuery.value.searchKeyword !== null && this.searchQuery.value.searchKeyword !== ''){
                searchQuery = this.httpHelperService.getArray(`/songs/getSongsByKeyword/${this.searchQuery.value.searchKeyword}?sort=${this.sort.active}&order=${this.sort.direction}&page=${this.paginator.pageIndex}&pagesize=${this.paginator.pageSize}`, Song);
              }else{
                searchQuery = this.httpHelperService.getArray(`/songs/all?sort=${this.sort.active}&order=${this.sort.direction}&page=${this.paginator.pageIndex}&pagesize=${this.paginator.pageSize}`, Song);
              }
              break;
            case 'artist':
              searchArray = this.selectedOptions.map(song => song.id);
              searchQuery = this.httpHelperService.getArray(`/songs/getSongsByArtist/${searchArray}?sort=${this.sort.active}&order=${this.sort.direction}&page=${this.paginator.pageIndex}&pagesize=${this.paginator.pageSize}`, Song);
              break;
            case 'genre':
              searchArray = this.selectedOptions.map(song => song.id);
              searchQuery = this.httpHelperService.getArray(`/songs/getSongsByGenre/${searchArray}?sort=${this.sort.active}&order=${this.sort.direction}&page=${this.paginator.pageIndex}&pagesize=${this.paginator.pageSize}`, Song);
              break;
            default:
          }
          return from(searchQuery);
        }),
        tap(songs => {
          // Flip flag to show that loading has finished.
          if (!!songs) {
            if (songs.length === 0) {
              this.snackBar.openFromComponent(ServerResultNoSearchResultSnackBarComponent, {
                duration: 5000,
                panelClass: ['no-result-snackbar']
              });
            }
            this.currentSongData = songs;
          }
          this.isLoadingResults = false;
        }),
        catchError(() => {
          this.snackBar.openFromComponent(ServerResultErrorSnackBarComponent, {
            duration: 5000
          });
          this.isLoadingResults = false;
          return of([]);
        })
      );
  }

  resetPaging(): void {
    this.paginator.pageIndex = 0;
  }
}
