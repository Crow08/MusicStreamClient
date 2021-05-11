import { Component, Input, OnInit } from '@angular/core';
import { GenericDataObject } from 'src/app/models/genericDataObject';
import { ObjectSelectInputData } from '../../util/object-select/object-select.component';

@Component({
  selector: 'app-add-to-playlist-dialog',
  templateUrl: './add-to-playlist-dialog.component.html',
  styleUrls: ['./add-to-playlist-dialog.component.scss']
})
export class AddToPlaylistDialogComponent implements OnInit {

  @Input() selectedOptions: GenericDataObject[];
  selectObjectData: ObjectSelectInputData;

  constructor() { }

  ngOnInit(): void {
  }

}
