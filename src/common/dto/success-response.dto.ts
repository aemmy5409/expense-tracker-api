import { ApiProperty, ApiSchema } from '@nestjs/swagger';

@ApiSchema({ name: 'SuccessResponse' })
export class SuccessResponseDto {
  @ApiProperty({ type: String })
  message!: string;

  @ApiProperty({ type: Number })
  statusCode!: number;

  @ApiProperty({ type: Object })
  data!: object;
}
