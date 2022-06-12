import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { AuthenticateService, User } from 'src/app/services/authenticate.service';
import { DatabaseResult } from 'src/app/services/interfaces';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-authenticate',
  templateUrl: './authenticate.component.html',
  styleUrls: ['./authenticate.component.scss']
})
export class AuthenticateComponent implements OnInit {

  user: User;

  constructor(
    private authService: AuthenticateService,
    private http: HttpClient

  ) {
    this.authService.user.subscribe((user: User) => { this.user = user; })
  }

  ngOnInit(): void {
  }

  loginAdmin(): void {
    let email: string = 'alex.bunting@gmail.com';
    let password: string = 'pies';
    this.login(email, password);
  }

  loginRegular(): void {
    let email: string = 'abunting@asd.edu.qa';
    let password: string = 'pies';
    this.login(email, password);
  }

  login(email: string, password: string): void {
    this.authService.login(email, password).subscribe((res) => {
      console.log(res);
    });
  }

  logout(): void {
    this.authService.logout();
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



}
