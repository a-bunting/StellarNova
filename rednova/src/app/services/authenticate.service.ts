import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, take, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { DatabaseResult } from './interfaces';

export interface User {
  email: string; joined: string; token: string; username: string; admin: boolean;
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
        if(!result.error) {
          this.user.next(user);
        } else {
          this.logout();
        }
      })
    }
  }

  /**
   * Async check of whether the user is still authenticated.
   */
  checkAuth(): void {
    this.http.get<DatabaseResult>(`${environment.apiUrl}/user/checkAuth`).subscribe((result: DatabaseResult) => {
      // remain logged in if the user is stil authenticated...
      if(result.data.authenticated) this.loggedIn = true;
    })
  }

  /**
   * Checks for the users admin status and updates the main behaviour object asynchronously
   */
  checkAdmin(): void {
    this.http.get<DatabaseResult>(`${environment.apiUrl}/user/checkAdmin`).subscribe((result: DatabaseResult) => {
      this.user.next({...this.user.value, admin: result.data.admin});
    })
  }

  handleAuth(userInfo: User): void {
    localStorage.setItem('rednovaUserAuth', JSON.stringify(userInfo));
    this.loggedIn = true;
    this.user.next(userInfo);
  }
}
