import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';
import {FormGroup, FormBuilder} from '@angular/forms';
import {Song} from 'src/app/models/song';
import {HttpHelperService} from '../../../services/http-helper.service';
import {MatPaginator} from '@angular/material/paginator';
import {MatTableDataSource} from '@angular/material/table';
import {ObjectSelectInputData} from '../../util/object-select/object-select.component';
import { Artist } from 'src/app/models/artist';
import { GenericDataObject } from 'src/app/models/genericDataObject';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ServerResultNoSearchResultSnackBarComponent } from '../../messages/server-result-no-search-result-snack-bar.component';

@Component({
  selector: 'app-database-browser',
  templateUrl: './database-browser.component.html',
  styleUrls: ['./database-browser.component.scss']
})
export class DatabaseBrowserComponent implements OnInit, AfterViewInit {

  dataSource = new MatTableDataSource<Song>();
  displayedColumns: string[] = ['title', 'album', 'artist'];
  modeselect = 'song';
  noresult = false;
  loading: boolean = false;
  dataBaseData: ObjectSelectInputData;
  selectedOptions: GenericDataObject[] = [];

  constructor(private formBuilder: FormBuilder,
              private httpHelperService: HttpHelperService,
              private snackBar: MatSnackBar) { }

  ngOnInit(): void {
  }

  onSelectionChange(): void{
    this.dataSource.data = [];
    switch (this.modeselect){
      case "artist":
        this.httpHelperService.getArray('/artists/all', Artist)
        .then((artists) => {
          this.dataBaseData = new ObjectSelectInputData("Artist", artists.map(artist => new GenericDataObject(artist.id, artist.name)));
        });
        break;
      default:
    }
    this.noresult = false;
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  @ViewChild(MatPaginator) paginator: MatPaginator;

  searchQuery: FormGroup = this.formBuilder.group({
    searchObject: [, { updateOn: "change" }],
    searchKeyword: [, { updateOn: "change" }],
    searchTerm: [, {  updateOn: "change" }],
    });

    
//other search terms needs to be imnplemented
  submitSearch(): void {
    this.loading = true;
    let searchQuery;
    switch (this.searchQuery.value["searchObject"]) {
      case "song":
        searchQuery = this.httpHelperService.getArray(`/songs/getSongsByKeyword/${this.searchQuery.value["searchKeyword"]}`, Song);
          break;
      case "artist":
        const searchArray = this.selectedOptions.map(song => {
          return song.id;
        });
        searchQuery =  this.httpHelperService.getArray(`/songs/getSongsByArtist/${searchArray}`, Song)
          break;
      default:
   }
   searchQuery.then((songs) => {
    this.dataSource.data = songs;
    this.loading = false;
    if (!this.dataSource.data || this.dataSource.data.length == 0){
      this.snackBar.openFromComponent(ServerResultNoSearchResultSnackBarComponent, {
        duration: 5000
      })
      this.noresult = true;
    }else{
      this.noresult = false;
    }
  })
  .catch((error) => {
    console.error(error);
    this.loading = false;
  });
  }
}
