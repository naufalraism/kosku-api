import { ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService.registerFirstAdmin', () => {
  const dto = { email: 'admin@example.com', password: 'a-strong-password' };
  const jwt = { signAsync: jest.fn() };
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
      findByEmail: jest.fn(),
    };
  });

  it('is disabled when REGISTER_KEY is not configured', async () => {
    await expect(build(undefined).registerFirstAdmin(dto, 'anything')).rejects.toThrow(ForbiddenException);
    expect(users.create).not.toHaveBeenCalled();
  });

  it('rejects a missing or wrong key', async () => {
    const service = build('the-real-key');
    await expect(service.registerFirstAdmin(dto, undefined)).rejects.toThrow(ForbiddenException);
    await expect(service.registerFirstAdmin(dto, 'a-wrong-key')).rejects.toThrow(ForbiddenException);
    expect(users.create).not.toHaveBeenCalled();
  });

  it('creates the first admin with the correct key and stores only a hash', async () => {
    const result = await build('the-real-key').registerFirstAdmin(dto, 'the-real-key');

    expect(result).toEqual({ id: 'u1', email: dto.email });
    expect(users.create).toHaveBeenCalledWith(dto.email, expect.not.stringContaining(dto.password));
  });

  it('refuses to create a second admin even with the correct key', async () => {
    users.count.mockResolvedValue(1);

    await expect(build('the-real-key').registerFirstAdmin(dto, 'the-real-key')).rejects.toThrow(ForbiddenException);
    expect(users.create).not.toHaveBeenCalled();
  });
});
