import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ProductReviewsController } from './product-reviews.controller';
import { StoreReviewsController } from './store-reviews.controller';

@Module({
  controllers: [ProductReviewsController, StoreReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
