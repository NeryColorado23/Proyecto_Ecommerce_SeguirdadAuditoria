import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Mínimo 8 caracteres, con mayúscula, minúscula y número. */
export function strongPasswordValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value: string = control.value ?? '';
    if (!value) {
      return null;
    }

    const hasUpper = /[A-Z]/.test(value);
    const hasLower = /[a-z]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    const isLongEnough = value.length >= 8;

    return hasUpper && hasLower && hasNumber && isLongEnough ? null : { strongPassword: true };
  };
}
