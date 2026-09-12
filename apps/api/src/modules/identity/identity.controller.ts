import {
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser, AuthTokens } from '@petdots/contracts';
import { ZodResponse } from 'nestjs-zod';

import type { AuthenticatedRequest } from '../../common/guards/authenticated-request.js';
import { Public } from '../../common/guards/public.decorator.js';
import { FindAuthenticatedUserUseCase } from './application/find-authenticated-user.use-case.js';
import { LoginUseCase } from './application/login.use-case.js';
import { LogoutUseCase } from './application/logout.use-case.js';
import { RefreshTokensUseCase } from './application/refresh-tokens.use-case.js';
import { RegisterUserUseCase } from './application/register-user.use-case.js';
import { EmailAlreadyRegisteredError } from './domain/email-already-registered.error.js';
import { InvalidCredentialsError } from './domain/invalid-credentials.error.js';
import {
  AuthenticatedUserDto,
  AuthTokensDto,
  LoginRequestDto,
  LogoutRequestDto,
  RefreshRequestDto,
  RegisterRequestDto,
} from './identity.dto.js';

/**
 * 🔴 The single body every authentication failure produces.
 *
 * A constant, not a literal written at each call site: three identical objects
 * are three chances for one of them to gain a word that says which check
 * failed. `UNAUTHENTICATED` is the generic code of the `401` (ERROR_MODEL) —
 * naming the condition is exactly what must not happen here.
 */
const INVALID_CREDENTIALS = {
  code: 'UNAUTHENTICATED',
  message: 'E-mail ou senha inválidos.',
} as const;

/**
 * The auth routes are **actions**, not CRUD resources — `/auth/login` rather
 * than a `sessions` collection. It is the pragmatic exception to "no verbs in
 * the URL" already recorded in AUTHENTICATION and API_GUIDELINES.
 *
 * ⚠️ `@Public()` is on the four **handlers**, never on the class: since pd-13
 * the guards are global, and `/auth/me` is the one route here that must stay
 * closed. Marking the class open would silently open it too.
 */
@ApiTags('identity')
@Controller('auth')
export class IdentityController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly login: LoginUseCase,
    private readonly refreshTokens: RefreshTokensUseCase,
    private readonly logout: LogoutUseCase,
    private readonly findAuthenticatedUser: FindAuthenticatedUserUseCase,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ZodResponse({ status: HttpStatus.CREATED, type: AuthTokensDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'E-mail já cadastrado.' })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Falha de validação.' })
  async register(@Body() body: RegisterRequestDto): Promise<AuthTokens> {
    try {
      return await this.registerUser.execute(body);
    } catch (error) {
      if (error instanceof EmailAlreadyRegisteredError) {
        // The body carries the specific code; the exception filter honours it
        // instead of falling back to the generic one for 409 (ERROR_MODEL).
        throw new ConflictException({
          code: 'EMAIL_ALREADY_REGISTERED',
          message: 'Este e-mail já está cadastrado.',
        });
      }

      throw error;
    }
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ status: HttpStatus.OK, type: AuthTokensDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'E-mail ou senha inválidos.' })
  async signIn(@Body() body: LoginRequestDto): Promise<AuthTokens> {
    try {
      return await this.login.execute(body);
    } catch (error) {
      throw toHttpError(error);
    }
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ status: HttpStatus.OK, type: AuthTokensDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Refresh token inválido.' })
  async refresh(@Body() body: RefreshRequestDto): Promise<AuthTokens> {
    try {
      return await this.refreshTokens.execute(body);
    } catch (error) {
      throw toHttpError(error);
    }
  }

  /**
   * `204` whether or not the token was live: the response says the session is
   * over, which is true either way, and a `404` would confirm which strings are
   * real tokens.
   */
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Sessão encerrada.' })
  async signOut(@Body() body: LogoutRequestDto): Promise<void> {
    await this.logout.execute(body);
  }

  /**
   * The current session, and the first authenticated route of the API.
   *
   * Under `/auth/` rather than `/users/me` because what it answers is "who is
   * this request", not "give me the user resource" — the same actions exception
   * the rest of this controller lives under.
   */
  @Get('me')
  @ApiBearerAuth()
  @ZodResponse({ status: HttpStatus.OK, type: AuthenticatedUserDto })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Autenticação necessária.' })
  async me(@Req() request: AuthenticatedRequest): Promise<AuthenticatedUser> {
    // `AuthGuard` is global and this route is not `@Public()`, so a caller is
    // always present. Answering 401 rather than trusting the optional keeps the
    // day someone unmarks the route from becoming a 500 on a malformed id.
    if (!request.user) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    try {
      return await this.findAuthenticatedUser.execute(request.user.id);
    } catch (error) {
      throw toHttpError(error);
    }
  }
}

function toHttpError(error: unknown): unknown {
  return error instanceof InvalidCredentialsError
    ? new UnauthorizedException(INVALID_CREDENTIALS)
    : error;
}
