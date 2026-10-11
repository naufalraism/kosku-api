import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { timingSafeEqual } from 'crypto';
import { UsersService } from '../users/users.service';
import { CredentialsDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Creates the very first admin. Secure by default: registration only works when the
   * REGISTER_KEY environment variable is set AND the request sends the same value in the
   * X-Register-Key header. The key is checked before anything else so outsiders cannot
   * learn whether an admin already exists.
   */
  async registerFirstAdmin(dto: CredentialsDto, registerKey?: string) {
    if (!this.config.get<string>('REGISTER_KEY')) {
      throw new ForbiddenException('Registration is disabled');
    }
    if (!this.isValidRegisterKey(registerKey)) {
      throw new ForbiddenException('Invalid registration key');
    }
    if ((await this.users.count()) > 0) {
      throw new ForbiddenException('An admin already exists');
    }
    const hash = await bcrypt.hash(dto.password, 10);
    const user = await this.users.create(dto.email, hash);
    return { id: user.id, email: user.email };
  }

  async login(dto: CredentialsDto) {
    const user = await this.users.findByEmail(dto.email);
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email });
    return { accessToken };
  }

  // Constant-time comparison so response timing does not leak the key.
  private isValidRegisterKey(provided?: string): boolean {
    const expected = this.config.get<string>('REGISTER_KEY');
    if (!expected || !provided) return false;
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
