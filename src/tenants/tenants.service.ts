import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room, RoomStatus } from '../rooms/room.entity';
import { Tenant } from './tenant.entity';
import { CreateTenantDto, UpdateTenantDto } from './dto/tenant.dto';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant) private readonly repo: Repository<Tenant>,
    @InjectRepository(Room) private readonly rooms: Repository<Room>,
  ) {}

  async create(dto: CreateTenantDto) {
    if (dto.roomId) await this.occupy(dto.roomId);
    return this.repo.save(this.repo.create(dto));
  }

  findAll() {
    return this.repo.find({ relations: { room: true }, order: { name: 'ASC' } });
  }

  async findOne(id: string) {
    const tenant = await this.repo.findOne({ where: { id }, relations: { room: true } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto) {
    const tenant = await this.repo.findOneBy({ id });
    if (!tenant) throw new NotFoundException('Tenant not found');

    if (dto.roomId !== undefined && dto.roomId !== tenant.roomId) {
      if (dto.roomId) await this.occupy(dto.roomId);
      if (tenant.roomId) await this.release(tenant.roomId);
    }
    Object.assign(tenant, dto);
    await this.repo.save(tenant);
    return this.findOne(id);
  }

  async remove(id: string) {
    const tenant = await this.repo.findOneBy({ id });
    if (!tenant) throw new NotFoundException('Tenant not found');
    if (tenant.roomId) await this.release(tenant.roomId);
    await this.repo.remove(tenant);
    return { deleted: true };
  }

  private async occupy(roomId: string) {
    const room = await this.rooms.findOneBy({ id: roomId });
    if (!room) throw new NotFoundException('Room not found');
    if (room.status === RoomStatus.OCCUPIED) {
      throw new ConflictException(`Room ${room.number} is already occupied`);
    }
    room.status = RoomStatus.OCCUPIED;
    await this.rooms.save(room);
  }

  private async release(roomId: string) {
    await this.rooms.update({ id: roomId }, { status: RoomStatus.AVAILABLE });
  }
}
