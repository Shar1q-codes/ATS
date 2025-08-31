import {
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ObjectLiteral } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { BaseService } from './base.service';
import { PaginationDto } from '../dto/pagination.dto';

@UseGuards(JwtAuthGuard)
export abstract class BaseController<
  T extends ObjectLiteral,
  CreateDto,
  UpdateDto,
> {
  constructor(protected readonly service?: BaseService<T>) {}

  protected successResponse<T>(data: T, message?: string) {
    return {
      success: true,
      data,
      message,
    };
  }

  @Get()
  async findAll(@Query() paginationDto: PaginationDto) {
    const { page = 1, limit = 10, sortBy, sortOrder = 'ASC' } = paginationDto;
    const skip = (page - 1) * limit;

    const options: any = {
      skip,
      take: limit,
    };

    if (sortBy) {
      options.order = { [sortBy]: sortOrder };
    }

    const [data, total] = await Promise.all([
      this.service.findAll(options),
      this.service.count(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Post()
  async create(@Body() createDto: CreateDto) {
    return this.service.create(createDto as any);
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateDto,
  ) {
    return this.service.update(id, updateDto as any);
  }

  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.remove(id);
    return { message: 'Entity deleted successfully' };
  }
}
