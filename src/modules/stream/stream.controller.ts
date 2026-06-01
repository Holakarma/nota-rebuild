import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Authorization } from '@modules/auth/decorators/authorization.decorator';
import { Authorized } from '@modules/auth/decorators/authorized.decorator';
import { CursorPaginationDto } from '@shared/pagination/dto/pagination.dto';
import {
  ApiCreateStream,
  ApiDeleteStream,
  ApiFindSimilarStreams,
  ApiGetStreamById,
  ApiGetStreams,
  ApiStreamController,
  ApiUpdateStream,
} from './docs/stream.swagger';
import { CreateStreamDto } from './dto/create-stream.dto';
import { FindSimilarStreamsDto } from './dto/find-similar-streams.dto';
import { UpdateStreamDto } from './dto/update-stream.dto';
import { StreamService } from './stream.service';

@ApiStreamController()
@Controller('stream')
export class StreamController {
  constructor(private readonly streamService: StreamService) {}

  @ApiCreateStream()
  @Authorization()
  @Post()
  async create(
    @Authorized('id') userId: string,
    @Body() createStreamDto: CreateStreamDto,
  ) {
    return await this.streamService.create(userId, createStreamDto);
  }

  @ApiGetStreams()
  @Authorization()
  @Get()
  async findAll(
    @Authorized('id') userId: string,
    @Query() paginateDto: CursorPaginationDto,
  ) {
    return await this.streamService.findAll(userId, paginateDto);
  }

  @ApiFindSimilarStreams()
  @Authorization()
  @Get('similar')
  async findSimilar(
    @Authorized('id') userId: string,
    @Query() dto: FindSimilarStreamsDto,
  ) {
    return await this.streamService.findSimilar(userId, dto);
  }

  @ApiGetStreamById()
  @Authorization()
  @Get(':id')
  async findOne(@Authorized('id') userId: string, @Param('id') id: string) {
    return await this.streamService.findOne(userId, id);
  }

  @ApiUpdateStream()
  @Authorization()
  @Patch(':id')
  async update(
    @Authorized('id') userId: string,
    @Param('id') id: string,
    @Body() updateStreamDto: UpdateStreamDto,
  ) {
    return await this.streamService.update(userId, id, updateStreamDto);
  }

  @ApiDeleteStream()
  @Authorization()
  @Delete(':id')
  async remove(@Authorized('id') userId: string, @Param('id') id: string) {
    return await this.streamService.remove(userId, id);
  }
}
