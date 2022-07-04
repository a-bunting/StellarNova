import { NgModule } from '@angular/core';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AuthenticateComponent } from './components/authenticate/authenticate.component';
import { AdminComponent } from './admin/admin.component';
import { FormsModule } from '@angular/forms';
import { TokenInterceptor } from './interceptors/token';
import { GameComponent } from './game/game.component';
import { EntryComponent } from './entry/entry.component';
import { GalaxyListComponent } from './entry/galaxy-list/galaxy-list.component';
import { PlanetComponent } from './planet/planet.component';
import { ShipoverviewComponent } from './shipoverview/shipoverview.component';
import { ConsoleComponent } from './console/console.component';

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    AuthenticateComponent,
    AdminComponent,
    GameComponent,
    EntryComponent,
    GalaxyListComponent,
    PlanetComponent,
    ShipoverviewComponent,
    ConsoleComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: TokenInterceptor, multi: true}
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
