import bcrypt from "bcrypt";
import { UserRole } from "@prisma/client";
import { prisma } from "../../config/prisma";
import {
  ConflictError,
  ForbiddenError,
} from "../../middleware/errorHandler";

type EmployeeActor = { userId: string; role: string };

// Mapeia valores legados do frontend para o enum correto do banco
export const SHIFT_ALIASES: Record<string, string> = {
  FULL_TIME: "FULL_DAY",
  ON_CALL: "MORNING",
};

export function normalizeShift(raw?: string): string | undefined {
  if (!raw) return undefined;
  return SHIFT_ALIASES[raw] ?? raw;
}

export interface CreateEmployeeDTO {
  condominiumId: string;
  name: string;
  cpf?: string;
  role: string;
  phone?: string;
  email?: string;
  shift?: string;
  admissionDate?: string;
  salaryAmount?: number;
  notes?: string;
}

export type UpdateEmployeeDTO = Partial<Omit<CreateEmployeeDTO, "condominiumId">>;

export interface GrantAccessDTO {
  email: string;
  password: string;
  systemRole:
    | "DOORMAN"
    | "CONDOMINIUM_ADMIN"
    | "SYNDIC"
    | "COUNCIL_MEMBER"
    | "SERVICE_PROVIDER";
}

export class EmployeeService {
  private async ensureCondominiumMembership(
    condominiumId: string,
    actor: EmployeeActor,
  ) {
    if (actor.role === UserRole.SUPER_ADMIN) return;
    const membership = await prisma.condominiumUser.findFirst({
      where: {
        userId: actor.userId,
        condominiumId,
        isActive: true,
      },
      select: { id: true },
    });
    if (!membership)
      throw new ForbiddenError("Acesso negado a este condominio");
  }

  async listByCondominium(condominiumId: string, actor: EmployeeActor) {
    await this.ensureCondominiumMembership(condominiumId, actor);
    return prisma.employee.findMany({
      where: { condominiumId, isActive: true },
      orderBy: { name: "asc" },
      include: {
        user: {
          select: { id: true, email: true, role: true, isActive: true },
        },
      },
    });
  }

  async create(data: CreateEmployeeDTO, actor: EmployeeActor) {
    await this.ensureCondominiumMembership(data.condominiumId, actor);
    return prisma.employee.create({
      data: {
        condominiumId: data.condominiumId,
        name: data.name,
        role: data.role,
        cpf: data.cpf ?? "",
        shift: (data.shift ?? "MORNING") as any,
        phone: data.phone,
        email: data.email,
        salaryAmount: data.salaryAmount,
        notes: data.notes,
        admissionDate: data.admissionDate
          ? new Date(data.admissionDate)
          : new Date(),
      },
    });
  }

  async update(id: string, data: UpdateEmployeeDTO, actor: EmployeeActor) {
    const existing = await prisma.employee.findUniqueOrThrow({
      where: { id },
      select: { condominiumId: true },
    });
    await this.ensureCondominiumMembership(existing.condominiumId, actor);
    return prisma.employee.update({
      where: { id },
      data: {
        name: data.name,
        role: data.role,
        phone: data.phone,
        email: data.email,
        shift: data.shift as any,
        admissionDate: data.admissionDate
          ? new Date(data.admissionDate)
          : undefined,
      },
    });
  }

  async softDelete(id: string, actor: EmployeeActor) {
    const existing = await prisma.employee.findUniqueOrThrow({
      where: { id },
      select: { condominiumId: true },
    });
    await this.ensureCondominiumMembership(existing.condominiumId, actor);
    await prisma.employee.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async grantAccess(id: string, data: GrantAccessDTO, actor: EmployeeActor) {
    const employee = await prisma.employee.findUniqueOrThrow({
      where: { id },
      select: { id: true, condominiumId: true, name: true, userId: true },
    });
    await this.ensureCondominiumMembership(employee.condominiumId, actor);

    if (employee.userId) {
      throw new ConflictError(
        "Este funcionario ja possui uma conta de acesso vinculada",
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    let userId: string;
    if (existingUser) {
      userId = existingUser.id;
    } else {
      const rounds = parseInt(process.env.BCRYPT_ROUNDS ?? "10");
      const passwordHash = await bcrypt.hash(data.password, rounds);
      const newUser = await prisma.user.create({
        data: {
          email: data.email,
          name: employee.name,
          passwordHash,
          role: data.systemRole as any,
          isActive: true,
        },
      });
      userId = newUser.id;
    }

    const existingMembership = await prisma.condominiumUser.findUnique({
      where: {
        userId_condominiumId: {
          userId,
          condominiumId: employee.condominiumId,
        },
      },
    });

    if (!existingMembership) {
      await prisma.condominiumUser.create({
        data: {
          userId,
          condominiumId: employee.condominiumId,
          role: data.systemRole as any,
          isActive: true,
        },
      });
    } else {
      await prisma.condominiumUser.update({
        where: {
          userId_condominiumId: {
            userId,
            condominiumId: employee.condominiumId,
          },
        },
        data: { role: data.systemRole as any, isActive: true },
      });
    }

    await prisma.employee.update({
      where: { id: employee.id },
      data: { userId },
    });
  }

  async revokeAccess(id: string, actor: EmployeeActor) {
    const employee = await prisma.employee.findUniqueOrThrow({
      where: { id },
      select: { id: true, condominiumId: true, userId: true },
    });
    await this.ensureCondominiumMembership(employee.condominiumId, actor);

    if (!employee.userId) {
      throw new ConflictError(
        "Este funcionario nao possui conta de acesso vinculada",
      );
    }

    await prisma.condominiumUser.updateMany({
      where: {
        userId: employee.userId,
        condominiumId: employee.condominiumId,
      },
      data: { isActive: false },
    });

    await prisma.employee.update({
      where: { id: employee.id },
      data: { userId: null },
    });
  }
}

export const employeeService = new EmployeeService();
