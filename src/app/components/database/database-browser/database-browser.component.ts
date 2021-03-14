import {Component, OnInit} from '@angular/core';
import {FormGroup, Validators, FormBuilder} from '@angular/forms';
import {Song} from 'src/app/models/song';
import {HttpHelperService} from '../../../services/http-helper.service';

@Component({
  selector: 'app-database-browser',
  templateUrl: './database-browser.component.html',
  styleUrls: ['./database-browser.component.scss']
})
export class DatabaseBrowserComponent implements OnInit {

  dataSource;
  displayedColumns: string[] = ['path', 'title', 'album_id', 'artist_id'];
  public modeselect = 'song';

  constructor(private formBuilder: FormBuilder,
              private httpHelperService: HttpHelperService) { }

  ngOnInit(): void {
  }

  searchQuery: FormGroup = this.formBuilder.group({
    searchObject: [, { validators: [Validators.required], updateOn: "change" }],
    searchKeyword: [, { validators: [Validators.required], updateOn: "change" }],
    searchTerm: [, { validators: [Validators.required], updateOn: "change" }],
    });
//artist needs to be imnplemented (autocomplete)
  submitSearch(): void {
    console.log(this.searchQuery.value["searchKeyword"]);
    switch (this.searchQuery.value["searchObject"]) {
      case "song":
        this.httpHelperService.getArray(`/songs/getSongsByKeyword/${this.searchQuery.value["searchKeyword"]}`, Song)
        .then((songs) => {
          this.dataSource = songs;
        })
        .catch(console.error);
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
