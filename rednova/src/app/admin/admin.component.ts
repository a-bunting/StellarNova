import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Galaxy } from '../galaxy/galaxy.model';
import { AuthenticateService, User } from '../services/authenticate.service';
import { DatabaseResult } from '../services/interfaces';

interface GalaxyList {
  id: string, name: string, startTime: string;
}

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {

  galaxyList: GalaxyList[] = [];
  user: User;

  constructor(
    private http: HttpClient,
    private auth: AuthenticateService
  ) {
    this.auth.user.subscribe((user: User) => {
      this.user = user;

      if(this.user) {
        this.authenticated();
      } else {
        this.unauthenticated();
      }
    });
  }

  ngOnInit(): void {
  }

  authenticated(): void {
    this.getAllGalaxies();
  }

  unauthenticated(): void {
    this.galaxyList = [];
  }

  width: number = 20;
  height: number = 20;
  depth: number = 3;
  stars: number = 50;
  galaxyName: string = "";

  generateUniverse(): void {
    // generate a galaxy..
    // submit it to the backend to be parsed and added to the db...
    this.http.post<DatabaseResult>(`${environment.apiUrl}/administration/generateUniverse`,
      { w: this.width, h: this.height, d: this.depth, s: this.stars, name: this.galaxyName })
      .subscribe({
        next: (result: DatabaseResult) => {
          this.galaxyList.push({ id: result.data.id, startTime: result.data.startTime, name: result.data.name });
        },
        error: (error) => {
          console.log(error);
        }
      });
  }

  deleteUniverse(): void {
    const galaxyId: number = +(document.getElementById('galaxySelected') as HTMLOptionElement).value;
    console.log(galaxyId);

    this.http.post<DatabaseResult>(`${environment.apiUrl}/administration/deleteGalaxy`, { galaxyId: galaxyId }).subscribe((result: DatabaseResult) => {
      this.galaxyList = this.galaxyList.filter((galaxy: GalaxyList) => { return +galaxy.id !== galaxyId });
    })
  }

  showUniverse(): void {

  }

  getAllGalaxies(): void {
    this.http.get<DatabaseResult>(`${environment.apiUrl}/administration/getGalaxyList`).subscribe((res: DatabaseResult) => {
      this.galaxyList = res.data;
    })
  }

}
