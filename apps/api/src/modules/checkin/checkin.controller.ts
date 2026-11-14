import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CheckerAdjustTripSeatsSchema,
  CheckerLoginSchema,
  CheckerSetTripStatusSchema,
  CheckerTripListQuerySchema,
  VerifyTicketSchema,
} from '@sanqin/shared';
import { CurrentUser, Public } from '../auth/decorators/decorators';
import { JwtAuthGuard } from '../../core/guards/jwt.guard';
import { CheckerTripService } from './checker-trip.service';
import { CheckinService } from './checkin.service';

/**
 * 核销员接口（P0 核销端 REST）：
 * 仅允许核销员 JWT（type=checker）访问，乘客/管理端 token 一律拒绝。
 * 班次处置（看板/调余票/上下线）写操作落 TripOperation 审计。
 */
@Controller('checker')
export class CheckinController {
  constructor(
    private readonly checkinService: CheckinService,
    private readonly checkerTripService: CheckerTripService,
  ) {}

  @Public()
  @Post('login')
  async login(@Body() body: unknown) {
    const input = CheckerLoginSchema.parse(body);
    return this.checkinService.login(input.phone, input.password);
  }

  /**
   * 身份检查 + 手机号一致性绑定（乘客 JWT）：登录后调用，识别是否核销员并回填 openid。
   */
  @Get('identity')
  @UseGuards(JwtAuthGuard)
  async identity(@CurrentUser() user: any) {
    this.assertUser(user);
    return this.checkinService.identity(user.id);
  }

  /**
   * 核销员免密登录（乘客 JWT）：openid 已绑定时签发 checker JWT。
   */
  @Post('openid-login')
  @UseGuards(JwtAuthGuard)
  async openidLogin(@CurrentUser() user: any) {
    this.assertUser(user);
    return this.checkinService.openidLogin(user.id);
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  async verify(@CurrentUser() user: any, @Body() body: unknown) {
    this.assertChecker(user);
    const input = VerifyTicketSchema.parse(body);
    return this.checkinService.verify(user.id, input);
  }

  @Get('records')
  @UseGuards(JwtAuthGuard)
  async records(
    @CurrentUser() user: any,
    @Query('tripId') tripId?: string,
    @Query('date') date?: string,
  ) {
    this.assertChecker(user);
    return {
      success: true,
      data: await this.checkinService.records(user.id, { tripId, date }),
    };
  }

  /** 班次运营看板：按日期查班次的已售/余票/已核销与可购状态 */
  @Get('trips')
  @UseGuards(JwtAuthGuard)
  async trips(@CurrentUser() user: any, @Query('date') date?: string) {
    this.assertChecker(user);
    const query = CheckerTripListQuerySchema.parse({ date });
    return {
      success: true,
      data: await this.checkerTripService.listTrips(query.date),
    };
  }

  /** 调整班次总票数（余票随之变化，不得低于已售） */
  @Put('trips/:id/seats')
  @UseGuards(JwtAuthGuard)
  async adjustSeats(@CurrentUser() user: any, @Param('id') tripId: string, @Body() body: unknown) {
    this.assertChecker(user);
    const input = CheckerAdjustTripSeatsSchema.parse(body);
    return this.checkerTripService.adjustSeats(tripId, user.id, input);
  }

  /** 上下线班次（在售 ⇄ 停售） */
  @Put('trips/:id/status')
  @UseGuards(JwtAuthGuard)
  async setTripStatus(
    @CurrentUser() user: any,
    @Param('id') tripId: string,
    @Body() body: unknown,
  ) {
    this.assertChecker(user);
    const input = CheckerSetTripStatusSchema.parse(body);
    return this.checkerTripService.setTripStatus(tripId, user.id, input);
  }

  private assertChecker(user: any) {
    if (user?.type !== 'checker') {
      throw new ForbiddenException('仅核销员可访问核销接口');
    }
  }

  /** identity/openid-login 仅允许乘客身份（type=user）调用 */
  private assertUser(user: any) {
    if (user?.type !== 'user') {
      throw new ForbiddenException('仅乘客账号可访问身份绑定接口');
    }
  }
}
