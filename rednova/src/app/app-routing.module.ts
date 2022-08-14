import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EntryComponent } from './entry/entry.component';
import { GameComponent } from './game/game.component';
import { PlanetComponent } from './planet/planet.component';
import { TradeRoutesComponent } from './trade/trade-routes/trade-routes.component';

const routes: Routes = [
  { path: '', component: EntryComponent },
  { path: 'game/:galaxyId', component: GameComponent, children: [
    { path: 'planet/:planetId', component: PlanetComponent },
    { path: 'traderoute', component: TradeRoutesComponent }
  ] }
  // { path: '', component: EntryComponent },
  // { path: 'game/:galaxyId', component: GameComponent },
  // { path: 'planet/:planetId', outlet: 'data', component: PlanetComponent },
  // { path: 'traderoute', outlet: 'data', component: TradeRoutesComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
