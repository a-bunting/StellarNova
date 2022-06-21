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

}
