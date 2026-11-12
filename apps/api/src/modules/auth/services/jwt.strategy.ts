import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';

interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    if (!payload || !payload.sub) {
      throw new Error('Invalid token payload');
    }

    const userType = payload.type || 'admin'; // 默认为 admin，兼容旧 token

    if (userType === 'user') {
      // 小程序用户：从 User 表查找
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new Error('用户不存在');
      }

      if (!user.isActive) {
        throw new Error('用户已被禁用');
      }

      return {
        id: user.id,
        email: user.email,
        username: user.username,
        type: 'user',
      };
    } else {
      // 管理端用户：从 Admin 表查找
      const admin = await this.prisma.admin.findUnique({
        where: { id: payload.sub },
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!admin) {
        throw new Error('管理员不存在');
      }

      if (!admin.isActive) {
        throw new Error('管理员已被禁用');
      }

      // 扁平化权限
      const permissions =
        admin.roles?.flatMap((ar: any) =>
          ar.role.permissions?.map(
            (rp: any) => `${rp.permission.resource}:${rp.permission.action}`,
          ),
        ) || [];

      return {
        id: admin.id,
        email: admin.email,
        username: admin.username,
        roles: admin.roles?.map((ar: any) => ar.role),
        permissions,
        type: 'admin',
      };
    }
  }
}
