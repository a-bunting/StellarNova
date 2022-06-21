import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthenticateService, User } from '../services/authenticate.service';
import { GameService, ServerMessage } from '../services/game.service';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss']
})
export class GameComponent implements OnInit {

  // observer data
  user: User;
  server: ServerMessage;

  constructor(
    private authService: AuthenticateService,
    private gameService: GameService,
    private activatedRoute: ActivatedRoute,
    private router: Router
    )
  {
      // get the galaxy id, and if it doesnt exist navigate back
      const galaxyId: number = activatedRoute.snapshot.queryParams['galaxyId'];
      if(!galaxyId) this.router.navigate(['/']);

      // update user data
      this.authService.user.subscribe((user: User) => {
        this.user = user;
      })

      // deal with messages from the server that relate to the current gameplay.
      this.gameService.serverMessage.subscribe({
        next: (message: ServerMessage) => {
          if(message) {
            console.log(message);
            // do something when a message from the server is recieved of a particular type...
            switch(message.type) {
              default: break;
            }
          }
        }, error: (error) => {
          console.log(`Server Message Error: ${error}`);
        }
      })
  }

  galaxyId: number;

  ngOnInit(): void {
    this.galaxyId = this.activatedRoute.snapshot.queryParams['id'];

    if(this.galaxyId) {
      this.gameService.loadGalaxyData(this.galaxyId);
    }
  }

}
