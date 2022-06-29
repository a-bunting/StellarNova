import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EntryComponent } from './entry/entry.component';
import { GameComponent } from './game/game.component';
import { PlanetComponent } from './planet/planet.component';

const routes: Routes = [
  { path: '', component: EntryComponent },
  { path: 'game/:galaxyId', component: GameComponent, children: [
    { path: 'planet', component: PlanetComponent }
  ] }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
