import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, take, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { DatabaseResult } from './interfaces';


export interface User {
  email: string; joined: string; token: string; username: string;
}

@Injectable({
  providedIn: 'root'
})

export class AuthenticateService {

  user: BehaviorSubject<User> = new BehaviorSubject(null);
  loggedIn: boolean = false;

  constructor(
    private http: HttpClient
  ) { }

  login(email: string, password: string): Observable<any> {
    return this.http.get<DatabaseResult>(`${environment.apiUrl}/user/login?email=${email}&password=${password}`).pipe(take(1), tap((res: DatabaseResult) => {
      if(!res.error) {
        const userInfo: User = res.data;
        this.handleAuth(userInfo);
      }
    }));
  }

  logout(): void {
    localStorage.removeItem('rednovaUserAuth');
    this.user.next(null);
    this.loggedIn = false;
  }

  checkLoggedInStatus(): void {
    const user: User = JSON.parse(localStorage.getItem('rednovaUserAuth'));

    if(user) {
      this.http.get<DatabaseResult>(`${environment.apiUrl}/user/checkAuth`).subscribe((result: DatabaseResult) => {

        console.log(result);

        if(!result.error) {
          this.user.next(user);
        } else {
          this.logout();
        }
      })
    }
  }

  handleAuth(userInfo: User): void {
    localStorage.setItem('rednovaUserAuth', JSON.stringify(userInfo));
    this.loggedIn = true;
    this.user.next(userInfo);
  }
}
