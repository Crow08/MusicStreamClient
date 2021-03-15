import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';
import {FormGroup, FormBuilder} from '@angular/forms';
import {Song} from 'src/app/models/song';
import {HttpHelperService} from '../../../services/http-helper.service';
import {MatPaginator} from '@angular/material/paginator';
import {MatTableDataSource} from '@angular/material/table';

@Component({
  selector: 'app-database-browser',
  templateUrl: './database-browser.component.html',
  styleUrls: ['./database-browser.component.scss']
})
export class DatabaseBrowserComponent implements OnInit, AfterViewInit {

  dataSource = new MatTableDataSource<Song>();
  displayedColumns: string[] = ['title', 'album', 'artist'];
  public modeselect = 'song';
  loading: boolean = false;

  constructor(private formBuilder: FormBuilder,
              private httpHelperService: HttpHelperService) { }

  ngOnInit(): void {
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

    
//artist needs to be imnplemented (autocomplete)
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
        console.log("Just an artist");
          break;
      default: 
      console.log("Just nothing");
          break;
   }
  }
}
