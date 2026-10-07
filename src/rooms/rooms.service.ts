import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from './room.entity';
import { CreateRoomDto, UpdateRoomDto } from './dto/room.dto';

@Injectable()
export class RoomsService {
  constructor(@InjectRepository(Room) private readonly repo: Repository<Room>) {}

  async create(dto: CreateRoomDto) {
    if (await this.repo.existsBy({ number: dto.number })) {
      throw new ConflictException(`Room ${dto.number} already exists`);
    }
    return this.repo.save(this.repo.create(dto));
  }

  findAll() {
    return this.repo.find({ order: { number: 'ASC' } });
  }

  async findOne(id: string) {
    const room = await this.repo.findOneBy({ id });
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }

  async update(id: string, dto: UpdateRoomDto) {
    const room = await this.findOne(id);
    Object.assign(room, dto);
    return this.repo.save(room);
  }

  async remove(id: string) {
    const room = await this.findOne(id);
    await this.repo.remove(room);
    return { deleted: true };
  }
}
