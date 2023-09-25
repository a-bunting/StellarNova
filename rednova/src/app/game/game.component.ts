import { Component, OnDestroy, OnInit, SimpleChange } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthenticateService, User } from '../services/authenticate.service';
import { GameService, MenuData, ServerMessage } from '../services/game.service';
import { TradeRouteDisplay } from '../trade/trade-routes/trade-routes.component';

export interface Ship {
  armor: number; beams: number; cloak: number; computer: number; engines: number; hull: number; money: number; power: number; sector: number; sensors: number; shields: number; torpedos: number; storage: string;
}

export interface GoodStore {
  id: string; name: string; quantity: number;
}

export interface SectorData {
  server: { nextTurn: number; tickDuration: number; sectors: number; startSector: number },
  ship: Ship;
  user: { turns: number };
  system: {
    id: number;
    sectorid: number;
    givenname: string;
    size: number;
    starPower: number;
    starSize: number;
    starRayDistance: number;
    starRayQuantity: number;
    x: number; y: number; z: number;
    planets: { id: number; planetindex: number; distance: number; name: string; ownerName: string; trading: number, moons: number }[],
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

  // side items
  componentLoad: MenuData = { component: '', data: {} };

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
      // this.loadGalaxyData(this.galaxyId);

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

      /**
       * When menu items are clicked the data may need to go into the side
       * menu, this handles that.
       */
      const loadingSub: Subscription = this.gameService.loadMenuItem.subscribe({
        next: (data: MenuData) => {
          if(data) {
            switch(data.component) {
              case "planet": this.openSideData({ component: 'planet', data: { id: data.data.id }}); break;
              case "trade": this.openSideData({ component: 'trade', data: { id: data.data.id } }); break;
              case "displayTradeLog": this.openSideData({ component: 'displayTradeLog', data: data.data }); break;
              case "navigationLog": this.openSideData({ component: 'navigationLog', data: {} }); break;
              case '': this.removeSideData(); break;
            }
          } else {
            this.removeSideData();
          }
        },
        error: (err: any) => { console.log(`Error: ${err}`)},
        complete: () => { }
      })

      // get auth to check auth status and update...
      this.authService.checkLoggedInStatus();

      // needs a better way of managing sector data in this file
      const sectorDataSub: Subscription = this.gameService.sectorData.subscribe({
        next: (result: SectorData) => {
          if(result) {
            this.galaxyDataLoading = false;

            // if the sector has changed then set the sector id to null
            if(this.sectorData) {
              if(result.ship.sector !== this.sectorData.ship.sector) {
                this.planetDisplayId = null
              }
            }

            this.sectorData = result;
            this.gameService.setTickTimer(this.sectorData.server.nextTurn);
          }
        },
        error: (error) => { console.log(`Error: ${error}`)},
        complete: () => {}
      })

      // deal with messages from the server that relate to the current gameplay.
      const gameSub: Subscription = this.gameService.serverMessage.subscribe({
        next: (message: ServerMessage) => {
          if(message) {
            // do something when a message from the server is recieved of a particular type...
            switch(message.type) {
              case "tick":
                this.sectorData.user.turns += message.data.quantity ?? 0; break;
              default: break;
            }
          }
        }, error: (error) => {
          console.log(`Server Message Error: ${error}`);
        }
      })

      // push these to the subscription so they can be unsubscribed to later...
      this.subscriptions.push(...[sectorDataSub, userSub, gameSub, loadingSub]);
  }

  galaxyId: number;

  ngOnInit(): void {
    this.gameService.webSockets();
    this.gameService.loadSectorData(this.galaxyId);
  }

  ngOnDestroy(): void {
    // close all active subscriptions
    for(let i = 0 ; i < this.subscriptions.length ; i++) {
      this.subscriptions[i].unsubscribe()
    }
    // close the websockets...
    this.gameService.endWebsockets();
  }

  nextTick: number;

  /**
   * remvoes stuff likeplanetary data or menu loaded things...
   */
  removeSideData(): void {
    // using a try catch as sometimes this will fire on page load...
    try {
      document.getElementById('data-outlet').classList.add('shrinkAndHide');
      document.getElementById('data-outlet').classList.remove('expand');

      // hide then remove the component
      setTimeout(() => { this.componentLoad = { component: '' }; }, 300);
    } catch(e: any) {}
  }

  /**
   * Opens the sdie data bit...
   */
  openSideData(data: MenuData): void {
    // expand the sidebit
    document.getElementById('data-outlet').classList.remove('shrinkAndHide');
    document.getElementById('data-outlet').classList.add('expand');
    // after 300ms load the component...
    setTimeout(() => { this.componentLoad = data; }, 0);
  }


  planetDisplayId: number;

  displayPlanet(planetId: number): void {
    this.planetDisplayId = planetId;
  }

  displayPlanet2(planetId: number): void {
    this.router.navigate([{ outlets: { selection: ['planet', planetId ]}}]);
  }

}
