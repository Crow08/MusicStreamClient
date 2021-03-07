import { Component, OnInit } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../environments/environment';
import {AuthenticationService} from '../../services/authentication.service';

@Component({
  selector: 'app-import',
  templateUrl: './import.component.html',
  styleUrls: ['./import.component.scss']
})
export class ImportComponent implements OnInit {
  loading = false;

  constructor(private http: HttpClient, private authenticationService: AuthenticationService) { }

  ngOnInit(): void {

  }

  onFileSelected(): void {
    const inputNode: any = document.querySelector('#file');
    const files = inputNode.files;
    if (!files) {
      return;
    }

    const options = {headers: this.authenticationService.getAuthHeaderForCurrentUser(), responseType: 'text' as 'text'};
    const formData: FormData = new FormData();
    for (const item of files) {
      formData.append('file', item, item.name);
    }
    formData.append('artistId', '0');
    formData.append('playlistId', '1');

    this.http.post(`http://${environment.dbServer}/songs/`, formData, options).subscribe(
      value => console.log(value),
      error => console.error(error)
    );
  }

}
