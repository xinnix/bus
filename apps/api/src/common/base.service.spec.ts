import { describe, it, expect, beforeEach } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { createPrismaMock } from '../test/prisma-mock';
import { BaseService } from './base.service';

class TestService extends BaseService<'todo'> {
  constructor(prisma: any) {
    super(prisma, 'todo');
  }

  testCheckOwnership(id: string, userId: string, field = 'createdById') {
    return this.checkOwnership(id, userId, field);
  }
}

describe('BaseService', () => {
  let prisma: any;
  let service: TestService;

  beforeEach(() => {
    prisma = createPrismaMock(['todo']);
    service = new TestService(prisma);
  });

  describe('list', () => {
    it('returns paginated results', async () => {
      const items = [{ id: '1', name: 'Test' }];
      prisma.todo.findMany.mockResolvedValue(items);
      prisma.todo.count.mockResolvedValue(1);

      const result = await service.list({ skip: 0, take: 10 });
      expect(result).toEqual({
        data: items,
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });
    });

    it('calculates correct page number', async () => {
      prisma.todo.findMany.mockResolvedValue([]);
      prisma.todo.count.mockResolvedValue(25);

      const result = await service.list({ skip: 10, take: 10 });
      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(3);
    });

    it('uses default pageSize when take not provided', async () => {
      prisma.todo.findMany.mockResolvedValue([]);
      prisma.todo.count.mockResolvedValue(0);

      const result = await service.list();
      expect(result.pageSize).toBe(10);
    });
  });

  describe('getOne', () => {
    it('returns record when found', async () => {
      const record = { id: '1', name: 'Test' };
      prisma.todo.findUnique.mockResolvedValue(record);

      const result = await service.getOne('1');
      expect(result).toEqual(record);
    });

    it('returns null when not found', async () => {
      prisma.todo.findUnique.mockResolvedValue(null);

      const result = await service.getOne('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getOneOrThrow', () => {
    it('returns record when found', async () => {
      const record = { id: '1', name: 'Test' };
      prisma.todo.findUnique.mockResolvedValue(record);

      const result = await service.getOneOrThrow('1');
      expect(result).toEqual(record);
    });

    it('throws NotFoundException when not found', async () => {
      prisma.todo.findUnique.mockResolvedValue(null);

      await expect(service.getOneOrThrow('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a record', async () => {
      const input = { name: 'New' };
      const created = { id: '1', ...input };
      prisma.todo.create.mockResolvedValue(created);

      const result = await service.create(input);
      expect(result).toEqual(created);
      expect(prisma.todo.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'New' }) }),
      );
    });

    it('injects userId into createdById and updatedById', async () => {
      prisma.todo.create.mockResolvedValue({ id: '1' });

      await service.create({ name: 'New' }, { userId: 'user-1' });
      expect(prisma.todo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ createdById: 'user-1', updatedById: 'user-1' }),
        }),
      );
    });
  });

  describe('update', () => {
    it('updates a record', async () => {
      const updated = { id: '1', name: 'Updated' };
      prisma.todo.update.mockResolvedValue(updated);

      const result = await service.update('1', { name: 'Updated' });
      expect(result).toEqual(updated);
    });

    it('injects userId into updatedById', async () => {
      prisma.todo.update.mockResolvedValue({ id: '1' });

      await service.update('1', { name: 'Updated' }, { userId: 'user-1' });
      expect(prisma.todo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ updatedById: 'user-1' }),
        }),
      );
    });
  });

  describe('remove', () => {
    it('deletes a record', async () => {
      const deleted = { id: '1' };
      prisma.todo.delete.mockResolvedValue(deleted);

      const result = await service.remove('1');
      expect(result).toEqual(deleted);
      expect(prisma.todo.delete).toHaveBeenCalledWith({ where: { id: '1' } });
    });
  });

  describe('removeMany', () => {
    it('deletes multiple records', async () => {
      prisma.todo.deleteMany.mockResolvedValue({ count: 2 });

      const result = await service.removeMany(['1', '2']);
      expect(result).toEqual({ count: 2 });
      expect(prisma.todo.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['1', '2'] } },
      });
    });
  });

  describe('count', () => {
    it('returns count', async () => {
      prisma.todo.count.mockResolvedValue(5);

      const result = await service.count();
      expect(result).toBe(5);
    });

    it('passes where clause', async () => {
      prisma.todo.count.mockResolvedValue(3);

      await service.count({ isActive: true });
      expect(prisma.todo.count).toHaveBeenCalledWith({ where: { isActive: true } });
    });
  });

  describe('exists', () => {
    it('returns true when record exists', async () => {
      prisma.todo.count.mockResolvedValue(1);

      const result = await service.exists({ name: 'Test' });
      expect(result).toBe(true);
    });

    it('returns false when no record exists', async () => {
      prisma.todo.count.mockResolvedValue(0);

      const result = await service.exists({ name: 'Nonexistent' });
      expect(result).toBe(false);
    });
  });

  describe('checkOwnership', () => {
    it('returns record when user is owner', async () => {
      const record = { id: '1', createdById: 'user-1' };
      prisma.todo.findUnique.mockResolvedValue(record);

      const result = await service.testCheckOwnership('1', 'user-1');
      expect(result).toEqual(record);
    });

    it('throws NotFoundException when record not found', async () => {
      prisma.todo.findUnique.mockResolvedValue(null);

      await expect(service.testCheckOwnership('1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user is not owner', async () => {
      prisma.todo.findUnique.mockResolvedValue({ id: '1', createdById: 'user-2' });

      await expect(service.testCheckOwnership('1', 'user-1')).rejects.toThrow(ForbiddenException);
    });
  });
});
