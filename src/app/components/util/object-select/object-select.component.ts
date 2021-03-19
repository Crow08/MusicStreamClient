import {Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';
import {FormControl} from '@angular/forms';
import {Observable} from 'rxjs';
import {map, startWith} from 'rxjs/operators';

export class SelectObject {
  id: number;
  name: string;
  selected = false;

  constructor(id: number, name: string) {
    this.id = id;
    this.name = name;
  }
}

export class ObjectMultiSelectInputData {
  displayName: string;
  options: SelectObject[];

  constructor(displayName: string, options: SelectObject[]) {
    this.displayName = displayName;
    this.options = options;
  }
}

@Component({
  selector: 'app-object-select',
  templateUrl: './object-select.component.html',
  styleUrls: ['./object-select.component.scss']
})
export class ObjectSelectComponent implements OnInit, OnChanges {

  @Input() selectObjectData: ObjectMultiSelectInputData;
  @Input() selectedOptions: SelectObject[];
  @Output() selectedOptionsChange = new EventEmitter<SelectObject[]>();
  objectControl = new FormControl();
  filteredOptions: Observable<SelectObject[]>;

  constructor() {
  }

  ngOnInit(): void {
    this.setUpFilter();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.hasOwnProperty('selectObjectData')) {
      this.objectControl.reset();

    }
  }

  setOptionsSelected(value: SelectObject[]): void {
    this.selectedOptions = value;
    this.selectedOptionsChange.emit(this.selectedOptions);
  }

  selectionChanged(): void {
    const hit = this.selectObjectData.options.find(value => value.id === Number(this.objectControl.value));
    if (hit) {
      this.setOptionsSelected([hit]);
    }
  }

  display = (id: number): string | undefined => {
    return this.selectObjectData.options.find(value => value.id === id)?.name;
  };

  private setUpFilter(): void {
    this.filteredOptions = this.objectControl.valueChanges.pipe(
      startWith(''),
      map(filter => this.objectFilter(filter, this.selectObjectData.options))
    );
  }

  private objectFilter(filter: any, array: SelectObject[]): any[] {
    if (!(typeof filter === 'string')) {
      return array;
    }
    const filterInput = filter.toLowerCase();
    return array.filter(option => {
      return option.name.toLowerCase().indexOf(filterInput) >= 0
        || option.id.toString().indexOf(filterInput) >= 0;
    });
  }
}
