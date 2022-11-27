import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  QueryList,
  SimpleChanges,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { GenericDataObject } from '../../../models/genericDataObject';
import { MatAutocomplete } from '@angular/material/autocomplete';
import { MatFormFieldAppearance } from '@angular/material/form-field';

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
  styleUrls: ['./object-select.component.scss'],
})
export class ObjectSelectComponent implements OnInit, OnChanges, AfterViewInit {
  @Output() selectedOptionsChange = new EventEmitter<GenericDataObject[]>();
  @Input() public selectObjectData!: ObjectSelectInputData;
  @Input() public selectedOptions!: GenericDataObject[];
  @Input() public appearance!: MatFormFieldAppearance;

  objectControl = new UntypedFormControl();
  filteredOptions: Observable<GenericDataObject[]> = of([]);

  @ViewChild('objectAC') objectAC: MatAutocomplete | undefined;
  @ViewChildren('MatAutocomplete') objectACs: QueryList<MatAutocomplete> | undefined;

  private pendingChange: GenericDataObject | null = null;

  constructor() {}

  ngOnInit(): void {
    this.setUpFilter();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.hasOwnProperty('selectedOptions')) {
      if (this.objectAC && changes['selectedOptions'].currentValue[0]) {
        const hit = this.objectAC.options.find((item) => item.value === changes['selectedOptions'].currentValue[0].id);
        if (hit) {
          this.objectControl.setValue(hit.value);
        }
      } else if (changes['selectedOptions'].currentValue[0]) {
        this.pendingChange = changes['selectedOptions'].currentValue[0];
      }
    }
    if (changes.hasOwnProperty('selectObjectData')) {
      this.objectControl.reset();
    }
  }

  ngAfterViewInit(): void {
    if (!this.objectACs) {
      console.error('Page not loaded properly!');
      return;
    }
    this.applyPendingChange();
    this.objectACs.changes.subscribe(() => {
      this.applyPendingChange();
    });
  }

  applyPendingChange() {
    if (this.pendingChange && this.objectAC) {
      const hit = this.objectAC.options.find((item) => !!this.pendingChange && item.value === this.pendingChange.id);
      if (hit) {
        this.objectControl.setValue(hit.value);
      }
    }
  }

  setOptionsSelected(value: GenericDataObject[]): void {
    this.selectedOptions = value;
    this.selectedOptionsChange.emit(this.selectedOptions);
  }

  selectionChanged(): void {
    const hit = this.selectObjectData.options.find((value) => value.id === Number(this.objectControl.value));
    if (hit) {
      this.setOptionsSelected([hit]);
    }
  }

  display = (id: number): string => {
    const val = this.selectObjectData.options.find((value) => value.id === id);
    if (!!val) {
      return val.name;
    }
    return '';
  };

  private setUpFilter(): void {
    this.filteredOptions = this.objectControl.valueChanges.pipe(
      startWith(''),
      map((filter) => this.objectFilter(filter, this.selectObjectData.options))
    );
  }

  private objectFilter(filter: any, array: GenericDataObject[]): any[] {
    if (!(typeof filter === 'string')) {
      return array;
    }
    const filterInput = filter.toLowerCase();
    return array.filter((option) => {
      return option.name.toLowerCase().indexOf(filterInput) >= 0 || option.id.toString().indexOf(filterInput) >= 0;
    });
  }
}
