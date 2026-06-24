import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Roles(UserRole.STORE_OWNER, UserRole.ADMIN)
  @AuditLog({ entity: 'Product', action: 'CREATE' })
  @Post()
  @ApiOperation({ summary: 'Cria um produto na loja do lojista autenticado' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateProductDto) {
    return this.productsService.create(user.id, user.role, dto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lista produtos ativos, opcionalmente filtrando por loja/categoria' })
  findAll(@Query() query: QueryProductsDto) {
    return this.productsService.findAll(query);
  }

  @Roles(UserRole.STORE_OWNER, UserRole.ADMIN)
  @Get('mine')
  @ApiOperation({ summary: 'Lista todos os produtos (ativos e inativos) da loja do lojista autenticado' })
  findMine(@CurrentUser() user: AuthenticatedUser, @Query('storeId') storeId: string) {
    return this.productsService.findMine(user.id, user.role, storeId);
  }

  @Public()
  @Get('catalog-search')
  @ApiOperation({ summary: 'Busca produtos no catálogo global para reutilização' })
  searchCatalog(@Query('search') search: string) {
    return this.productsService.searchCatalog(search ?? '');
  }

  @Public()
  @Get('featured')
  @ApiOperation({ summary: 'Produtos em destaque com score composto (rating × credibilidade × vendas recentes)' })
  getFeatured(@Query('limit') limit?: string) {
    return this.productsService.getFeatured(limit ? Math.min(Number(limit), 20) : 6);
  }

  @Public()
  @Get('catalog/rankings')
  @ApiOperation({ summary: 'Ranking global dos produtos mais vendidos no marketplace' })
  globalRankings(@Query('limit') limit?: string) {
    return this.productsService.globalRankings(limit ? Math.min(Number(limit), 100) : 20);
  }

  @Public()
  @Get('catalog/:catalogProductId/compare')
  @ApiOperation({ summary: 'Lista todas as lojas que vendem o mesmo produto, ordenadas por preço' })
  comparePrices(@Param('catalogProductId') catalogProductId: string) {
    return this.productsService.comparePrices(catalogProductId);
  }

  @Public()
  @Get('catalog/:catalogProductId/reputation')
  @ApiOperation({ summary: 'Reputação global de um produto agregando avaliações de todas as lojas' })
  globalReputation(@Param('catalogProductId') catalogProductId: string) {
    return this.productsService.globalReputation(catalogProductId);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Detalha um produto pelo id' })
  findOne(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Public()
  @Get(':id/price-history')
  @ApiOperation({ summary: 'Histórico de preços de um StoreProduct' })
  priceHistory(@Param('id') id: string) {
    return this.productsService.getPriceHistory(id);
  }

  @Roles(UserRole.STORE_OWNER, UserRole.ADMIN)
  @AuditLog({ entity: 'Product', action: 'UPDATE' })
  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um produto (apenas o lojista proprietário ou admin)' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, user.id, user.role, dto);
  }

  @Roles(UserRole.STORE_OWNER, UserRole.ADMIN)
  @AuditLog({ entity: 'Product', action: 'DELETE' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desativa um produto (soft delete)' })
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.productsService.remove(id, user.id, user.role);
  }
}
