import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { SectorData } from '../game/game.component';
import { GameService } from '../services/game.service';
import { DatabaseResult } from '../services/interfaces';

@Component({
  selector: 'app-move',
  templateUrl: './move.component.html',
  styleUrls: ['./move.component.scss']
})
export class MoveComponent implements OnInit {

  sectorData: SectorData;
  galaxyId: number;

  subscriptions: Subscription[] = [];

  constructor(private gameService: GameService) {
    // subscribe to the gameservice, though not sure this needs to happen...
    const sectorDataSub: Subscription = this.gameService.sectorData.subscribe({
      next: (sectorData: SectorData) => {
        this.sectorData = sectorData;
      },
      error: (err: any) => { console.log(err) },
      complete: () => {}
    })

    // add variables
    this.galaxyId = this.gameService.galaxyId;
    this.subscriptions.push(...[sectorDataSub])
  }

  ngOnInit(): void {
  }

  moveError: { message: string, turnsRequired: number, turnsAvailable: number };

  warpTo(destination: number): void {
    const warpSub: Subscription = this.gameService.warpToSector(this.galaxyId, destination).subscribe({
      next: (result: DatabaseResult) => { this.gameService.loadSectorData(this.galaxyId); warpSub.unsubscribe(); },
      error: (error) => { this.moveError = { message: error.error.message, turnsRequired: error.error.data.required, turnsAvailable: error.error.data.current }; warpSub.unsubscribe(); },
      complete: () => { warpSub.unsubscribe(); }
    })
  }

  moveTo(destination?: number): void {
    // call the move to sector...
    const sub: Subscription = this.gameService.moveToSector(this.galaxyId, destination ? destination : this.subLightInput ?? -1, this.sectorData.ship.engines).subscribe({
      next: (result: DatabaseResult) => { this.gameService.loadSectorData(this.galaxyId); sub.unsubscribe(); },
      error: (error) => { this.moveError = { message: error.error.message, turnsRequired: error.error.data.required, turnsAvailable: error.error.data.current }; sub.unsubscribe(); },
      complete: () => { sub.unsubscribe(); }
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

}
