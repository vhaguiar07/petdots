import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { Match } from '../../../common/decorators/match.decorator';
import { IsStrongPassword } from '../../../common/decorators/is-strong-password.decorator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'CurrentP@ssw0rd' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'NewStrongP@ssw0rd' })
  @IsString()
  @IsStrongPassword()
  newPassword: string;

  @ApiProperty({ example: 'NewStrongP@ssw0rd', description: 'Deve ser igual a `newPassword`' })
  @IsString()
  @Match('newPassword', { message: 'A confirmação de senha não corresponde à nova senha informada' })
  newPasswordConfirmation: string;
}
