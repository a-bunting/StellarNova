import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Galaxy } from '../galaxy/galaxy.model';
import { SolarSystem } from '../galaxy/solarSystem.model';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {

  constructor(
    private http: HttpClient
  ) { }

  ngOnInit(): void {
  }

  width: number = 30;
  height: number = 30;
  depth: number = 10;
  stars: number = 4000;

  generateUniverse(): void {
    // generate a galaxy..
    // do it on the client so they can see what it looks like in advance..

    // submit it to the backend to be parsed and added to the db...
    this.http.post<SolarSystem[]>(`${environment.apiUrl}/admin/generateUniverse`,
      { w: this.width, h: this.height, d: this.depth, s: this.stars })
      .subscribe({
        next: (result: SolarSystem[]) => {

        },
        error: (error) => {
          console.log(error);
        }
      });
  }

}
