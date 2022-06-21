import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DatabaseResult } from 'src/app/services/interfaces';
import { environment } from 'src/environments/environment';

interface Galaxy {
  id: number; name: string; member: boolean; startTime: string;
}

@Component({
  selector: 'app-galaxy-list',
  templateUrl: './galaxy-list.component.html',
  styleUrls: ['./galaxy-list.component.scss']
})
export class GalaxyListComponent implements OnInit {

    constructor(
      private http: HttpClient,
      private router: Router
    ) { }

    galaxyList: Galaxy[] = [];

    ngOnInit(): void {
      this.loadGalaxies();
    }

    loadGalaxies(): void {
      this.http.get<DatabaseResult>(`${environment.apiUrl}/galaxy/getPlayableGalaxyList`).subscribe((data: DatabaseResult) => {
        if(!data.error) {
          console.log(data);
          this.galaxyList = data.data.galaxyList;
        } else {
          console.log(`Error retriving galaxy list: ${data.message}`);
        }
      })
    }

    /**
     * Joijns the identified galaxy.
     * @param galaxyId
     */
    joinGalaxy(galaxyId: number): void {
      const subscription: Subscription = this.http.post<DatabaseResult>(`${environment.apiUrl}/galaxy/joinGalaxy`, { galaxyId: galaxyId }).subscribe((data: DatabaseResult) => {
        if(!data.error) {
          for(let i = 0 ; i < this.galaxyList.length ; i++) {
            if(this.galaxyList[i].id === galaxyId) {
              this.galaxyList[i].member = true;
            }
          }
        }
        subscription.unsubscribe();
      })
    }

    /**
     * Loads the galaxy you want to play
     * @param galaxyId
     */
    playGalaxy(galaxyId: number): void {
      this.router.navigate(['/game'], { queryParams: { galaxyId: galaxyId }});
    }

}
