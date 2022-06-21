import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EntryComponent } from './entry/entry.component';
import { GameComponent } from './game/game.component';

const routes: Routes = [
  { path: '', component: EntryComponent },
  { path: 'game', component: GameComponent, children: [
    { path: ':id', component: GameComponent }
  ] }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
