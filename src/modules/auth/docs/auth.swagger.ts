import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthResponse } from '../dto/auth.dto';

export function ApiAuthController() {
  return applyDecorators(ApiTags('auth'));
}

export function ApiSignUp() {
  return applyDecorators(
    ApiOperation({
      summary: 'register',
      description: 'create user row',
    }),
    ApiOkResponse({
      type: AuthResponse,
    }),
    ApiBadRequestResponse({ description: 'Validation errors' }),
    ApiConflictResponse({
      description: 'User with this login is already esists',
    }),
  );
}

export function ApiSignIn() {
  return applyDecorators(
    ApiOperation({
      summary: 'login',
      description: 'get tokens pair',
    }),
    ApiOkResponse({
      type: AuthResponse,
    }),
    ApiBadRequestResponse({ description: 'Validation errors' }),
    ApiNotFoundResponse({ description: 'User not found' }),
  );
}

export function ApiRefresh() {
  return applyDecorators(
    ApiOperation({
      summary: 'refresh tokens',
      description: 'get tokens pair by refresh token',
    }),
    ApiOkResponse({
      type: AuthResponse,
    }),
    ApiUnauthorizedResponse({ description: 'invalid refresh token' }),
  );
}

export function ApiSignOut() {
  return applyDecorators(
    ApiOperation({
      summary: 'logout',
      description: 'delete reshresh token cookie',
    }),
  );
}

export function ApiGetCurrentUser() {
  return applyDecorators(
    ApiOperation({
      summary: 'get current user',
    }),
    ApiUnauthorizedResponse({ description: 'invalid refresh token' }),
  );
}
