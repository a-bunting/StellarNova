import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, take, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthenticateService {

  constructor(
    private http: HttpClient
  ) { }

  login(email: string, password: string): Observable<any> {
    return this.http.get(`http://localhost:3002/api/user/login?email=${email}&password=${password}`).pipe(take(1), tap((res) => {

    }));
  }
}
