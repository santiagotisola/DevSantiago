import { describe, it, expect, vi } from 'vitest';
import { VisitorService } from './visitor.service';
import { prismaMock } from '../../test/setup';
import { ForbiddenError } from '../../middleware/errorHandler';
import { VisitorStatus, UserRole } from '@prisma/client';

vi.mock('../../notifications/notification.service', () => ({
  NotificationService: { enqueue: vi.fn().mockResolvedValue(undefined) },
}));

const visitorService = new VisitorService();

// ─── Fixtures ────────────────────────────────────────────────────────────────
const ACTOR_DOORMAN = { userId: 'doorman-1', role: UserRole.DOORMAN };
const ACTOR_RESIDENT = { userId: 'resident-1', role: UserRole.RESIDENT };
const ACTOR_ADMIN = { userId: 'admin-1', role: UserRole.CONDOMINIUM_ADMIN };
const ACTOR_SUPER = { userId: 'super-1', role: UserRole.SUPER_ADMIN };

const mockUnit = { id: 'unit-1', condominiumId: 'condo-1' };
const mockMembershipDoorman = { unitId: null };
const mockMembershipResident = { unitId: 'unit-1' };

const mockVisitor = {
  id: 'visitor-1',
  unitId: 'unit-1',
  name: 'Carlos Visitante',
  document: '12345678',
  documentType: 'RG',
  phone: null,
  company: null,
  reason: null,
  scheduledAt: null,
  notes: null,
  photoUrl: null,
  status: VisitorStatus.PENDING,
  preAuthorizedBy: null,
  registeredBy: null,
  entryAt: null,
  exitAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  serviceProviderId: null,
};

// ─── create ───────────────────────────────────────────────────────────────────
describe('VisitorService.create', () => {
  it('porteiro registra visitante com status PENDING', async () => {
    prismaMock.unit.findUniqueOrThrow.mockResolvedValue(mockUnit as any);
    prismaMock.condominiumUser.findFirst.mockResolvedValue(mockMembershipDoorman as any);
    prismaMock.visitor.create.mockResolvedValue({ ...mockVisitor, status: VisitorStatus.PENDING } as any);

    const result = await visitorService.create(
      { unitId: 'unit-1', name: 'Carlos Visitante' },
      ACTOR_DOORMAN,
    );

    expect(result.status).toBe(VisitorStatus.PENDING);
  });

  it('morador pré-autoriza visitante com status AUTHORIZED', async () => {
    prismaMock.unit.findUniqueOrThrow.mockResolvedValue(mockUnit as any);
    prismaMock.condominiumUser.findFirst.mockResolvedValue(mockMembershipResident as any);
    prismaMock.visitor.create.mockResolvedValue({
      ...mockVisitor,
      status: VisitorStatus.AUTHORIZED,
      preAuthorizedBy: 'resident-1',
    } as any);

    const result = await visitorService.create(
      { unitId: 'unit-1', name: 'Carlos Visitante' },
      ACTOR_RESIDENT,
    );

    expect(result.status).toBe(VisitorStatus.AUTHORIZED);
    expect(result.preAuthorizedBy).toBe('resident-1');
  });

  it('morador sem acesso à unidade recebe ForbiddenError', async () => {
    prismaMock.unit.findUniqueOrThrow.mockResolvedValue(mockUnit as any);
    // Membership aponta para outra unidade
    prismaMock.condominiumUser.findFirst.mockResolvedValue({ unitId: 'unit-99' } as any);

    await expect(
      visitorService.create({ unitId: 'unit-1', name: 'X' }, ACTOR_RESIDENT),
    ).rejects.toThrow(ForbiddenError);
  });

  it('usuário sem membership no condomínio recebe ForbiddenError', async () => {
    prismaMock.unit.findUniqueOrThrow.mockResolvedValue(mockUnit as any);
    prismaMock.condominiumUser.findFirst.mockResolvedValue(null);

    await expect(
      visitorService.create({ unitId: 'unit-1', name: 'X' }, ACTOR_ADMIN),
    ).rejects.toThrow(ForbiddenError);
  });

  it('SUPER_ADMIN cria visitante sem verificar membership', async () => {
    prismaMock.unit.findUniqueOrThrow.mockResolvedValue(mockUnit as any);
    prismaMock.visitor.create.mockResolvedValue(mockVisitor as any);

    const result = await visitorService.create(
      { unitId: 'unit-1', name: 'Carlos' },
      ACTOR_SUPER,
    );

    expect(result).toBeDefined();
    expect(prismaMock.condominiumUser.findFirst).not.toHaveBeenCalled();
  });
});

// ─── registerEntry ────────────────────────────────────────────────────────────
describe('VisitorService.registerEntry', () => {
  it('registra entrada e notifica moradores da unidade', async () => {
    prismaMock.visitor.findUniqueOrThrow.mockResolvedValue(mockVisitor as any);
    prismaMock.unit.findUniqueOrThrow.mockResolvedValue(mockUnit as any);
    prismaMock.condominiumUser.findFirst.mockResolvedValue(mockMembershipDoorman as any);
    prismaMock.visitor.update.mockResolvedValue({ ...mockVisitor, status: VisitorStatus.INSIDE, entryAt: new Date() } as any);
    prismaMock.condominiumUser.findMany.mockResolvedValue([{ userId: 'resident-1' }] as any);

    const result = await visitorService.registerEntry('visitor-1', 'doorman-1', ACTOR_DOORMAN);

    expect(result.status).toBe(VisitorStatus.INSIDE);
    expect(result.entryAt).toBeDefined();
  });

  it('lança ForbiddenError se visitante já está dentro', async () => {
    prismaMock.visitor.findUniqueOrThrow.mockResolvedValue({
      ...mockVisitor,
      status: VisitorStatus.INSIDE,
    } as any);
    prismaMock.unit.findUniqueOrThrow.mockResolvedValue(mockUnit as any);
    prismaMock.condominiumUser.findFirst.mockResolvedValue(mockMembershipDoorman as any);

    await expect(
      visitorService.registerEntry('visitor-1', 'doorman-1', ACTOR_DOORMAN),
    ).rejects.toThrow(ForbiddenError);
  });
});

// ─── registerExit ─────────────────────────────────────────────────────────────
describe('VisitorService.registerExit', () => {
  it('registra saída do visitante', async () => {
    prismaMock.visitor.findUniqueOrThrow.mockResolvedValue({
      ...mockVisitor,
      status: VisitorStatus.INSIDE,
    } as any);
    prismaMock.unit.findUniqueOrThrow.mockResolvedValue(mockUnit as any);
    prismaMock.condominiumUser.findFirst.mockResolvedValue(mockMembershipDoorman as any);
    prismaMock.visitor.update.mockResolvedValue({
      ...mockVisitor,
      status: VisitorStatus.LEFT,
      exitAt: new Date(),
    } as any);

    const result = await visitorService.registerExit('visitor-1', 'doorman-1', ACTOR_DOORMAN);

    expect(result.status).toBe(VisitorStatus.LEFT);
    expect(result.exitAt).toBeDefined();
  });
});

// ─── list ─────────────────────────────────────────────────────────────────────
describe('VisitorService.list', () => {
  it('retorna lista paginada de visitantes com total e páginas', async () => {
    prismaMock.$transaction.mockResolvedValue([
      [{ ...mockVisitor, unit: { identifier: '101', block: 'A' } }],
      1,
    ] as any);

    const result = await visitorService.list('condo-1', { page: 1, limit: 10 });

    expect(result.visitors).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(1);
  });
});
