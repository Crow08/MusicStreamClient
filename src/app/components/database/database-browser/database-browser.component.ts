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

  constructor(private formBuilder: FormBuilder,
              private httpHelperService: HttpHelperService) { }

  ngOnInit(): void {
  }

  searchQuery: FormGroup = this.formBuilder.group({
    searchObject: [, { validators: [Validators.required], updateOn: "change" }],
    searchOperator: [,{validators: [Validators.required], updateOn: "change",}],
    searchKeyword: [, { validators: [Validators.required], updateOn: "change" }],
    });
//search has yet to be filtered
//maybe new method in song class for filtered search?
//artist needs to be imnplemented
  submitSearch(): void {
    console.log(this.searchQuery.value["searchKeyword"]);
    if (this.searchQuery.value["searchObject"] == "song"){
      this.httpHelperService.getArray(`/songs/getSongsByKeyword/${this.searchQuery.value["searchKeyword"]}`, Song)
      .then((songs) => {
        console.log(`Songs: ${songs[0].title}`);
      })
      .catch(console.error);
    }else{
      console.log("Just artist");
    }
  }
}
