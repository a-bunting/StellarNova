import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { GoodStore, SectorData, Ship } from '../game/game.component';
import { GameService } from '../services/game.service';

@Component({
  selector: 'app-shipoverview',
  templateUrl: './shipoverview.component.html',
  styleUrls: ['./shipoverview.component.scss']
})
export class ShipoverviewComponent implements OnInit, OnDestroy {

  shipDetail: Ship;
  shipStorage: GoodStore[] = [];

  sectorData: SectorData;

  subscriptions: Subscription[] = [];

  constructor(
    private gameService: GameService
  ) {
    const sectorDataSub: Subscription = this.gameService.sectorData.subscribe({
      next: (data: SectorData) => {
        if(data) {
          this.sectorData = data;
          this.shipDetail = data.ship;

          // deal with changing values of goods.
          this.goodChange([...JSON.parse(data.ship.storage)]);
        }
      },
      error: (err: any) => { console.log(`Error: ${err}`)},
      complete: () => {}
    })

    this.subscriptions.push(sectorDataSub);
  }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
      this.subscriptions.map((a: Subscription) => a.unsubscribe());
  }

  goodChange(newGoods: GoodStore[]): void {

      for(let i = 0 ; i < newGoods.length ; i++) {
        const storage: GoodStore = newGoods[i];
        const oldStoreIndex: number = this.shipStorage.findIndex((a: GoodStore) => a.id === storage.id);

        if(oldStoreIndex === -1) {
          // definately a change, add it then change it.
          const newGood: GoodStore = { id: storage.id, name: storage.name, quantity: 0 };
          this.shipStorage.push(newGood);
          this.modifyGoodsValue(storage.id, newGoods[i].quantity);
        } else {
          // it was found in already.
          this.modifyGoodsValue(storage.id, newGoods[i].quantity);
        }
      }
  }

  intervals: number[] = [];

  modifyGoodsValue(goodsId: string, newValue: number): void {
    // the quantity has changed so run the function...
    const good: GoodStore = this.shipStorage.find((a: GoodStore) => a.id === goodsId);
    const difference: number = newValue - good.quantity;
    // timing constants...
    const iterationsForVisualUpdate: number = difference > 100 ? 100 : 20;
    const updateQuantity: number = difference / iterationsForVisualUpdate;
    const updateInterval: number = (1 * 1000) / iterationsForVisualUpdate;
    let iterations: number = 0;

    // the interval itself...
    const newInterval: number = window.setInterval(() => {
      good.quantity += updateQuantity;
      iterations++;
      if(iterations === iterationsForVisualUpdate) clearInterval(newInterval);
    }, updateInterval)

    this.intervals.push(newInterval);
  }

}
