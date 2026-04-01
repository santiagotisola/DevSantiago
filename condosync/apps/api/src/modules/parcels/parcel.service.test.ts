import { describe, it, expect, vi } from 'vitest';
import { ParcelService } from './parcel.service';
import { prismaMock } from '../../test/setup';
import { ConflictError, ForbiddenError, ValidationError } from '../../middleware/errorHandler';
import { ParcelStatus, UserRole } from '@prisma/client';

vi.mock('../../notifications/notification.service', () => ({
  NotificationService: { enqueue: vi.fn().mockResolvedValue(undefined) },
}));

const parcelService = new ParcelService();

// ─── Fixtures ────────────────────────────────────────────────────────────────
const ACTOR_DOORMAN = { userId: 'doorman-1', role: UserRole.DOORMAN };
const ACTOR_SUPER = { userId: 'super-1', role: UserRole.SUPER_ADMIN };

const mockUnit = { id: 'unit-1', condominiumId: 'condo-1' };

const mockParcel = {
  id: 'parcel-1',
  unitId: 'unit-1',
  senderName: 'Amazon',
  carrier: 'Correios',
  trackingCode: 'BR123456789',
  photoUrl: null,
  storageLocation: 'Prateleira A',
  deliveryPersonName: null,
  deliveryPersonDoc: null,
  vehiclePlate: null,
  hasPackageDamage: false,
  notes: null,
  status: ParcelStatus.RECEIVED,
  registeredBy: 'doorman-1',
  receivedAt: new Date(),
  notifiedAt: null,
  pickedUpAt: null,
  pickedUpBy: null,
  pickupSignature: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  unit: { condominiumId: 'condo-1' },
};

// ─── register ─────────────────────────────────────────────────────────────────
describe('ParcelService.register', () => {
  it('registra encomenda e notifica moradores da unidade', async () => {
    prismaMock.unit.findFirst.mockResolvedValue(mockUnit as any);
    prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'cu-1' } as any);
    prismaMock.parcel.create.mockResolvedValue(mockParcel as any);
    prismaMock.parcel.update.mockResolvedValue({ ...mockParcel, notifiedAt: new Date() } as any);
    prismaMock.condominiumUser.findMany.mockResolvedValue([{ userId: 'resident-1' }] as any);

    const result = await parcelService.register(
      { unitId: 'unit-1', senderName: 'Amazon', carrier: 'Correios' },
      'doorman-1',
      ACTOR_DOORMAN,
    );

    expect(result.status).toBe(ParcelStatus.RECEIVED);
    expect(result.senderName).toBe('Amazon');
  });

  it('lança ValidationError para unidade inválida', async () => {
    prismaMock.unit.findFirst.mockResolvedValue(null);

    await expect(
      parcelService.register({ unitId: 'unit-inexistente' }, 'doorman-1', ACTOR_DOORMAN),
    ).rejects.toThrow(ValidationError);
  });

  it('lança ForbiddenError se ator não tem membership no condomínio', async () => {
    prismaMock.unit.findFirst.mockResolvedValue(mockUnit as any);
    prismaMock.condominiumUser.findFirst.mockResolvedValue(null);

    await expect(
      parcelService.register({ unitId: 'unit-1' }, 'doorman-1', ACTOR_DOORMAN),
    ).rejects.toThrow(ForbiddenError);
  });

  it('SUPER_ADMIN registra encomenda sem verificar membership', async () => {
    prismaMock.unit.findFirst.mockResolvedValue(mockUnit as any);
    prismaMock.parcel.create.mockResolvedValue(mockParcel as any);
    prismaMock.parcel.update.mockResolvedValue({ ...mockParcel, notifiedAt: new Date() } as any);
    prismaMock.condominiumUser.findMany.mockResolvedValue([] as any);

    const result = await parcelService.register(
      { unitId: 'unit-1', senderName: 'Shopee' },
      'super-1',
      ACTOR_SUPER,
    );

    expect(result).toBeDefined();
    // SUPER_ADMIN não passa pelo check de membership
    expect(prismaMock.condominiumUser.findFirst).not.toHaveBeenCalled();
  });
});

// ─── confirmPickup ────────────────────────────────────────────────────────────
describe('ParcelService.confirmPickup', () => {
  it('confirma retirada com sucesso', async () => {
    prismaMock.parcel.findUniqueOrThrow.mockResolvedValue(mockParcel as any);
    prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'cu-1' } as any);
    prismaMock.parcel.update.mockResolvedValue({
      ...mockParcel,
      status: ParcelStatus.PICKED_UP,
      pickedUpAt: new Date(),
      pickedUpBy: 'resident-1',
    } as any);

    const result = await parcelService.confirmPickup('parcel-1', 'resident-1', ACTOR_DOORMAN);

    expect(result.status).toBe(ParcelStatus.PICKED_UP);
    expect(result.pickedUpBy).toBe('resident-1');
  });

  it('lança ConflictError se encomenda já foi retirada', async () => {
    prismaMock.parcel.findUniqueOrThrow.mockResolvedValue({
      ...mockParcel,
      status: ParcelStatus.PICKED_UP,
    } as any);
    prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'cu-1' } as any);

    await expect(
      parcelService.confirmPickup('parcel-1', 'resident-1', ACTOR_DOORMAN),
    ).rejects.toThrow(ConflictError);
  });

  it('lança ConflictError se encomenda foi devolvida', async () => {
    prismaMock.parcel.findUniqueOrThrow.mockResolvedValue({
      ...mockParcel,
      status: ParcelStatus.RETURNED,
    } as any);
    prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'cu-1' } as any);

    await expect(
      parcelService.confirmPickup('parcel-1', 'resident-1', ACTOR_DOORMAN),
    ).rejects.toThrow(ConflictError);
  });

  it('lança ForbiddenError se ator não tem acesso à encomenda', async () => {
    prismaMock.parcel.findUniqueOrThrow.mockResolvedValue(mockParcel as any);
    prismaMock.condominiumUser.findFirst.mockResolvedValue(null);

    await expect(
      parcelService.confirmPickup('parcel-1', 'resident-1', ACTOR_DOORMAN),
    ).rejects.toThrow(ForbiddenError);
  });
});

// ─── list ─────────────────────────────────────────────────────────────────────
describe('ParcelService.list', () => {
  it('retorna lista paginada de encomendas', async () => {
    prismaMock.$transaction.mockResolvedValue([
      [{ ...mockParcel, unit: { identifier: '101', block: 'A' } }],
      1,
    ] as any);

    const result = await parcelService.list('condo-1', { page: 1, limit: 20 });

    expect(result.parcels).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(result.page).toBe(1);
  });
});

// ─── update ───────────────────────────────────────────────────────────────────
describe('ParcelService.update', () => {
  it('atualiza campos da encomenda com acesso válido', async () => {
    prismaMock.parcel.findUniqueOrThrow.mockResolvedValue(mockParcel as any);
    prismaMock.condominiumUser.findFirst.mockResolvedValue({ id: 'cu-1' } as any);
    prismaMock.parcel.update.mockResolvedValue({ ...mockParcel, storageLocation: 'Prateleira B' } as any);

    const result = await parcelService.update('parcel-1', ACTOR_DOORMAN, { storageLocation: 'Prateleira B' });

    expect(result.storageLocation).toBe('Prateleira B');
  });
});
