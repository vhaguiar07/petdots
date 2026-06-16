import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';

@ApiTags('product-reviews')
@ApiBearerAuth()
@Controller('products/:productId/reviews')
export class ProductReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lista as avaliações de um produto' })
  findAll(@Param('productId') productId: string) {
    return this.reviewsService.listProductReviews(productId);
  }

  @Roles(UserRole.CUSTOMER)
  @AuditLog({ entity: 'ProductReview', action: 'UPSERT' })
  @Post()
  @ApiOperation({
    summary: 'Cria ou atualiza a avaliação do cliente para este produto (exige compra entregue)',
  })
  upsert(
    @Param('productId') productId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.upsertProductReview(productId, user.id, dto);
  }

  @Roles(UserRole.CUSTOMER)
  @AuditLog({ entity: 'ProductReview', action: 'DELETE' })
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a avaliação do cliente para este produto' })
  async remove(@Param('productId') productId: string, @CurrentUser() user: AuthenticatedUser) {
    await this.reviewsService.deleteProductReview(productId, user.id);
  }

  @Roles(UserRole.STORE_OWNER, UserRole.ADMIN)
  @AuditLog({ entity: 'ProductReview', action: 'REPLY' })
  @Patch(':reviewId/reply')
  @ApiOperation({ summary: 'Responde a uma avaliação (apenas o lojista proprietário ou admin)' })
  reply(
    @Param('productId') productId: string,
    @Param('reviewId') reviewId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReplyReviewDto,
  ) {
    return this.reviewsService.replyToProductReview(productId, reviewId, user.id, user.role, dto);
  }
}
