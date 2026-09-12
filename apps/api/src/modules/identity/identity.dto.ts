import {
  authTokensSchema,
  loginRequestSchema,
  logoutRequestSchema,
  refreshRequestSchema,
  registerRequestSchema,
} from '@petdots/contracts';
import { createZodDto } from 'nestjs-zod';

export class RegisterRequestDto extends createZodDto(registerRequestSchema) {}
export class LoginRequestDto extends createZodDto(loginRequestSchema) {}
export class RefreshRequestDto extends createZodDto(refreshRequestSchema) {}
export class LogoutRequestDto extends createZodDto(logoutRequestSchema) {}
export class AuthTokensDto extends createZodDto(authTokensSchema) {}
