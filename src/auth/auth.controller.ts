import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CredentialsDto } from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: CredentialsDto, @Headers('x-register-key') registerKey?: string) {
    return this.auth.registerAdmin(dto, registerKey);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body() dto: CredentialsDto) {
    return this.auth.login(dto);
  }
}
