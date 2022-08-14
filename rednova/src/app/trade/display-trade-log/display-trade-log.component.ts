import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { GameService } from 'src/app/services/game.service';

export interface TradeLogData {
  log: TradeLog[]; turns: number; iterations: number;
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
  displayLog: DisplayTradeDetails[] = []; // items being displayed
  toDisplay: TradeLog[] = []; // items not yet displayed

  constructor(
    private gameService: GameService
  ) { }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log(changes);
    if(changes['tradeLog'].currentValue) this.displayNewLogData(changes['tradeLog'].currentValue);
  }

  tradeRoutesRun: { name: string, data: TradeLogData, interval: number }[] = [];

  turnsUsed: number = 0;
  moneyChange: number = 0;
  goodsChange: { id: number, quantity: number }[] = [];

  displayNewLogData(log: TradeLogData): void {

    this.toDisplay.push(...log.log);

    let interval: number;

    interval = window.setInterval(() => {

      const entry: TradeLog = this.toDisplay[0];
      let logEntry = ``;

      if(this.toDisplay.length === 0 || !entry) {
        clearInterval(interval);
      }

      switch(entry.action) {
        case 'move':
          logEntry = `You move your ship from ${entry.from} to ${entry.to}.`;
          break;
        case 'sell':
          logEntry = `You sell ${entry.quantity} ${entry.good}s to planet ${entry.from} for ${entry.cost}.`;
          this.addGoodToLog(entry.good, -entry.quantity);
          this.moneyChange += entry.cost
          break;
        case 'buy':
          logEntry = `You buy ${entry.quantity} ${entry.good}s from planet ${entry.from} at a cost of ${entry.cost}.`;
          this.addGoodToLog(entry.good, entry.quantity);
          break;
        }

        this.turnsUsed += entry.turns;
        // set a timeout
        const newTimeout = window.setTimeout(() => {
          this.displayLog.splice(0, 1);
        }, 500); // 500 for the ticker type

        this.displayLog.push({ action: entry.action, message: logEntry, timer: newTimeout });
        this.toDisplay.splice(0, 1);
    }, 75);

    this.tradeRoutesRun.push({ name: 'x', data: log, interval: interval });

  }

  /**
   * Add a good to the log...
   * @param goodId
   * @param quantity
   */
  addGoodToLog(goodId: number, quantity: number): void {
    const good: { id: number, quantity: number } = this.goodsChange.find((a: {id: number, quantity: number }) => a.id === goodId);
    if(good) { good.quantity += quantity; }
    else { this.goodsChange.push({ id: goodId, quantity: quantity }) }
  }

}
