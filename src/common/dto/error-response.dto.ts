import { ApiProperty, ApiSchema } from '@nestjs/swagger';

@ApiSchema({ name: 'ErrorResponse' })
export class ErrorResponseDto {
  @ApiProperty({ type: String })
  message!: string;

  @ApiProperty({ type: Number })
  statusCode!: number;

  @ApiProperty({ type: String })
  error!: string;
}
