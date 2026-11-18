import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataBaseService } from '../data-base/data-base.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { Prisma, type Account } from '../generated/prisma/client';
import { getMinorUnits, parseMoney } from '../common/money/index';

@Injectable()
export class AccountsService {
  private readonly OMIT_DATA = {
    user_id: true,
    is_archived: true,
    created_at: true,
    updated_at: true,
  };
  constructor(private readonly databaseService: DataBaseService) {}

  async list() {
    // user_id is added by the scoped client (see data-base/user-scope.ts).
    const accounts = (await this.databaseService.findMany(
      'account',
      { is_archived: false },
      { omit: this.OMIT_DATA },
    )) as Account[];
    return {
      message: 'accounts fetched',
      data: accounts,
      statusCode: 200,
    };
  }

  async create(createAccountDto: CreateAccountDto) {
    const currency = await this.databaseService.findUnique('currency', {
      code: createAccountDto.currency_code,
    });
    if (!currency) {
      throw new BadRequestException(
        `unsupported currency: ${createAccountDto.currency_code}`,
      );
    }

    try {
      const account = (await this.databaseService.create(
        'account',
        {
          name: createAccountDto.name,
          type: createAccountDto.type,
          institution: createAccountDto.institution,
          account_number_last4: createAccountDto.account_number_last4,
          currency_code: createAccountDto.currency_code,
          opening_balance_minor: parseMoney(
            createAccountDto.opening_balance ?? '0',
            getMinorUnits(createAccountDto.currency_code),
          ),
          opening_balance_date: createAccountDto.opening_balance_date
            ? new Date(createAccountDto.opening_balance_date)
            : undefined,
        },
        {
          omit: this.OMIT_DATA,
        },
      )) as Account;

      return {
        message: 'account created successfully',
        data: account,
        statusCode: 201,
      };
    } catch (error) {
      this.rethrowDuplicateName(error, createAccountDto.name);
      throw error;
    }
  }

  async find(id: string) {
    const account = await this.findActive(id, { omit: this.OMIT_DATA });

    return {
      message: 'account retrieved successfully',
      data: account,
      statusCode: 200,
    };
  }

  async update(id: string, updateAccountDto: UpdateAccountDto) {
    if (Object.values(updateAccountDto).every((v) => v === undefined)) {
      throw new BadRequestException('nothing to update');
    }

    const account = await this.findActive(id);
    const {
      name,
      type,
      institution,
      account_number_last4,
      opening_balance,
      opening_balance_date,
    } = updateAccountDto;

    const data: Prisma.AccountUpdateInput = {
      name,
      type,
      institution,
      account_number_last4,
      opening_balance_date: opening_balance_date
        ? new Date(opening_balance_date)
        : undefined,
    };
    if (opening_balance !== undefined) {
      const minor = getMinorUnits(account.currency_code);
      try {
        data.opening_balance_minor = parseMoney(opening_balance, minor);
      } catch {
        throw new BadRequestException(
          `opening_balance must be a decimal string with at most ${minor} decimal places`,
        );
      }
    }

    try {
      // is_archived in the where guards against an archive racing this update.
      const updated = (await this.databaseService.update(
        'account',
        { id, is_archived: false },
        data,
        { omit: this.OMIT_DATA },
      )) as Account;

      return {
        message: 'account updated successfully',
        data: updated,
        statusCode: 200,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('account not found');
      }
      if (name !== undefined) this.rethrowDuplicateName(error, name);
      throw error;
    }
  }

  async archive(id: string) {
    const account = (await this.databaseService.findUnique('account', {
      id,
    })) as Account | null;
    if (!account) throw new NotFoundException('account not found');

    // Archiving twice is a no-op, so retries still succeed.
    if (!account.is_archived) {
      // Rename on archive so the name is free for a new account. The id
      // fallback covers a same-day repeat or a user-chosen name that collides.
      try {
        await this.archiveAs(id, archivedName(account.name));
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        await this.archiveAs(id, archivedName(account.name, id.slice(0, 8)));
      }
    }

    return {
      message: 'account deleted successfully',
      data: {},
      statusCode: 200,
    };
  }

  // Archived accounts are treated as gone: 404 like a missing or foreign id.
  private async findActive(id: string, options?: Record<string, unknown>) {
    const account = (await this.databaseService.findUnique(
      'account',
      { id, is_archived: false },
      options,
    )) as Account | null;
    if (!account) throw new NotFoundException('account not found');
    return account;
  }

  private archiveAs(id: string, name: string) {
    return this.databaseService.update(
      'account',
      { id },
      { is_archived: true, name },
    );
  }

  private rethrowDuplicateName(error: unknown, name: string) {
    if (isUniqueViolation(error)) {
      throw new ConflictException(`an account named "${name}" already exists`);
    }
  }
}

const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002';

// Account.name is VARCHAR(80), so trim the base name to fit the suffix.
const MAX_NAME_LENGTH = 80;

function archivedName(name: string, extra?: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const suffix = ` (archived ${date}${extra ? ` ${extra}` : ''})`;
  return name.slice(0, MAX_NAME_LENGTH - suffix.length).trimEnd() + suffix;
}
