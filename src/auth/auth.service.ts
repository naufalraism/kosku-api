import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { CredentialsDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  // Only the very first admin can be created this way.
  async registerFirstAdmin(dto: CredentialsDto) {
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
}
