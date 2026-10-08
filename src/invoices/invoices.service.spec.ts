import { ConflictException, NotFoundException } from '@nestjs/common';
import { InvoiceStatus } from './invoice.entity';
import { InvoicesService } from './invoices.service';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let repo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let tenants: { find: jest.Mock };

  beforeEach(() => {
    // Fake repositories: no database needed for unit tests.
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => data),
    };
    tenants = { find: jest.fn() };
    service = new InvoicesService(repo as never, tenants as never);
  });

  describe('generate', () => {
    it('bills only tenants who have a room, are active in the month, and are not billed yet', async () => {
      tenants.find.mockResolvedValue([
        { id: 't1', moveInDate: '2026-09-01', leaseEnd: null, room: { price: 1500000 } }, // eligible
        { id: 't2', moveInDate: '2026-11-01', leaseEnd: null, room: { price: 1000000 } }, // moves in later
        { id: 't3', moveInDate: '2026-01-01', leaseEnd: '2026-09-30', room: { price: 900000 } }, // lease already ended
        { id: 't4', moveInDate: '2026-01-01', leaseEnd: null, room: null }, // no room
        { id: 't5', moveInDate: '2026-01-01', leaseEnd: null, room: { price: 800000 } }, // already billed
      ]);
      repo.find.mockResolvedValue([{ tenantId: 't5' }]);

      const result = await service.generate('2026-10');

      expect(result).toEqual({ period: '2026-10', created: 1, skipped: 1 });
      expect(repo.save).toHaveBeenCalledWith([
        expect.objectContaining({
          tenantId: 't1',
          period: '2026-10',
          amount: 1500000,
          dueDate: '2026-10-10',
        }),
      ]);
    });

    it('uses the real length of the month when deciding who has moved in', async () => {
      tenants.find.mockResolvedValue([
        { id: 'a', moveInDate: '2026-02-28', leaseEnd: null, room: { price: 1 } }, // last day of Feb 2026
        { id: 'b', moveInDate: '2026-03-01', leaseEnd: null, room: { price: 1 } }, // next month
      ]);
      repo.find.mockResolvedValue([]);

      const result = await service.generate('2026-02');

      expect(result.created).toBe(1);
      expect(repo.save).toHaveBeenCalledWith([expect.objectContaining({ tenantId: 'a' })]);
    });
  });

  describe('markPaid', () => {
    it('marks an unpaid invoice as paid and records the payment time', async () => {
      repo.findOne.mockResolvedValue({ id: 'i1', status: InvoiceStatus.UNPAID, paidAt: null });

      const result = await service.markPaid('i1');

      expect(result.status).toBe(InvoiceStatus.PAID);
      expect(result.paidAt).toBeInstanceOf(Date);
    });

    it('rejects an invoice that is already paid', async () => {
      repo.findOne.mockResolvedValue({ id: 'i1', status: InvoiceStatus.PAID, paidAt: new Date() });

      await expect(service.markPaid('i1')).rejects.toThrow(ConflictException);
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('throws NotFound when the invoice does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.markPaid('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
