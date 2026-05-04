import { Injectable } from '@nestjs/common';
import { CursorPaginationDto } from './dto/pagination.dto';
import { decodeCursor, encodeCursor } from './utils/codec.util';

@Injectable()
export class PaginationService {
  toPrismaCursorArgs<TCursor extends object, TCursorPayload = string>(
    paginateDto: CursorPaginationDto,
    getCursor: (payload: TCursorPayload) => TCursor,
  ) {
    const { cursor, limit } = paginateDto;
    const decodedCursor = cursor ? decodeCursor<TCursorPayload>(cursor) : null;

    return {
      ...(decodedCursor !== null && {
        cursor: getCursor(decodedCursor),
        skip: 1,
      }),
      take: limit + 1,
    };
  }

  toCursorPage<TItem, TCursorPayload = string>(
    list: TItem[],
    paginateDto: CursorPaginationDto,
    getCursorPayload: (item: TItem) => TCursorPayload,
  ) {
    const { limit } = paginateDto;
    const hasNextPage = list.length > limit;
    const result = hasNextPage ? list.slice(0, limit) : list;
    const nextCursor = hasNextPage
      ? encodeCursor(getCursorPayload(result[result.length - 1]))
      : null;

    return {
      result,
      page: {
        hasNextPage,
        nextCursor,
      },
    };
  }
}
