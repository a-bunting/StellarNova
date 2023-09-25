import { Component, OnInit } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { AuthenticateService } from 'src/app/services/authenticate.service';
import { DatabaseResult } from 'src/app/services/interfaces';
import { PasswordMatch } from '../password-match';
import { PasswordValidator } from '../password-validator';

@Component({
  selector: 'app-normal',
  templateUrl: './normal.component.html',
  styleUrls: ['./normal.component.scss']
})
export class NormalComponent implements OnInit {

  form: UntypedFormGroup;

  constructor(
    private authenticationService: AuthenticateService
  ) { }

  ngOnInit(): void {
    this.form = new UntypedFormGroup({
      'username': new UntypedFormControl(null, { validators: [Validators.minLength(4), Validators.maxLength(30), Validators.required]}),
      'email': new UntypedFormControl(null, { validators: [Validators.email, Validators.required]}),
      'password': new UntypedFormControl(null, { validators: [
        Validators.required,
        Validators.minLength(6),
        PasswordValidator.patternValidator(/[A-Z]/, { hasCapitalCase: true }),
        PasswordValidator.patternValidator(/[a-z]/, { hasSmallCase: true }),
      ]}),
      'repeatpassword': new UntypedFormControl(null, { validators: [ Validators.required ]}),
      'terms': new UntypedFormControl(null, { validators: [Validators.required]}),
      'privacy': new UntypedFormControl(null, { validators: [Validators.required]})
    },
    {
      validators: [
        PasswordMatch.passwordMatchValidator({ noPasswordMatch: true })
      ]
    })
  }

  registering: boolean = false;
  registrationSuccess: boolean;
  registeredUserData: { username: string, password: string, email: string };

  register(): void {
    const username: string = this.form.controls['username'].value;
    const password: string = this.form.controls['password'].value;
    const email: string = this.form.controls['email'].value;

    this.registering = true;

    this.authenticationService.registerUser(username, password, email).subscribe({
      next: (result: DatabaseResult) => {
        this.registering = false;

        console.log(result);

        document.getElementById('register__error').classList.add('fadeOut');
        document.getElementById('register__input').classList.add('fadeOut');

        window.setTimeout(() => {
          this.registeredUserData = { username, password, email };
          this.registrationSuccess = true;
        }, 200);
      },
      error: (err: any) => {
        this.registering = false;
        this.registrationSuccess = false;
      }
    })
  }

  addToLocalStorageButton(): void {
    this.addToLocalStorage(this.registeredUserData.username, this.registeredUserData.password, this.registeredUserData.email);
  }

  addToLocalStorage(username: string, password: string, email: string): void {
    let currentLocalStorage: { username: string, password: string, email: string }[] = JSON.parse(localStorage.getItem('rednova-anon'));

    if(currentLocalStorage) {
      // if accounts exist, make a new one!
      currentLocalStorage.push({ username, password, email });
    } else {
      // if they dont, make the local storage
      currentLocalStorage = [{ username, password, email }];
    }
    // and set to local storage
    localStorage.setItem('rednova-anon', JSON.stringify(currentLocalStorage));
    // and push its been done...
    this.authenticationService.newUserRegistered.next(true);
  }

  viewPassword: boolean = false;

  togglePasswordView(view: boolean): void { this.viewPassword = view; }

  getPassword(): string {
    return this.viewPassword ? this.registeredUserData.password : this.registeredUserData.password.replace(/./g, '*');
  }
}
