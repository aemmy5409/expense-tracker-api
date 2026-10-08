import { Injectable } from '@nestjs/common';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../../src/generated/prisma/browser.js';

type ModelName = Uncapitalize<Prisma.ModelName> & keyof PrismaClient;

type ModelDelegate = {
  create: (args: Record<string, unknown>) => Promise<unknown>;
  findUnique: (args: Record<string, unknown>) => Promise<unknown>;
  findFirst: (args: Record<string, unknown>) => Promise<unknown>;
  findMany: (args: Record<string, unknown>) => Promise<unknown>;
  update: (args: Record<string, unknown>) => Promise<unknown>;
  upsert: (args: Record<string, unknown>) => Promise<unknown>;
  updateMany: (args: Record<string, unknown>) => Promise<unknown>;
  delete: (args: Record<string, unknown>) => Promise<unknown>;
  count: (args: Record<string, unknown>) => Promise<unknown>;
  aggregate: (args: Record<string, unknown>) => Promise<unknown>;
  groupBy: (args: Record<string, unknown>) => Promise<unknown>;
};

@Injectable()
export class DataBaseService extends PrismaClient {
  constructor(private readonly config: ConfigService) {
    const adapter = new PrismaPg({
      connectionString: config.getOrThrow<string>('DATABASE_URL'),
    });
    super({ adapter });
  }

  private model(name: ModelName): ModelDelegate {
    return (this as PrismaClient)[name] as ModelDelegate;
  }

  async create(
    model: ModelName,
    data: object,
    options?: Record<string, unknown>,
  ) {
    return this.model(model).create({ data, ...options });
  }

  async upsert(
    model: ModelName,
    where: object,
    update: object,
    create: object,
    options?: Record<string, unknown>,
  ) {
    return this.model(model).upsert({
      where,
      update,
      create,
      ...options,
    });
  }

  async truncate(model: string): Promise<number> {
    return this.$executeRawUnsafe(
      `TRUNCATE TABLE "${model}" RESTART IDENTITY CASCADE;`,
    );
  }

  async aggregate(
    model: ModelName,
    where: object,
    options?: Record<string, unknown>,
  ) {
    return this.model(model).aggregate({ where, ...options });
  }

  async groupBy(
    model: ModelName,
    by: string[],
    where: object,
    options?: Record<string, unknown>,
  ) {
    return this.model(model).groupBy({ by, where, ...options });
  }

  async findUnique(
    model: ModelName,
    where: object,
    options?: Record<string, unknown>,
  ) {
    return this.model(model).findUnique({ where, ...options });
  }

  async findFirst(
    model: ModelName,
    where: object,
    options?: Record<string, unknown>,
  ) {
    return this.model(model).findFirst({ where, ...options });
  }

  async findMany(
    model: ModelName,
    where?: object,
    options?: Record<string, unknown>,
  ) {
    return this.model(model).findMany({ where, ...options });
  }

  async update(
    model: ModelName,
    where: object,
    data: object,
    options?: Record<string, unknown>,
  ) {
    return this.model(model).update({ where, data, ...options });
  }

  async updateMany(model: ModelName, where: object, data: object) {
    return this.model(model).updateMany({ where, data });
  }

  async delete(model: ModelName, where: object) {
    return this.model(model).delete({ where });
  }

  async count(model: ModelName, where?: object) {
    return this.model(model).count({ where });
  }

  async paginate(
    model: ModelName,
    where: object,
    { skip, limit }: { skip: number; limit: number },
    options?: Record<string, unknown>,
  ) {
    return Promise.all([
      this.model(model).findMany({
        where,
        skip,
        take: Number(limit),
        ...options,
      }),
      this.model(model).count({ where }),
    ]);
  }
}
