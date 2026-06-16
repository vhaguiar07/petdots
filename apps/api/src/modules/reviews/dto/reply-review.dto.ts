import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ReplyReviewDto {
  @ApiProperty({ example: 'Obrigado pela avaliação! Ficamos felizes que tenha gostado.' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  reply: string;
}
