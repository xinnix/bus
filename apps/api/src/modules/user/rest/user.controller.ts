import { Controller, Get, UseGuards, Param, Query } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtAuthGuard } from '../../../core/guards/jwt.guard';
import { CurrentUser } from '../../../modules/auth/decorators/decorators';

@Controller('user')
export class UserController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@CurrentUser() currentUser: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: currentUser.id },
    });

    if (!user) {
      return {
        success: false,
        message: '用户不存在',
      };
    }

    const { passwordHash: _, ...sanitizedUser } = user;

    return {
      success: true,
      data: sanitizedUser,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getUsers(@Query() query: any) {
    const { page = 1, pageSize = 10, search, isActive } = query;

    const where: any = {};

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      success: true,
      data: users.map((user) => {
        const { passwordHash: _, ...sanitizedUser } = user;
        return sanitizedUser;
      }),
      meta: {
        total,
        page: Number(page),
        pageSize: Number(pageSize),
        totalPages: Math.ceil(total / Number(pageSize)),
      },
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getUserById(@Param('id') id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return {
        success: false,
        message: '用户不存在',
      };
    }

    const { passwordHash: _, ...sanitizedUser } = user;

    return {
      success: true,
      data: sanitizedUser,
    };
  }
}
