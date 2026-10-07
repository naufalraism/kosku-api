import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  findByEmail(email: string) {
    return this.repo.findOneBy({ email });
  }

  count() {
    return this.repo.count();
  }

  create(email: string, passwordHash: string) {
    return this.repo.save(this.repo.create({ email, passwordHash }));
  }
}
