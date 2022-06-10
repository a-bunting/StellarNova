import { Component } from '@angular/core';
import { AuthenticateService, User } from './services/authenticate.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  title = 'rednova';
  user: User;

  constructor(
    private auth: AuthenticateService
  ) {
    this.auth.user.subscribe((user: User) => { this.user = user; })
    this.auth.checkLoggedInStatus();
  }
}
