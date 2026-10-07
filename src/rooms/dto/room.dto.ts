import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { RoomStatus } from '../room.entity';

export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  number: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;
}

export class UpdateRoomDto extends PartialType(CreateRoomDto) {}
