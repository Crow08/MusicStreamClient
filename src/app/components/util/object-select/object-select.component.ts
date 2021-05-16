import {Component, EventEmitter, Input, OnChanges, OnInit, Output, QueryList,SimpleChanges, ViewChild, AfterViewInit, ViewChildren} from '@angular/core';
import {FormControl} from '@angular/forms';
import {Observable} from 'rxjs';
import {map, startWith} from 'rxjs/operators';
import {GenericDataObject} from '../../../models/genericDataObject';
import {MatAutocomplete} from '@angular/material/autocomplete';

export class ObjectSelectInputData {
  displayName: string;
  options: GenericDataObject[];

  constructor(displayName: string, options: GenericDataObject[]) {
    this.displayName = displayName;
    this.options = options;
  }
}

@Component({
  selector: 'app-object-select',
  templateUrl: './object-select.component.html',
  styleUrls: ['./object-select.component.scss']
})
export class ObjectSelectComponent implements OnInit, OnChanges, AfterViewInit {

  @Input() selectObjectData: ObjectSelectInputData;
  @Input() selectedOptions: GenericDataObject[];
  @Output() selectedOptionsChange = new EventEmitter<GenericDataObject[]>();
  @Input() appearance: string;
  objectControl = new FormControl();
  filteredOptions: Observable<GenericDataObject[]>;

  @ViewChild('objectAC') objectAC: MatAutocomplete;
  @ViewChildren('MatAutocomplete') objectACs: QueryList<MatAutocomplete>;

  private pendingChange;

  constructor() {
  }

  ngOnInit(): void {
    this.setUpFilter();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.hasOwnProperty('selectedOptions')) {
      if (this.objectAC && changes.selectedOptions.currentValue[0]) {
        const hit = this.objectAC.options.find(item => item.value === changes.selectedOptions.currentValue[0].id);
        this.objectControl.setValue(hit.value);
      } else if(changes.selectedOptions.currentValue[0]){
        this.pendingChange = changes.selectedOptions.currentValue[0];
      }
    }
    if (changes.hasOwnProperty('selectObjectData')) {
      this.objectControl.reset();
    }
  }

  ngAfterViewInit():void {
    this.applyPendingChange();
    this.objectACs.changes.subscribe(() => {
      this.applyPendingChange();
    });
  }

  applyPendingChange() {
    if(this.pendingChange && this.objectAC) {
      const hit = this.objectAC.options.find(item => item.value === this.pendingChange.id);
      this.objectControl.setValue(hit.value);
    }
  }

  setOptionsSelected(value: GenericDataObject[]): void {
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

  private objectFilter(filter: any, array: GenericDataObject[]): any[] {
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
