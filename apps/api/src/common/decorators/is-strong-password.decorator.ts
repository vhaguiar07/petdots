import { applyDecorators } from '@nestjs/common';
import { IsStrongPassword as IsStrongPasswordBase, MaxLength, MinLength } from 'class-validator';

/**
 * Exige senha com no mínimo 8 caracteres, incluindo letra maiúscula,
 * minúscula, número e símbolo.
 */
export function IsStrongPassword() {
  return applyDecorators(
    MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' }),
    MaxLength(72, { message: 'A senha deve ter no máximo 72 caracteres' }),
    IsStrongPasswordBase(
      { minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1 },
      {
        message:
          'A senha deve conter ao menos uma letra maiúscula, uma minúscula, um número e um caractere especial',
      },
    ),
  );
}
