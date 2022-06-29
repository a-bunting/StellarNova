import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthenticateService, User } from '../services/authenticate.service';
import { GameService, ServerMessage } from '../services/game.service';
import { DatabaseResult } from '../services/interfaces';

interface SectorData {
  server: { nextTurn: number; tickDuration: number; sectors: number; startSector: number },
  ship: { armor: number; beams: number; cloak: number; computer: number; engines: number; hull: number; money: number; power: number; sector: number; sensors: number; shields: number; torpedos: number; storage: {}};
  user: { turns: number };
  system: {
    id: number;
    sectorid: number;
    givenname: string;
    size: number;
    starPower: number;
    x: number; y: number; z: number;
    planets: { id: number; distance: number; name: string; onPlanet: {}; solarRadiation: number }[],
    ships: { userid: number; username: string }[],
    warp: { destination: number; oneway: number; }[]
  }
}

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss']
})
export class GameComponent implements OnInit, OnDestroy {

  // observer data
  user: User;
  server: ServerMessage;

  // sector data
  sectorData: SectorData;

  // booleans for when waiting for things...
  userDataLoading: boolean = false;
  galaxyDataLoading: boolean = false;
  warpToSectorLoading: boolean = false;

  // subscriptions to cancel on destroy...
  subscriptions: Subscription[] = [];

  constructor(
    private authService: AuthenticateService,
    public  gameService: GameService,
    private activatedRoute: ActivatedRoute,
    private router: Router
    )
  {
      // get the galaxy id, and if it doesnt exist navigate back
      this.galaxyId = this.activatedRoute.snapshot.params['galaxyId'];
      if(!this.galaxyId) this.router.navigate(['/']);

      this.gameService.setGalaxyId(this.galaxyId);

      // continue loading if we havent been navigated away from this page.
      this.userDataLoading = true;
      this.galaxyDataLoading = true;

      // get the galaxy data
      this.loadGalaxyData(this.galaxyId);

      // update user data
      const userSub: Subscription = this.authService.user.subscribe({
        next: (user: User) => {
          this.userDataLoading = false;
          this.user = user;
        }, error: (error) => {
          console.log(`Error loading user data: ${error}`);
          this.router.navigate(['/']);
        }
      })

      // get auth to check auth status and update...
      this.authService.checkLoggedInStatus();

      // deal with messages from the server that relate to the current gameplay.
      const gameSub: Subscription = this.gameService.serverMessage.subscribe({
        next: (message: ServerMessage) => {
          if(message) {
            console.log(message);
            // do something when a message from the server is recieved of a particular type...
            switch(message.type) {
              case "tick": this.sectorData.user.turns += message.data.quantity ?? 0; break;
              default: break;
            }
          }
        }, error: (error) => {
          console.log(`Server Message Error: ${error}`);
        }
      })

      // push these to the subscription so they can be unsubscribed to later...
      this.subscriptions.push(...[userSub, gameSub]);
  }

  galaxyId: number;

  ngOnInit(): void {
    this.gameService.webSockets();
  }

  ngOnDestroy(): void {
    // close all active subscriptions
    for(let i = 0 ; i < this.subscriptions.length ; i++) {
      this.subscriptions[i].unsubscribe()
    }
    // close the websockets...
    this.gameService.endWebsockets();
  }

  sendTestMessage(): void {
    this.gameService.sendTestMessage();
  }

  moveError: { message: string, turnsRequired: number, turnsAvailable: number };

  warpTo(destination: number): void {
    const warpSub: Subscription = this.gameService.warpToSector(this.galaxyId, destination).subscribe({
      next: (result: DatabaseResult) => { this.loadGalaxyData(this.galaxyId); warpSub.unsubscribe(); },
      error: (error) => { this.moveError = { message: error.error.message, turnsRequired: error.error.data.required, turnsAvailable: error.error.data.current }; warpSub.unsubscribe(); },
      complete: () => { warpSub.unsubscribe(); }
    })
  }

  moveTo(destination?: number): void {
    // call the move to sector...
    const sub: Subscription = this.gameService.moveToSector(this.galaxyId, destination ? destination : this.subLightInput ?? -1, this.sectorData.ship.engines).subscribe({
      next: (result: DatabaseResult) => { this.loadGalaxyData(this.galaxyId); sub.unsubscribe(); },
      error: (error) => { this.moveError = { message: error.error.message, turnsRequired: error.error.data.required, turnsAvailable: error.error.data.current }; sub.unsubscribe(); },
      complete: () => { sub.unsubscribe(); }
    })
  }

  nextTick: number;

  loadGalaxyData(galaxyId: number, callback?: Function): void {
    const sub: Subscription = this.gameService.loadGalaxyData(galaxyId ?? this.galaxyId).subscribe({
      next: ((result: DatabaseResult) => {
        this.galaxyDataLoading = false;
        this.sectorData = result.data;
        console.log(result);
        this.gameService.setTickTimer(this.sectorData.server.nextTurn);
        if(callback) callback();
        sub.unsubscribe();
      }),
      error: ((error) => { console.log(`Error retrieving galaxy data: ${error}`); sub.unsubscribe(); }),
      complete: (() => { this.galaxyDataLoading = false; sub.unsubscribe(); })
    })
  }

  subLightInput: number = 0;
  subLightChecked: number = 0;
  timerToCheckCost: number;
  subLightCost: number = 0;

  calculatingNewCost: boolean = false;

  calculateSublightTurnCost(): void {
    // if the number is outside the range, make it the min or max...
    if(this.subLightInput > this.sectorData.server.sectors) this.subLightInput = this.sectorData.server.sectors;
    if(this.subLightInput < 1) this.subLightInput = 1;

    // now see if its a changed number...
    if(this.subLightInput !== this.subLightChecked) {
      clearTimeout(this.timerToCheckCost);
      this.calculatingNewCost = true;
      // value has been changed, wait 1 second then calculate a new cost
      this.timerToCheckCost = window.setTimeout(() => {
        // get the distance calculation...
        this.gameService.getDistanceCalculation(this.galaxyId, this.sectorData.system.sectorid, this.subLightInput, this.sectorData.ship.engines).subscribe({
          next: (res: DatabaseResult) => { this.subLightCost = res.data.distance; },
          error: (error) => { this.calculatingNewCost = false; this.subLightCost = NaN; },
          complete: () => { this.calculatingNewCost = false; }
        })
      }, 1500);
    }
  }

  planetDisplayId: number;

  displayPlanet(planetId: number): void {
    this.planetDisplayId = planetId;
  }

}
