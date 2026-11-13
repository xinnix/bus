import { router } from './trpc';

// Merge all feature routers here
import { authRouter } from '../modules/auth/trpc/auth.router';
import { userRouter } from '../modules/user/trpc/user.router';
import { adminRouter } from '../modules/admin/trpc/admin.router';
import { roleRouter } from '../modules/role/trpc/role.router';
import { permissionRouter } from '../modules/permission/trpc/permission.router';
import { uploadRouter } from '../modules/upload/trpc/upload.router';
import { paymentRouter } from '../modules/payment/trpc/payment.router';
import { lineRouter } from '../modules/line/line.router';
import { stationRouter } from '../modules/station/station.router';
import { scheduleTemplateRouter, tripRouter } from '../modules/schedule/schedule.router';
import { orderRouter } from '../modules/order/order.router';
import { checkinRouter } from '../modules/checkin/checkin.router';
import { checkerRouter } from '../modules/checkin/checker.router';
import { wecomRouter } from '../modules/wecom/trpc/wecom.router';
import { settingsRouter } from '../modules/settings/trpc/settings.router';
import { changelogRouter } from '../modules/changelog/trpc/changelog.router';

export const appRouter = router({
  auth: authRouter,
  user: userRouter,
  admin: adminRouter,
  role: roleRouter,
  permission: permissionRouter,
  upload: uploadRouter,
  payment: paymentRouter,
  line: lineRouter,
  station: stationRouter,
  scheduleTemplate: scheduleTemplateRouter,
  trip: tripRouter,
  order: orderRouter,
  checkin: checkinRouter,
  checker: checkerRouter,
  wecom: wecomRouter,
  settings: settingsRouter,
  changelog: changelogRouter,
});

export type AppRouter = typeof appRouter;
