import { Component } from '@angular/core';
import { AuthenticateService, User } from './services/authenticate.service';
import { GameService } from './services/game.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  title = 'rednova';

  constructor() {}
}
