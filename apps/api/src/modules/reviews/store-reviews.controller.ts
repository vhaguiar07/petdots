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

@ApiTags('store-reviews')
@ApiBearerAuth()
@Controller('stores/:storeId/reviews')
export class StoreReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lista as avaliações de uma loja' })
  findAll(@Param('storeId') storeId: string) {
    return this.reviewsService.listStoreReviews(storeId);
  }

  @Roles(UserRole.CUSTOMER)
  @AuditLog({ entity: 'StoreReview', action: 'UPSERT' })
  @Post()
  @ApiOperation({
    summary: 'Cria ou atualiza a avaliação do cliente para esta loja (exige pedido entregue)',
  })
  upsert(
    @Param('storeId') storeId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.upsertStoreReview(storeId, user.id, dto);
  }

  @Roles(UserRole.CUSTOMER)
  @AuditLog({ entity: 'StoreReview', action: 'DELETE' })
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a avaliação do cliente para esta loja' })
  async remove(@Param('storeId') storeId: string, @CurrentUser() user: AuthenticatedUser) {
    await this.reviewsService.deleteStoreReview(storeId, user.id);
  }

  @Roles(UserRole.STORE_OWNER, UserRole.ADMIN)
  @AuditLog({ entity: 'StoreReview', action: 'REPLY' })
  @Patch(':reviewId/reply')
  @ApiOperation({ summary: 'Responde a uma avaliação (apenas o lojista proprietário ou admin)' })
  reply(
    @Param('storeId') storeId: string,
    @Param('reviewId') reviewId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReplyReviewDto,
  ) {
    return this.reviewsService.replyToStoreReview(storeId, reviewId, user.id, user.role, dto);
  }
}
