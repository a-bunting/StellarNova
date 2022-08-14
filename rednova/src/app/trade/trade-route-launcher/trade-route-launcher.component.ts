import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { GameService } from '../../services/game.service';
import { DatabaseResult } from '../../services/interfaces';
import { TradeRouteDisplay } from '../trade-routes/trade-routes.component';

@Component({
  selector: 'app-trade-route-launcher',
  templateUrl: './trade-route-launcher.component.html',
  styleUrls: ['./trade-route-launcher.component.scss']
})
export class TradeRouteLauncherComponent implements OnInit {

  constructor(
    private gameService: GameService
  ) { }

  subscriptions: Subscription[] = [];
  tradeRoutesList: TradeRouteDisplay[] = [];
  selectedTradeRoute: number;
  selectedTradeQuantity: number;

  ngOnInit(): void {
    const tradeRouteSubscription: Subscription = this.gameService.tradeRouteSubscription.subscribe({
      next: (routes: TradeRouteDisplay[]) => {
        if(routes) {
          this.tradeRoutesList = routes;
        }
      },
      error: (error) => { console.log(`Error: ${error}`)},
      complete: () => {}
    })

    this.subscriptions.push(...[tradeRouteSubscription]);
  }

  loadRoute(id: number): void {
    this.gameService.loadComponent('trade', id);
  }

  selectRoute(id: number): void {
    this.selectedTradeRoute = id;
  }

  selectTradeQuantity(quantity: number): void {
    this.selectedTradeQuantity = quantity;
  }

  executeTradeRoutes(): void {
    this.gameService.executeTradeRoutes(this.selectedTradeRoute, this.selectedTradeQuantity,
        () => { this.gameService.loadSectorData() }
      ).subscribe({
      next: (result: DatabaseResult) => {
        if(!result.error) {
          this.gameService.loadComponent('displayTradeLog', -1, result.data);
        }
      },
      error: (err: any) => { console.log(err); }
    })
  }

}
