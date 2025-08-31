import { Injectable } from '@nestjs/common';
import { SelectQueryBuilder } from 'typeorm';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
  searchFields?: string[];
}

export interface PaginationResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface CursorPaginationOptions {
  cursor?: string;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface CursorPaginationResult<T> {
  data: T[];
  meta: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    nextCursor?: string;
    previousCursor?: string;
    limit: number;
  };
}

@Injectable()
export class PaginationService {
  private readonly defaultLimit = 20;
  private readonly maxLimit = 100;

  async paginate<T>(
    queryBuilder: SelectQueryBuilder<T>,
    options: PaginationOptions = {},
  ): Promise<PaginationResult<T>> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(
      this.maxLimit,
      Math.max(1, options.limit || this.defaultLimit),
    );
    const offset = (page - 1) * limit;

    // Apply search if provided
    if (options.search && options.searchFields?.length) {
      this.applySearch(queryBuilder, options.search, options.searchFields);
    }

    // Apply sorting
    if (options.sortBy) {
      const sortOrder = options.sortOrder || 'ASC';
      queryBuilder.orderBy(options.sortBy, sortOrder);
    }

    // Get total count before applying pagination
    const total = await queryBuilder.getCount();

    // Apply pagination
    queryBuilder.skip(offset).take(limit);

    // Get paginated data
    const data = await queryBuilder.getMany();

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async cursorPaginate<T>(
    queryBuilder: SelectQueryBuilder<T>,
    options: CursorPaginationOptions = {},
  ): Promise<CursorPaginationResult<T>> {
    const limit = Math.min(
      this.maxLimit,
      Math.max(1, options.limit || this.defaultLimit),
    );
    const sortBy = options.sortBy || 'id';
    const sortOrder = options.sortOrder || 'ASC';

    // Apply cursor filtering
    if (options.cursor) {
      const operator = sortOrder === 'ASC' ? '>' : '<';
      queryBuilder.andWhere(`${sortBy} ${operator} :cursor`, {
        cursor: options.cursor,
      });
    }

    // Apply sorting
    queryBuilder.orderBy(sortBy, sortOrder);

    // Fetch one extra record to determine if there's a next page
    queryBuilder.take(limit + 1);

    const results = await queryBuilder.getMany();
    const hasNextPage = results.length > limit;

    // Remove the extra record if it exists
    if (hasNextPage) {
      results.pop();
    }

    let nextCursor: string | undefined;
    let previousCursor: string | undefined;

    if (results.length > 0) {
      const lastItem = results[results.length - 1];
      const firstItem = results[0];

      nextCursor = hasNextPage ? String(lastItem[sortBy]) : undefined;
      previousCursor = options.cursor ? String(firstItem[sortBy]) : undefined;
    }

    return {
      data: results,
      meta: {
        hasNextPage,
        hasPreviousPage: !!options.cursor,
        nextCursor,
        previousCursor,
        limit,
      },
    };
  }

  private applySearch<T>(
    queryBuilder: SelectQueryBuilder<T>,
    search: string,
    searchFields: string[],
  ): void {
    if (!search || !searchFields.length) return;

    const searchConditions = searchFields
      .map((field, index) => `${field} ILIKE :search${index}`)
      .join(' OR ');

    const searchParams = searchFields.reduce((params, field, index) => {
      params[`search${index}`] = `%${search}%`;
      return params;
    }, {});

    queryBuilder.andWhere(`(${searchConditions})`, searchParams);
  }

  validatePaginationOptions(options: PaginationOptions): PaginationOptions {
    return {
      ...options,
      page: Math.max(1, options.page || 1),
      limit: Math.min(
        this.maxLimit,
        Math.max(1, options.limit || this.defaultLimit),
      ),
      sortOrder: options.sortOrder === 'DESC' ? 'DESC' : 'ASC',
    };
  }

  validateCursorPaginationOptions(
    options: CursorPaginationOptions,
  ): CursorPaginationOptions {
    return {
      ...options,
      limit: Math.min(
        this.maxLimit,
        Math.max(1, options.limit || this.defaultLimit),
      ),
      sortOrder: options.sortOrder === 'DESC' ? 'DESC' : 'ASC',
    };
  }

  createPaginationMeta(
    total: number,
    page: number,
    limit: number,
  ): PaginationResult<any>['meta'] {
    const totalPages = Math.ceil(total / limit);

    return {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  // Helper method for creating pagination links
  createPaginationLinks(
    baseUrl: string,
    meta: PaginationResult<any>['meta'],
    queryParams: Record<string, any> = {},
  ): {
    first?: string;
    previous?: string;
    next?: string;
    last?: string;
  } {
    const createUrl = (page: number) => {
      const params = new URLSearchParams({
        ...queryParams,
        page: page.toString(),
        limit: meta.limit.toString(),
      });
      return `${baseUrl}?${params.toString()}`;
    };

    const links: any = {};

    if (meta.page > 1) {
      links.first = createUrl(1);
      links.previous = createUrl(meta.page - 1);
    }

    if (meta.hasNextPage) {
      links.next = createUrl(meta.page + 1);
      links.last = createUrl(meta.totalPages);
    }

    return links;
  }
}
