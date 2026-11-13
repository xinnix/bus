import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CheckerLoginSchema, VerifyTicketSchema } from '@sanqin/shared';
import { CurrentUser, Public } from '../auth/decorators/decorators';
import { JwtAuthGuard } from '../../core/guards/jwt.guard';
import { CheckinService } from './checkin.service';

/**
 * 核销员接口（P0 核销端 REST）：
 * 仅允许核销员 JWT（type=checker）访问，乘客/管理端 token 一律拒绝。
 */
@Controller('checker')
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

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
