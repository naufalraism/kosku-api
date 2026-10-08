import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GenerateInvoicesDto, ListInvoicesDto, PeriodQueryDto } from './dto/invoice.dto';
import { InvoicesService } from './invoices.service';

@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Post('generate')
  generate(@Body() dto: GenerateInvoicesDto) {
    return this.invoices.generate(dto.period);
  }

  @Get()
  findAll(@Query() query: ListInvoicesDto) {
    return this.invoices.findAll(query);
  }

  // Static routes must stay above ':id'
  @Get('overdue')
  overdue() {
    return this.invoices.overdue();
  }

  @Get('summary')
  summary(@Query() query: PeriodQueryDto) {
    return this.invoices.summary(query.period);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoices.findOne(id);
  }

  @Patch(':id/pay')
  markPaid(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoices.markPaid(id);
  }
}
