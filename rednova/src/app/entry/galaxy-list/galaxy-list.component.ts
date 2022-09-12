import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthenticateService, User } from 'src/app/services/authenticate.service';
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
export class GalaxyListComponent implements OnInit, OnDestroy {

    constructor(
      private http: HttpClient,
      private router: Router,
      private authService: AuthenticateService
    ) { }

    galaxyList: Galaxy[] = [];
    subscriptions: Subscription[] = [];
    user: User;

    ngOnInit(): void {
      // load gaalxyies for this user.
      const newUserLogin: Subscription = this.authService.user.subscribe((user: User) => {
        if(user) {
          this.user = user;
          this.loadGalaxies();
        } else {
          this.user = null;
          this.galaxyList = [];
        }
      })

      this.subscriptions.push(newUserLogin);
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((a: Subscription) => a.unsubscribe() );
    }

    loadingGalaxies: boolean = false;

    loadGalaxies(): void {

      this.loadingGalaxies = true;

      this.http.get<DatabaseResult>(`${environment.apiUrl}/galaxy/getPlayableGalaxyList`).subscribe((data: DatabaseResult) => {
        this.loadingGalaxies = false;

        if(!data.error) {
          this.galaxyList = data.data.galaxyList;

          // convert the timestamps into what we need
          // 2022-07-08T06:31:23.000Z to 2022-07-08
          for(let i = 0 ; i < this.galaxyList.length ; i++) {
            let time: string[] = this.galaxyList[i].startTime.split('T')[0].split('-');
            this.galaxyList[i].startTime = `${time[2]}-${time[1]}-${time[0]}`;
          }
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
      this.router.navigate(['/game', galaxyId]);
    }

}
