import { Component, OnInit } from '@angular/core';
import { AuthenticateService } from 'src/app/services/authenticate.service';

@Component({
  selector: 'app-authenticate',
  templateUrl: './authenticate.component.html',
  styleUrls: ['./authenticate.component.scss']
})
export class AuthenticateComponent implements OnInit {

  constructor(
    private authService: AuthenticateService
  ) { }

  ngOnInit(): void {
  }

  login(): void {
    let email: string = 'alex.bunting@gmail.com';
    let password: string = 'pies';

    this.authService.login(email, password).subscribe((res) => {
      console.log(res);
    });
  }



}
