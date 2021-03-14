import {Component, OnInit} from '@angular/core';
import {FormGroup, Validators, FormBuilder} from '@angular/forms';
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
    console.log(this.searchQuery.value["searchObject"]);
    if (this.searchQuery.value["searchObject"] == "song"){
      this.httpHelperService.getPlain(`/songs/all`)
      .then((songs) => {
        console.log(`Songs: ${songs}`);
      })
      .catch(console.error);
    }else{
      console.log("Just artist")
    }
  }
}
