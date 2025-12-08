import { Component, OnInit } from '@angular/core';
import { AuthenticateService, User } from '../services/authenticate.service';
import { GameService } from '../services/game.service';

@Component({
  selector: 'app-entry',
  templateUrl: './entry.component.html',
  styleUrls: ['./entry.component.scss']
})
export class EntryComponent implements OnInit {

  user: User;

  constructor(
    private auth: AuthenticateService
  ) {
    this.auth.user.subscribe((user: User) => { this.user = user; })
    this.auth.checkLoggedInStatus();
  }

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
      this.createAccount = false;
      this.createAnon = false;
    }, 300);
  }

}
