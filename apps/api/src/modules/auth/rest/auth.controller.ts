import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';
import { Public, CurrentUser } from '../decorators/decorators';
import { JwtAuthGuard } from '../../../core/guards/jwt.guard';

import { LoginSchema, RegisterSchema, RefreshTokenSchema } from '@sanqin/shared';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: typeof RegisterSchema) {
    const validatedData = RegisterSchema.parse(body);
    return this.authService.registerUser(validatedData);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: typeof LoginSchema) {
    const validatedData = LoginSchema.parse(body);
    return this.authService.loginUser(validatedData);
  }

  @Public()
  @Post('wechat/login')
  @HttpCode(HttpStatus.OK)
  async wechatLogin(@Body('code') code: string) {
    return this.authService.loginWithWechat(code);
  }

  @Public()
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  async adminLogin(@Body() body: typeof LoginSchema) {
    const validatedData = LoginSchema.parse(body);
    return this.authService.loginAdmin(validatedData);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() body: typeof RefreshTokenSchema) {
    const validatedData = RefreshTokenSchema.parse(body);
    return this.authService.refreshToken(validatedData);
  }

  @Public()
  @Post('dev-login')
  @HttpCode(HttpStatus.OK)
  async devLogin(@Body() body: { phone?: string; name?: string }) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('生产环境不允许开发登录');
    }
    if (!body?.phone) throw new ForbiddenException('缺少手机号');
    return this.authService.devLogin(body.phone, body.name);
  }

  @Post('wechat/phone')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async bindWechatPhone(@CurrentUser() user: any, @Body('code') code: string) {
    if (!code) {
      return { success: false, message: '缺少手机号授权 code' };
    }
    return { success: true, data: await this.authService.bindWechatPhone(user.id, code) };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@CurrentUser() user: any) {
    return this.authService.getCurrentUser(user.id);
  }

  @Post('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateCurrentUser(
    @CurrentUser() user: any,
    @Body() body: { nickname?: string; avatar?: string; phone?: string },
  ) {
    // 手机号仅在提供时校验格式（购票预填依赖该字段，格式必须可靠）
    if (body?.phone && !/^1\d{10}$/.test(body.phone)) {
      throw new BadRequestException('手机号格式不正确');
    }
    return this.authService.updateUserProfile(user.id, body);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: any, @Body() body: z.infer<typeof RefreshTokenSchema>) {
    const validatedData = RefreshTokenSchema.parse(body);
    return this.authService.logout(user.id, validatedData.refreshToken);
  }
}
