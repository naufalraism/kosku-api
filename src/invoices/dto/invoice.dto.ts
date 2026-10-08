import { IsEnum, IsOptional, Matches } from 'class-validator';
import { InvoiceStatus } from '../invoice.entity';

const PERIOD_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;
const PERIOD_MESSAGE = 'period must be in YYYY-MM format, e.g. 2026-10';

export class GenerateInvoicesDto {
  @Matches(PERIOD_REGEX, { message: PERIOD_MESSAGE })
  period: string;
}

export class PeriodQueryDto {
  @Matches(PERIOD_REGEX, { message: PERIOD_MESSAGE })
  period: string;
}

export class ListInvoicesDto {
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @Matches(PERIOD_REGEX, { message: PERIOD_MESSAGE })
  period?: string;
}
