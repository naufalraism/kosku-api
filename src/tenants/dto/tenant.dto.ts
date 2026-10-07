import { PartialType } from '@nestjs/mapped-types';
import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsOptional()
  @IsUUID()
  roomId?: string | null;

  @IsDateString()
  moveInDate: string;

  @IsOptional()
  @IsDateString()
  leaseEnd?: string | null;
}

export class UpdateTenantDto extends PartialType(CreateTenantDto) {}
