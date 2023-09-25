import { Component, OnInit } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { AuthenticateService } from 'src/app/services/authenticate.service';
import { DatabaseResult } from 'src/app/services/interfaces';

@Component({
  selector: 'app-anon',
  templateUrl: './anon.component.html',
  styleUrls: ['./anon.component.scss']
})
export class AnonComponent implements OnInit {

  form: UntypedFormGroup;

  constructor(
    private authService: AuthenticateService
  ) { }

  ngOnInit(): void {
    this.form = new UntypedFormGroup({
      'username': new UntypedFormControl(null, { validators: [Validators.minLength(4), Validators.maxLength(30), Validators.required]}),
      'terms': new UntypedFormControl(null, { validators: [Validators.required]}),
      'privacy': new UntypedFormControl(null, { validators: [Validators.required]})
    });
  }

  generateRandomUsername(): void {
    const rank: string[] = ['Cadet', 'Ensign', 'Lt', 'Cpn', 'Cmdr', 'Lt Cmdr'];
    const forenames: string[] = ['Jim', 'Leonard', 'Nyota', 'Chris', 'Christine', 'Jean-Luc', 'Will', 'Geordi', 'Michael', `D'Vana`, 'Brad', 'Beckett', 'Ben', 'Kira'];
    const surnames: string[] =  ['Kirk', 'McCoy', 'Uhura', 'Pike', 'Chapel', 'Picard', 'Ryker', 'La Forge', 'Burnham', `Tendi`, 'Boimler', 'Mariner', 'Sisko', 'Narice'];

    const randoName: string = `${rank[Math.floor(Math.random() * rank.length)]} ${forenames[Math.floor(Math.random() * forenames.length)]} ${surnames[Math.floor(Math.random() * surnames.length)]}`;
    this.form.controls['username'].setValue(randoName);
  }

  generateRandomString(passwordLength: number = 12, chars: string = 'aAbBcCdDEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz!@#$%^&*0123456789'): string {
    let password = '';

    for(let i = 0 ; i < passwordLength ; i++) {
      let char: string = chars.charAt(Math.floor(Math.random() * chars.length));
      password += char;
    }

    return password;
  }

  registering: boolean = false;
  registrationSuccess: boolean;
  registeredUserData: { username: string, password: string, email: string };
  registeredUserError: { message: string, data: { timeLeft?: number }}

  register(): void {
    const username: string = this.form.controls['username'].value;
    const password: string = this.generateRandomString();
    const email: string = `${this.generateRandomString(4, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')}@sn.org`;

    this.registering = true;

    this.authService.registerUser(username, password, email).subscribe({
      next: (result: DatabaseResult) => {
        this.registering = false;
        document.getElementById('register__error').classList.add('fadeOut');
        document.getElementById('register__input').classList.add('fadeOut');

        window.setTimeout(() => {
          if(!result.error) {
            this.registeredUserData = { username, password, email };
            this.registrationSuccess = true;
          } else {
            this.registeredUserError = { message: result.message, data: { timeLeft: result.data?.timeLeft && -1 } }
            this.registrationSuccess = false;
          }
        }, 200);

      },
      error: (err: any) => {
        this.registering = false;
        this.registrationSuccess = false;
      }
    })
  }

  reset(): void {
    document.getElementById('register__error').classList.add('fadeIn');
    document.getElementById('register__input').classList.add('fadeIn');
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
    this.authService.newUserRegistered.next(true);
  }

  viewPassword: boolean = false;

  togglePasswordView(view: boolean): void { this.viewPassword = view; }

  getPassword(): string {
    return this.viewPassword ? this.registeredUserData.password : this.registeredUserData.password.replace(/./g, '*');
  }
}
