import { ConflictException, ForbiddenException, HttpException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const jwt = { signAsync: jest.fn(async () => 'signed-token') };
  let users: { count: jest.Mock; create: jest.Mock; findByEmail: jest.Mock };

  function build(registerKey?: string) {
    const config = {
      get: jest.fn((key: string) => (key === 'REGISTER_KEY' ? registerKey : undefined)),
    };
    return new AuthService(users as never, jwt as never, config as never);
  }

  beforeEach(() => {
    users = {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(async (email: string) => ({ id: 'u1', email })),
      findByEmail: jest.fn().mockResolvedValue(null),
    };
  });

  describe('registerAdmin', () => {
    const dto = { email: 'admin@example.com', password: 'a-strong-password' };

    it('is disabled when REGISTER_KEY is not configured', async () => {
      await expect(build(undefined).registerAdmin(dto, 'anything')).rejects.toThrow(ForbiddenException);
      expect(users.create).not.toHaveBeenCalled();
    });

    it('rejects a missing or wrong key', async () => {
      const service = build('the-real-key');
      await expect(service.registerAdmin(dto, undefined)).rejects.toThrow(ForbiddenException);
      await expect(service.registerAdmin(dto, 'a-wrong-key')).rejects.toThrow(ForbiddenException);
      expect(users.create).not.toHaveBeenCalled();
    });

    it('creates an admin with the correct key and stores only a hash', async () => {
      const result = await build('the-real-key').registerAdmin(dto, 'the-real-key');

      expect(result).toEqual({ id: 'u1', email: dto.email });
      expect(users.create).toHaveBeenCalledWith(dto.email, expect.not.stringContaining(dto.password));
    });

    it('allows a second admin when an account already exists', async () => {
      users.count.mockResolvedValue(1);

      await build('the-real-key').registerAdmin({ ...dto, email: 'owner@example.com' }, 'the-real-key');

      expect(users.create).toHaveBeenCalledWith('owner@example.com', expect.any(String));
    });

    it('rejects an email that is already registered', async () => {
      users.findByEmail.mockResolvedValue({ id: 'existing' });

      await expect(build('the-real-key').registerAdmin(dto, 'the-real-key')).rejects.toThrow(ConflictException);
      expect(users.create).not.toHaveBeenCalled();
    });

    it('stores the email in lower case', async () => {
      await build('the-real-key').registerAdmin({ ...dto, email: 'Admin@Example.COM' }, 'the-real-key');

      expect(users.create).toHaveBeenCalledWith('admin@example.com', expect.any(String));
    });
  });

  describe('login rate limiting', () => {
    const email = 'owner@example.com';
    const goodPassword = 'correct-password';
    const wrong = { email, password: 'wrong-password' };
    const right = { email, password: goodPassword };
    let now = 1_000_000;
    let dateSpy: jest.SpyInstance;

    beforeEach(() => {
      now = 1_000_000;
      dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => now);
      const user = { id: 'u1', email, passwordHash: bcrypt.hashSync(goodPassword, 4) };
      users.findByEmail.mockImplementation(async (value: string) =>
        value.trim().toLowerCase() === email ? user : null,
      );
    });

    afterEach(() => {
      dateSpy.mockRestore();
    });

    async function fail(service: AuthService, times: number, credentials = wrong) {
      for (let i = 0; i < times; i += 1) {
        await expect(service.login(credentials)).rejects.toThrow(UnauthorizedException);
      }
    }

    it('logs in with correct credentials', async () => {
      const result = await build().login(right);

      expect(result).toEqual({ accessToken: 'signed-token' });
    });

    it('locks an email after 5 failed attempts, even for the correct password', async () => {
      const service = build();
      await fail(service, 5);

      const error = await service.login(right).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(429);
    });

    it('a successful login resets the counter', async () => {
      const service = build();
      await fail(service, 4);
      await service.login(right);

      await fail(service, 4);
    });

    it('lets the email try again once the window has passed', async () => {
      const service = build();
      await fail(service, 5);

      now += 15 * 60 * 1000;

      await expect(service.login(right)).resolves.toEqual({ accessToken: 'signed-token' });
    });

    it('tracks different emails separately and ignores letter case', async () => {
      const service = build();
      await fail(service, 3, { email: 'Owner@Example.com', password: 'wrong-password' });
      await fail(service, 2, wrong);

      const locked = await service.login(right).catch((e: unknown) => e);
      expect((locked as HttpException).getStatus()).toBe(429);

      await expect(service.login({ email: 'someone-else@example.com', password: 'x' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('also locks emails that do not exist, so the lock reveals nothing', async () => {
      const service = build();
      const unknown = { email: 'nobody@example.com', password: 'whatever-123' };
      await fail(service, 5, unknown);

      const error = await service.login(unknown).catch((e: unknown) => e);

      expect((error as HttpException).getStatus()).toBe(429);
    });
  });
});
