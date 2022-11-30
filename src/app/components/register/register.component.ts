import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AbstractControl,
  FormGroupDirective,
  NgForm,
  UntypedFormBuilder,
  UntypedFormControl,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';

import { AuthenticationService } from '../../services/authentication.service';
import { ErrorStateMatcher } from '@angular/material/core';
import { HttpHelperService } from '../../services/http-helper.service';
import { User } from '../../models/user';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent {
  static InputErrorStateMatcher = class implements ErrorStateMatcher {
    error: boolean = false;

    isErrorState(control: UntypedFormControl | null, form: FormGroupDirective | NgForm | null): boolean {
      if (control === form?.form.controls['password_confirm']) {
        if (control.value !== form?.form.controls['password'].value) {
          return true;
        }
      }
      const isSubmitted = form && form.submitted;
      return !!(control && (control.invalid || this.error) && (control.dirty || control.touched || isSubmitted));
    }
  };

  registerForm: UntypedFormGroup;
  loading = false;
  submitted = false;
  error = '';
  matcher = new RegisterComponent.InputErrorStateMatcher();

  constructor(
    private formBuilder: UntypedFormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authenticationService: AuthenticationService,
    private httpHelperService: HttpHelperService
  ) {
    this.registerForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
      password_confirm: ['', Validators.required],
    });
  }

  // convenience getter for easy access to form fields
  registrationSuccessful = false;
  get getField(): { [key: string]: AbstractControl } {
    return this.registerForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';
    this.matcher.error = false;

    // stop here if form is invalid
    if (this.registerForm.invalid) {
      return;
    }
    const psu = this.getRegisterPSU();
    if (psu === null) {
      this.error = 'Invalid invite link.';
      this.matcher.error = true;
      this.loading = false;
      return;
    }
    console.log(psu);

    this.loading = true;
    this.httpHelperService
      .put(psu, new User(-1, this.getField['username'].value, this.getField['password'].value, ''))
      .then(() => {
        this.registrationSuccessful = true;
        this.loading = false;
        this.getField['username'].disable();
        this.getField['password'].disable();
        this.getField['password_confirm'].disable();
      })
      .catch((error) => {
        console.error(error);
        this.error = 'Registration failed.';
        this.matcher.error = true;
        this.loading = false;
      });
  }

  getRegisterPSU(): string | null {
    console.log(this.route.snapshot);
    console.log(this.route.snapshot.paramMap);
    const invite = this.route.snapshot.queryParams['invite'];
    console.log(invite);
    return invite == null ? null : decodeURIComponent(window.atob(invite));
  }
}
