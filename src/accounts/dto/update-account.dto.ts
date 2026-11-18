import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateAccountDto } from './create-account.dto';

// Currency is fixed after create: changing it would reinterpret every stored
// minor-unit amount. opening_balance's decimal places are re-checked in the
// service against the account's currency, since currency_code isn't here.
export class UpdateAccountDto extends PartialType(
  OmitType(CreateAccountDto, ['currency_code'] as const),
) {}
