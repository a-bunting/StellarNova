import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { GameService } from 'src/app/services/game.service';

export interface Trade { id: number; currentLog: string; name: string; moneyChange: number; turnsUsed: number; goodsChange: { id: number; quantity: number; }[]; data: TradeLog[]; interval: number; complete: boolean; }

export interface TradeLogData {
  routeName: string; log: TradeLog[]; turns: number; iterations: number;
}

export interface TradeLog {
  success: boolean; error? : string; action: string; quantity?: number, from: number; to: number; method?: 'warp' | 'real'; cost?: number; good?: number; turns?: number;
}

export interface DisplayTradeDetails {
  action: string; message: string; timer: number;
}

@Component({
  selector: 'app-display-trade-log',
  templateUrl: './display-trade-log.component.html',
  styleUrls: ['./display-trade-log.component.scss']
})

export class DisplayTradeLogComponent implements OnInit, OnChanges {

  @Input() tradeLog: TradeLogData;

  constructor( private gameService: GameService ) { }

  tradeRoutesRun: Trade[] = [];

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if(changes['tradeLog'].currentValue) {
      this.displayNewLogData(changes['tradeLog'].currentValue);
    };
  }

  routeSpeedMs: number = 75;

  /**
   * Add a new log to the logs array
   * @param log
   */
  displayNewLogData(log: TradeLogData): void {
    let newTradeRouteRun: Trade = { id: this.tradeRoutesRun.length, currentLog: '', name: log.routeName, moneyChange: 0, turnsUsed: 0, goodsChange: [], data: log.log, interval: null, complete: false };    this.tradeRoutesRun.push(newTradeRouteRun);

    // create an interval to run through the logs.
    let interval: number = window.setInterval(() => {
      const entry: TradeLog = newTradeRouteRun.data[0];
      this.logEntryCalculation(newTradeRouteRun, entry);
    }, this.routeSpeedMs);

    newTradeRouteRun.interval = interval;
  }

  logEntryCalculation(newTradeRouteRun: Trade, entry: TradeLog): void {
    let logEntry = ``;

    if(!entry) {
      newTradeRouteRun.currentLog = 'Trade Route Completed';
      newTradeRouteRun.complete = true;
      this.updateMainWindow(newTradeRouteRun.id);
      if(newTradeRouteRun.interval) { clearInterval(newTradeRouteRun.interval); }

      return;
    }

    switch(entry.action) {
      case 'move':
        logEntry = `You move your ship from ${entry.from} to ${entry.to}.`;
        break;
      case 'sell':
        logEntry = `You sell ${entry.quantity} ${entry.good}s to planet ${entry.from} for ${entry.cost}.`;
        // this.addGoodToLog(newTradeRouteRun.id, entry.good, -entry.quantity);
        this.modifyGoodsQuantity(newTradeRouteRun.id, entry.good, -entry.quantity, 74);
        newTradeRouteRun.moneyChange += entry.cost
        break;
      case 'buy':
        logEntry = `You buy ${entry.quantity} ${entry.good}s from planet ${entry.from} at a cost of ${entry.cost}.`;
        // this.addGoodToLog(newTradeRouteRun.id, entry.good, entry.quantity);
        this.modifyGoodsQuantity(newTradeRouteRun.id, entry.good, entry.quantity, 74);
        break;
      }

      newTradeRouteRun.turnsUsed += entry.turns;
      newTradeRouteRun.currentLog = logEntry;
      newTradeRouteRun.data.splice(0, 1);
  }

  /**
   * Add a good to the log...
   * @param goodId
   * @param quantity
   */
  addGoodToLog(tradeRouteRunId: number, goodId: number, quantity: number): void {
    const good: { id: number, quantity: number } = this.tradeRoutesRun[tradeRouteRunId].goodsChange.find((a: {id: number, quantity: number }) => a.id === goodId);
    if(good) { good.quantity += quantity; }
    else { this.tradeRoutesRun[tradeRouteRunId].goodsChange.push({ id: goodId, quantity: quantity }) }
  }

  getGoodsName(id: number): string { return this.gameService.getGoodsName(id); }

  iterationsMax: number = 20;

  modifyGoodsQuantity(routeId: number, goodId: number, change: number, time: number): void {
    let good: { id: number, quantity: number } = this.tradeRoutesRun[routeId].goodsChange.find((a: {id: number, quantity: number }) => a.id === goodId);
    let iterations: number = 0;

    if(!good) {
      this.tradeRoutesRun[routeId].goodsChange.push({ id: goodId, quantity: 0 });
      good = this.tradeRoutesRun[routeId].goodsChange[this.tradeRoutesRun[routeId].goodsChange.length - 1];
    }

    // make it look good...
    const newInterval: number = window.setInterval(() => {
      // not sure why this usually adds as a string but this works...
      good.quantity = good.quantity + (change / this.iterationsMax);
      iterations++;
      if(iterations === this.iterationsMax)  {
        clearInterval(newInterval);
      }
    }, this.routeSpeedMs / this.iterationsMax)
  }

  completeRoute(routeId: number): void {
    const index: number = this.tradeRoutesRun.findIndex((a) => a.id === routeId);
    if(index !== -1) {
      // needs to finish instantly.
    }
  }

  clearRoute(routeId: number): void {
    document.getElementById('tradeRoute'+routeId).classList.add('fadeOut');

    window.setTimeout(() => {
      const index: number = this.tradeRoutesRun.findIndex((a) => a.id === routeId);
      if(index !== -1) {
        this.tradeRoutesRun.splice(index, 1);

        if(this.tradeRoutesRun.length === 0) this.gameService.clearLoadedComponent();
      }
    }, 500);
  }

  finishFast(routeId: number): void {
    const route: Trade = this.tradeRoutesRun.find((temp: Trade) => temp.id === routeId);

    // stop the visual
    clearInterval(route.interval);

    // run through the data calculations fast.
    while(route.data.length > 0) {
      this.logEntryCalculation(route, route.data[0]);
    }
    // last entry...
    this.logEntryCalculation(route, route.data[0]);
  }

  /**
   * Updates the game window
   * @param routeId
   */
  updateMainWindow(routeId: number): void {
    const route: Trade = this.tradeRoutesRun.find((a) => a.id === routeId);
    this.gameService.modifyShipCash(route.moneyChange);

    for(let i = 0 ; i < route.goodsChange.length ; i++) {
      this.gameService.addGoodsToShip(''+route.goodsChange[i].id, this.gameService.getGoodsName(route.goodsChange[i].id), route.goodsChange[i].quantity);
    }
  }

}
