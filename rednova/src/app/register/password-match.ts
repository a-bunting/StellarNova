import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";

export class PasswordMatch {
    static passwordMatchValidator(error: ValidationErrors): ValidatorFn {

        return (control: AbstractControl): { [key: string]: any } => {
            const password: string = control.get('password')?.value; // get password from our password form control
            const confirmPassword: string = control.get('repeatpassword')?.value; // get password from our confirmPassword form control
            // compare is the password math
            if (password !== confirmPassword) {
              // if they don't match, set an error in our confirmPassword form control
              control.get('repeatpassword')?.setErrors({ NoPasswordMatch: true });
            }
            return password == confirmPassword ? null! : error;
        }

      }
}
