import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  // Case-insensitive, so a phone keyboard that capitalises the first letter still finds the account.
  findByEmail(email: string) {
    return this.repo
      .createQueryBuilder('u')
      .where('LOWER(u.email) = LOWER(:email)', { email: email.trim() })
      .getOne();
  }

  count() {
    return this.repo.count();
  }

  create(email: string, passwordHash: string) {
    return this.repo.save(this.repo.create({ email, passwordHash }));
  }
}
