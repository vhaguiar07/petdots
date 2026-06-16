import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsPhoneNumber, IsString, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';
import { Match } from '../../../common/decorators/match.decorator';
import { IsStrongPassword } from '../../../common/decorators/is-strong-password.decorator';

export const SELF_REGISTERABLE_ROLES = [UserRole.CUSTOMER, UserRole.STORE_OWNER] as const;
export type SelfRegisterableRole = (typeof SELF_REGISTERABLE_ROLES)[number];

export class RegisterDto {
  @ApiProperty({ example: 'jane.doe@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongP@ssw0rd' })
  @IsString()
  @IsStrongPassword()
  password: string;

  @ApiProperty({ example: 'StrongP@ssw0rd', description: 'Deve ser igual a `password`' })
  @IsString()
  @Match('password', { message: 'A confirmação de senha não corresponde à senha informada' })
  passwordConfirmation: string;

  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: '(11) 99999-9999', required: false })
  @IsOptional()
  @IsPhoneNumber('BR')
  phone?: string;

  @ApiProperty({
    enum: SELF_REGISTERABLE_ROLES,
    default: UserRole.CUSTOMER,
    required: false,
    description: 'Perfil da conta. ADMIN não pode ser criado por este endpoint.',
  })
  @IsOptional()
  @IsIn(SELF_REGISTERABLE_ROLES)
  role?: SelfRegisterableRole;
}
