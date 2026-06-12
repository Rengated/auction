import { Controller, Delete, Get, Param, ParseUUIDPipe, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, Public, type AuthUser } from '../../common/decorators';
import { NotBlockedGuard } from '../auth/not-blocked.guard';
import { LotsService, type CatalogFilter } from './lots.service';

@Controller('lots')
export class LotsController {
  constructor(private readonly lots: LotsService) {}

  @Public()
  @Get()
  catalog(
    @Query('filter') filter: CatalogFilter = 'all',
    @Query('q') q: string | undefined,
    @CurrentUser() user: AuthUser | null,
  ) {
    return this.lots.catalog(filter, q, user?.id ?? null);
  }

  @Public()
  @Get(':id')
  byId(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser | null) {
    return this.lots.byId(id, user?.id ?? null);
  }

  @Public()
  @Get(':id/bids')
  bids(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser | null) {
    return this.lots.bidsFeed(id, user?.id ?? null);
  }

  @UseGuards(NotBlockedGuard)
  @Put(':id/favorite')
  async fav(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    await this.lots.setFavorite(id, user!.id, true);
    return { ok: true };
  }

  @UseGuards(NotBlockedGuard)
  @Delete(':id/favorite')
  async unfav(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    await this.lots.setFavorite(id, user!.id, false);
    return { ok: true };
  }
}
