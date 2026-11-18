import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsISO4217CurrencyCode,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { AccountType } from '../../generated/prisma/enums';
import { IsMoneyString } from '../../common/money/index';

export class CreateAccountDto {
  @ApiProperty({ example: 'GTBank Salary' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @ApiProperty({ enum: AccountType, example: AccountType.bank })
  @IsEnum(AccountType)
  type!: AccountType;

  @ApiPropertyOptional({ example: 'Guaranty Trust Bank' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  institution?: string;

  @ApiPropertyOptional({ example: '1234' })
  @IsOptional()
  @Matches(/^\d{4}$/, { message: 'account_number_last4 must be 4 digits' })
  account_number_last4?: string;

  @ApiProperty({ example: 'NGN' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsISO4217CurrencyCode()
  currency_code!: string;

  // Major-unit decimal string, e.g. "1500.00" = ₦1,500.00
  @ApiPropertyOptional({ example: '1500.00', default: '0' })
  @IsOptional()
  @IsMoneyString()
  opening_balance?: string;

  @ApiPropertyOptional({
    example: '2026-10-01',
    description: 'Defaults to today',
  })
  @IsOptional()
  @IsISO8601({ strict: true })
  opening_balance_date?: string;
}
