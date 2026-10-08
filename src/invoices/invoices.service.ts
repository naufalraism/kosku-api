import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, LessThan, Repository } from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';
import { Invoice, InvoiceStatus } from './invoice.entity';
import { ListInvoicesDto } from './dto/invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice) private readonly repo: Repository<Invoice>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
  ) {}

  /**
   * Creates the invoices for one month (period = YYYY-MM).
   * Safe to run more than once: tenants that already have an invoice are skipped.
   */
  async generate(period: string) {
    const periodStart = `${period}-01`;
    const periodEnd = this.lastDayOf(period);

    const allTenants = await this.tenants.find({ relations: { room: true } });
    const eligible = allTenants.filter(
      (t) =>
        t.room &&
        t.moveInDate <= periodEnd &&
        (!t.leaseEnd || t.leaseEnd >= periodStart),
    );

    const existing = await this.repo.find({ where: { period } });
    const alreadyBilled = new Set(existing.map((i) => i.tenantId));

    const toCreate = eligible
      .filter((t) => !alreadyBilled.has(t.id))
      .map((t) =>
        this.repo.create({
          tenantId: t.id,
          period,
          amount: t.room!.price,
          dueDate: `${period}-10`,
        }),
      );

    const saved = toCreate.length > 0 ? await this.repo.save(toCreate) : [];
    return {
      period,
      created: saved.length,
      skipped: eligible.length - saved.length,
    };
  }

  findAll(query: ListInvoicesDto) {
    const where: FindOptionsWhere<Invoice> = {};
    if (query.status) where.status = query.status;
    if (query.period) where.period = query.period;
    return this.repo.find({
      where,
      relations: { tenant: true },
      order: { dueDate: 'ASC' },
    });
  }

  overdue() {
    return this.repo.find({
      where: { status: InvoiceStatus.UNPAID, dueDate: LessThan(this.todayInJakarta()) },
      relations: { tenant: true },
      order: { dueDate: 'ASC' },
    });
  }

  async summary(period: string) {
    const rows = await this.repo
      .createQueryBuilder('i')
      .select('i.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(i.amount), 0)', 'total')
      .where('i.period = :period', { period })
      .groupBy('i.status')
      .getRawMany<{ status: InvoiceStatus; count: string; total: string }>();

    let paid = { count: 0, total: 0 };
    let unpaid = { count: 0, total: 0 };
    for (const r of rows) {
      const entry = { count: Number(r.count), total: Number(r.total) };
      if (r.status === InvoiceStatus.PAID) paid = entry;
      else unpaid = entry;
    }
    return { period, paid, unpaid };
  }

  async findOne(id: string) {
    const invoice = await this.repo.findOne({ where: { id }, relations: { tenant: true } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async markPaid(id: string) {
    const invoice = await this.findOne(id);
    if (invoice.status === InvoiceStatus.PAID) {
      throw new ConflictException('Invoice is already paid');
    }
    invoice.status = InvoiceStatus.PAID;
    invoice.paidAt = new Date();
    return this.repo.save(invoice);
  }

  private lastDayOf(period: string) {
    const [year, month] = period.split('-').map(Number);
    const day = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return `${period}-${String(day).padStart(2, '0')}`;
  }

  // YYYY-MM-DD in the Jakarta time zone (en-CA formats dates as YYYY-MM-DD)
  private todayInJakarta() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  }
}
