import { Component } from '@angular/core';
import { Route, Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  title = 'RedNova';
  routes: Route[];

  constructor(
    private router: Router
  ) {
    this.routes = router.config;
  }
}
