import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { IsInt, IsPositive, IsUUID } from 'class-validator';
import { PAGE_LIMITS } from '@hermes/shared';
import { CurrentUser, type AuthUser } from '../../common/decorators';
import { PageQueryDto } from '../../common/pagination.dto';
import { ContactsFilledGuard } from '../auth/contacts.guard';
import { BidService } from './bid.service';
import { MyBidsService } from './my-bids.service';

class PlaceBidDto {
  @IsInt()
  @IsPositive()
  amount!: number;

  @IsUUID()
  clientBidId!: string;
}

@Controller()
export class BidsController {
  constructor(
    private readonly bids: BidService,
    private readonly myBids: MyBidsService,
  ) {}

  @Post('lots/:id/bids')
  @UseGuards(ContactsFilledGuard)
  place(
    @Param('id', ParseUUIDPipe) lotId: string,
    @Body() dto: PlaceBidDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.bids.placeBid(lotId, user!.id, dto.amount, dto.clientBidId);
  }

  @Get('me/bids')
  my(
    @CurrentUser() user: AuthUser,
    @Query('tab') tab: 'active' | 'won' = 'active',
    @Query() page: PageQueryDto,
  ) {
    return this.myBids.list(user!.id, tab, page.limit ?? PAGE_LIMITS.myBids, page.offset ?? 0);
  }
}
