import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';
import {FormGroup, FormBuilder} from '@angular/forms';
import {Song} from 'src/app/models/song';
import {HttpHelperService} from '../../../services/http-helper.service';
import {MatPaginator} from '@angular/material/paginator';
import {MatTableDataSource} from '@angular/material/table';
import {ObjectMultiSelectInputData, SelectObject} from '../../util/object-select/object-select.component';
import { Artist } from 'src/app/models/artist';

@Component({
  selector: 'app-database-browser',
  templateUrl: './database-browser.component.html',
  styleUrls: ['./database-browser.component.scss']
})
export class DatabaseBrowserComponent implements OnInit, AfterViewInit {

  dataSource = new MatTableDataSource<Song>();
  displayedColumns: string[] = ['title', 'album', 'artist'];
  modeselect = 'song';
  loading: boolean = false;
  dataBaseData: ObjectMultiSelectInputData;

  constructor(private formBuilder: FormBuilder,
              private httpHelperService: HttpHelperService) { }

  ngOnInit(): void {
  }

  getSelectionData(): void{
    switch (this.modeselect){
      case "artist":
        this.httpHelperService.getArray('/artists/all', Artist)
        .then((artists) => {
          this.dataBaseData = new ObjectMultiSelectInputData("Artist", artists.map(artist => new SelectObject(artist.id, artist.name)));
        });
        break;
      default:
    }
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

    
//other search terms needs to be imnplemented (autocomplete)
  submitSearch(): void {
    this.loading = true;
    switch (this.searchQuery.value["searchObject"]) {
      case "song":
        this.httpHelperService.getArray(`/songs/getSongsByKeyword/${this.searchQuery.value["searchKeyword"]}`, Song)
        .then((songs) => {
          this.dataSource.data = songs;
          this.loading = false;
        })
        .catch((error) => {
          console.error(error);
          this.loading = false;
        });
          break;
      case "artist":
        console.log(this.searchQuery.value["searchTerm"]);
        this.httpHelperService.getArray(`/songs/getSongsByArtist/${this.searchQuery.value["searchTerm"]}`, Song)
        .then((songs) => {
          this.dataSource.data = songs;
          this.loading = false;
        })
        .catch((error) => {
          console.error(error);
          this.loading = false;
        });
          break;
      default:
      console.log("Just nothing");
   }
  }
}
