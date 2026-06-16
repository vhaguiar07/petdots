import {
  Controller,
  ParseFilePipeBuilder,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { UploadsService } from './uploads.service';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Roles(UserRole.STORE_OWNER, UserRole.ADMIN)
  @Post('images')
  @ApiOperation({ summary: 'Faz upload de uma imagem (ex.: foto de produto) e retorna sua URL' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ })
        .addMaxSizeValidator({ maxSize: MAX_IMAGE_SIZE_BYTES })
        .build(),
    )
    file: Express.Multer.File,
  ) {
    const url = await this.uploadsService.uploadImage(file, 'products');
    return { url };
  }
}
