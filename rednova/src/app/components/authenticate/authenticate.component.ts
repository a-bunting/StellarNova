import { Component, OnInit } from '@angular/core';
import { AuthenticateService, User } from 'src/app/services/authenticate.service';

@Component({
  selector: 'app-authenticate',
  templateUrl: './authenticate.component.html',
  styleUrls: ['./authenticate.component.scss']
})
export class AuthenticateComponent implements OnInit {

  user: User;

  constructor(
    private authService: AuthenticateService
  ) {
    this.authService.user.subscribe((user: User) => { this.user = user; })
  }

  ngOnInit(): void {
  }

  login(): void {
    let email: string = 'alex.bunting@gmail.com';
    let password: string = 'pies';

    this.authService.login(email, password).subscribe((res) => {
      console.log(res);
    });
  }

  logout(): void {
    this.authService.logout();
  }



}
