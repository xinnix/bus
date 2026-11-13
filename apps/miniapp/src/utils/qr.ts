/**
 * 电子票二维码矩阵生成。
 *
 * 在页面脚本内直接计算矩阵（不走子组件 props 通道），输出紧凑的 0/1 矩阵
 * 供模板用 view 格子渲染——不依赖 canvas，微信开发者工具/真机均可显示。
 */
import UQRCode from 'uqrcodejs';

/** 二维码展示总宽（rpx），四周再由样式补白边（quiet zone） */
export const QR_DISPLAY_WIDTH_RPX = 480;

export interface QrMatrix {
  /** moduleCount × moduleCount，1 为黑格 */
  rows: number[][];
  /** 单格边长（rpx），按总宽自适应 */
  cellRpx: number;
}

/**
 * 生成二维码矩阵；内容超长等原因编码失败时抛错，由调用方降级为展示核销码。
 */
export function makeQrMatrix(data: string): QrMatrix {
  const qr = new UQRCode();
  qr.data = data;
  qr.make();
  const count = Number(qr.moduleCount) || qr.modules?.length || 0;
  if (!count) throw new Error('二维码生成失败');
  const rows = (qr.modules as Array<Array<{ isBlack?: boolean }>>).map((row) =>
    row.map((cell) => (cell?.isBlack ? 1 : 0)),
  );
  return { rows, cellRpx: Math.max(2, Math.floor(QR_DISPLAY_WIDTH_RPX / count)) };
}
