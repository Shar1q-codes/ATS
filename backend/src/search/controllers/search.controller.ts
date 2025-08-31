import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  SearchService,
  SearchOptions,
  SearchResults,
} from '../services/search.service';
import {
  SavedSearchService,
  CreateSavedSearchDto,
  UpdateSavedSearchDto,
} from '../services/saved-search.service';
import { SavedSearch } from '../../entities/saved-search.entity';

export class SearchQueryDto {
  query: string;
  type?: 'candidate' | 'job' | 'application' | 'note' | 'all';
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  facets?: string[];

  // Filters
  skills?: string[];
  experience?: {
    min?: number;
    max?: number;
  };
  location?: string[];
  education?: string[];
  jobTypes?: string[];
  salaryRange?: {
    min?: number;
    max?: number;
  };
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

@ApiTags('search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly savedSearchService: SavedSearchService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Perform full-text search' })
  @ApiResponse({
    status: 200,
    description: 'Search results returned successfully',
  })
  async search(
    @Body() searchQuery: SearchQueryDto,
    @Request() req: any,
  ): Promise<SearchResults> {
    const options: SearchOptions = {
      ...searchQuery,
      tenantId: req.user.tenantId,
    };

    const results = await this.searchService.search(options);

    // Log the search for analytics
    await this.searchService.logSearch(
      searchQuery.query,
      searchQuery.type || 'all',
      results.total,
      req.user.tenantId,
      req.user.sub,
    );

    return results;
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get search suggestions' })
  @ApiResponse({
    status: 200,
    description: 'Search suggestions returned successfully',
  })
  async getSuggestions(
    @Query('q') query: string,
    @Request() req: any,
  ): Promise<{ suggestions: string[] }> {
    const suggestions = await this.searchService.suggest(
      query,
      req.user.tenantId,
    );
    return { suggestions };
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get search analytics' })
  @ApiResponse({
    status: 200,
    description: 'Search analytics returned successfully',
  })
  async getSearchAnalytics(@Request() req: any): Promise<any> {
    return this.searchService.getSearchAnalytics(req.user.tenantId);
  }

  // Saved Searches
  @Post('saved')
  @ApiOperation({ summary: 'Create a saved search' })
  @ApiResponse({
    status: 201,
    description: 'Saved search created successfully',
  })
  async createSavedSearch(
    @Body() createDto: CreateSavedSearchDto,
    @Request() req: any,
  ): Promise<SavedSearch> {
    return this.savedSearchService.create(
      createDto,
      req.user.sub,
      req.user.tenantId,
    );
  }

  @Get('saved')
  @ApiOperation({ summary: 'Get all saved searches' })
  @ApiResponse({
    status: 200,
    description: 'Saved searches returned successfully',
  })
  async getSavedSearches(@Request() req: any): Promise<SavedSearch[]> {
    return this.savedSearchService.findAll(req.user.sub, req.user.tenantId);
  }

  @Get('saved/popular')
  @ApiOperation({ summary: 'Get popular saved searches' })
  @ApiResponse({
    status: 200,
    description: 'Popular saved searches returned successfully',
  })
  async getPopularSavedSearches(
    @Query('limit') limit: string = '10',
    @Request() req: any,
  ): Promise<SavedSearch[]> {
    return this.savedSearchService.getPopularSearches(
      req.user.tenantId,
      parseInt(limit),
    );
  }

  @Get('saved/recent')
  @ApiOperation({ summary: 'Get recent saved searches' })
  @ApiResponse({
    status: 200,
    description: 'Recent saved searches returned successfully',
  })
  async getRecentSavedSearches(
    @Query('limit') limit: string = '5',
    @Request() req: any,
  ): Promise<SavedSearch[]> {
    return this.savedSearchService.getRecentSearches(
      req.user.sub,
      req.user.tenantId,
      parseInt(limit),
    );
  }

  @Get('saved/:id')
  @ApiOperation({ summary: 'Get a saved search by ID' })
  @ApiResponse({
    status: 200,
    description: 'Saved search returned successfully',
  })
  async getSavedSearch(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<SavedSearch> {
    return this.savedSearchService.findOne(id, req.user.sub, req.user.tenantId);
  }

  @Put('saved/:id')
  @ApiOperation({ summary: 'Update a saved search' })
  @ApiResponse({
    status: 200,
    description: 'Saved search updated successfully',
  })
  async updateSavedSearch(
    @Param('id') id: string,
    @Body() updateDto: UpdateSavedSearchDto,
    @Request() req: any,
  ): Promise<SavedSearch> {
    return this.savedSearchService.update(
      id,
      updateDto,
      req.user.sub,
      req.user.tenantId,
    );
  }

  @Delete('saved/:id')
  @ApiOperation({ summary: 'Delete a saved search' })
  @ApiResponse({
    status: 200,
    description: 'Saved search deleted successfully',
  })
  async deleteSavedSearch(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    await this.savedSearchService.remove(id, req.user.sub, req.user.tenantId);
    return { message: 'Saved search deleted successfully' };
  }

  @Post('saved/:id/execute')
  @ApiOperation({ summary: 'Execute a saved search' })
  @ApiResponse({
    status: 200,
    description: 'Saved search executed successfully',
  })
  async executeSavedSearch(
    @Param('id') id: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Request() req: any,
  ): Promise<SearchResults> {
    const savedSearch = await this.savedSearchService.findOne(
      id,
      req.user.sub,
      req.user.tenantId,
    );

    // Increment usage count
    await this.savedSearchService.incrementUsage(
      id,
      req.user.sub,
      req.user.tenantId,
    );

    const options: SearchOptions = {
      query: savedSearch.query,
      filters: savedSearch.filters,
      type: savedSearch.searchType,
      page: parseInt(page),
      limit: parseInt(limit),
      tenantId: req.user.tenantId,
    };

    const results = await this.searchService.search(options);

    // Log the search for analytics
    await this.searchService.logSearch(
      savedSearch.query,
      savedSearch.searchType,
      results.total,
      req.user.tenantId,
      req.user.sub,
    );

    return results;
  }

  @Post('saved/:id/share')
  @ApiOperation({ summary: 'Share a saved search with users' })
  @ApiResponse({ status: 200, description: 'Saved search shared successfully' })
  async shareSavedSearch(
    @Param('id') id: string,
    @Body() body: { userIds: string[] },
    @Request() req: any,
  ): Promise<SavedSearch> {
    return this.savedSearchService.shareSearch(
      id,
      body.userIds,
      req.user.sub,
      req.user.tenantId,
    );
  }

  @Post('saved/:id/unshare')
  @ApiOperation({ summary: 'Unshare a saved search from users' })
  @ApiResponse({
    status: 200,
    description: 'Saved search unshared successfully',
  })
  async unshareSavedSearch(
    @Param('id') id: string,
    @Body() body: { userIds: string[] },
    @Request() req: any,
  ): Promise<SavedSearch> {
    return this.savedSearchService.unshareSearch(
      id,
      body.userIds,
      req.user.sub,
      req.user.tenantId,
    );
  }

  @Post('saved/:id/duplicate')
  @ApiOperation({ summary: 'Duplicate a saved search' })
  @ApiResponse({
    status: 201,
    description: 'Saved search duplicated successfully',
  })
  async duplicateSavedSearch(
    @Param('id') id: string,
    @Body() body: { name: string },
    @Request() req: any,
  ): Promise<SavedSearch> {
    return this.savedSearchService.duplicateSearch(
      id,
      body.name,
      req.user.sub,
      req.user.tenantId,
    );
  }
}
