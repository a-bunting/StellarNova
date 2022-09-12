import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthenticateService, User } from 'src/app/services/authenticate.service';
import { DatabaseResult } from 'src/app/services/interfaces';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-authenticate',
  templateUrl: './authenticate.component.html',
  styleUrls: ['./authenticate.component.scss']
})
export class AuthenticateComponent implements OnInit, OnDestroy {

  user: User;
  persistentUsers: { username: string, password: string, email: string }[]  = [
    { username: 'Admin', email: 'alex.bunting@gmail.com', password: 'pies' },
    { username: 'Regular', email: 'abunting@asd.edu.qa', password: 'pies' }
  ];
  storedUsers: { username: string, password: string, email: string }[] = [ ];

  subscriptions: Subscription[] = [];

  constructor(
    private authService: AuthenticateService,
    private http: HttpClient
  ) {
    this.authService.user.subscribe((user: User) => { this.user = user; })
  }

  ngOnInit(): void {
    this.getStoredUsers();

    // new user subscription
    const newUserSub: Subscription = this.authService.newUserRegistered.subscribe({
      next: (newUser: boolean) => {
        this.getStoredUsers();
      }
    })

    this.subscriptions = [newUserSub];
  }

  ngOnDestroy(): void {
      this.subscriptions.forEach((a: Subscription) => a.unsubscribe());
  }

  getStoredUsers(): void {
    // get any storaged users.
    const savedUsers: { username: string, password: string, email: string }[] = localStorage.getItem('rednova-anon') ? JSON.parse(localStorage.getItem('rednova-anon')) : [];
    // if data exists then ptu it in a select box...
    this.storedUsers = [...this.persistentUsers,...savedUsers];
  }

  login(): void {
    this.authService.login(this.loadedAccount.email, this.loadedAccount.password).subscribe((res) => {
      console.log(res);
    });
  }

  logout(): void {
    this.authService.logout();
  }

  loadedAccount: { username: string, password: string, email: string } = { username: '', password: '', email: '' };
  storedLocally: boolean = false;

  selectAccount(event: any): void {
    const foundAccount: { username: string, password: string, email: string } = this.storedUsers.find((a: { username: string, password: string, email: string }) => a.email === event.target.value);
    if(foundAccount) { this.loadedAccount = foundAccount; this.storedLocally = true; }
  }

  // test functions
  // delete for priduction
  checkAuth(): void {
    this.http.get<DatabaseResult>(`${environment.apiUrl}/user/checkAuth`).subscribe((result: DatabaseResult) => {
      console.log(!result.error);
    })
  }

  checkAdmin(): void {
    this.http.get<DatabaseResult>(`${environment.apiUrl}/user/checkAdmin`).subscribe((result: DatabaseResult) => {
      console.log(!result.error);
    })
  }

  removeFromSaved(): void {
    const savedUsers: { username: string, password: string, email: string }[] = JSON.parse(localStorage.getItem('rednova-anon'));

    if(savedUsers) {
      const ind: number = savedUsers.findIndex((a: { username: string, password: string, email: string }) => a.email === this.loadedAccount.email);

      if(ind !== 0) {
        savedUsers.splice(ind, 1);
        localStorage.setItem('rednova-anon', JSON.stringify(savedUsers));
      }
    }
    this.getStoredUsers();
  }

  removeAllFromSaved(): void {
    localStorage.removeItem('rednova-anon');
    this.getStoredUsers();
  }


}

