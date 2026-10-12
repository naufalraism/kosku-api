import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { timingSafeEqual } from 'crypto';
import { UsersService } from '../users/users.service';
import { CredentialsDto } from './auth.dto';

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const PRUNE_THRESHOLD = 1000;

interface FailureRecord {
  count: number;
  windowStart: number;
}

@Injectable()
export class AuthService {
  // Failed login attempts per email, kept in memory (they reset when the server restarts).
  private readonly failedLogins = new Map<string, FailureRecord>();

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Creates an admin account. Secure by default: it only works when the REGISTER_KEY
   * environment variable is set AND the request sends the same value in the X-Register-Key
   * header. The key is checked first so outsiders learn nothing about existing accounts.
   */
  async registerAdmin(dto: CredentialsDto, registerKey?: string) {
    if (!this.config.get<string>('REGISTER_KEY')) {
      throw new ForbiddenException('Registration is disabled');
    }
    if (!this.isValidRegisterKey(registerKey)) {
      throw new ForbiddenException('Invalid registration key');
    }
    const email = dto.email.trim().toLowerCase();
    if (await this.users.findByEmail(email)) {
      throw new ConflictException('An account with this email already exists');
    }
    const hash = await bcrypt.hash(dto.password, 10);
    const user = await this.users.create(email, hash);
    return { id: user.id, email: user.email };
  }

  /**
   * After MAX_FAILED_LOGINS wrong attempts for the same email, further attempts get
   * 429 until LOCKOUT_WINDOW_MS has passed since the first failure. Unknown emails are
   * counted too, so the lock does not reveal which accounts exist.
   */
  async login(dto: CredentialsDto) {
    const key = dto.email.trim().toLowerCase();
    this.assertNotLocked(key);

    const user = await this.users.findByEmail(dto.email);
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      this.recordFailure(key);
      throw new UnauthorizedException('Invalid email or password');
    }

    this.failedLogins.delete(key);
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email });
    return { accessToken };
  }

  private assertNotLocked(key: string) {
    const record = this.failedLogins.get(key);
    if (!record) return;

    const now = Date.now();
    if (now - record.windowStart >= LOCKOUT_WINDOW_MS) {
      this.failedLogins.delete(key);
      return;
    }
    if (record.count >= MAX_FAILED_LOGINS) {
      const minutes = Math.max(1, Math.ceil((record.windowStart + LOCKOUT_WINDOW_MS - now) / 60000));
      throw new HttpException(
        `Too many failed login attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private recordFailure(key: string) {
    const now = Date.now();
    const record = this.failedLogins.get(key);
    if (!record || now - record.windowStart >= LOCKOUT_WINDOW_MS) {
      this.pruneExpired(now);
      this.failedLogins.set(key, { count: 1, windowStart: now });
      return;
    }
    record.count += 1;
  }

  // Keeps memory bounded if someone tries many different emails.
  private pruneExpired(now: number) {
    if (this.failedLogins.size < PRUNE_THRESHOLD) return;
    for (const [key, record] of this.failedLogins) {
      if (now - record.windowStart >= LOCKOUT_WINDOW_MS) this.failedLogins.delete(key);
    }
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
