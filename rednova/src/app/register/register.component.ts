import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

  createAccount: boolean;
  createAnon: boolean;

  createStandardAccount(): void {
    this.createAccount = true;
    this.createAnon = false;
  }

  createAnonAccount(): void {
    this.createAccount = true;
    this.createAnon = true;
  }

  stopRegistration(): void {
    document.getElementById('register__popup').classList.remove('fadeIn');
    document.getElementById('register__popup').classList.add('fadeOut');

    let timeout: number = window.setTimeout(() => {
      console.log('done');
      this.createAccount = false;
      this.createAnon = false;
    }, 300);
  }

}
