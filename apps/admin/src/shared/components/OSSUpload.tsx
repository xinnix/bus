import React, { useState } from 'react';
import { Upload, Button, App, Image } from 'antd';
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { OSSUploader } from '../utils/oss-upload';
import type { UploadType } from '../utils/oss-upload';

interface OSSUploadProps {
  value?: string;
  onChange?: (url: string) => void;
  type: UploadType;
  maxFileSize?: number; // 最大文件大小（字节）
  accept?: string; // 接受的文件类型
  disabled?: boolean;
  showPreview?: boolean;
}

/**
 * OSS 直传上传组件
 *
 * 特性：
 * - 支持前端直传 OSS，不经过后端服务器
 * - 自动获取上传凭证
 * - 支持文件类型和大小验证
 * - 支持预览和删除
 */
export const OSSUpload: React.FC<OSSUploadProps> = ({
  value,
  onChange,
  type,
  maxFileSize = 5 * 1024 * 1024, // 默认 5MB
  accept = 'image/jpeg,image/png,image/gif,image/webp',
  disabled = false,
  showPreview = true,
}) => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>(
    value
      ? [
          {
            uid: '-1',
            name: 'image',
            status: 'done',
            url: value,
          },
        ]
      : [],
  );

  /**
   * 自定义上传处理
   */
  const customUpload = async (options: any) => {
    const { file, onSuccess, onError } = options;

    try {
      setLoading(true);

      // 验证文件类型
      const allowedTypes = accept.split(',');
      if (!OSSUploader.validateFileType(file, allowedTypes)) {
        throw new Error('文件类型不支持');
      }

      // 验证文件大小
      if (!OSSUploader.validateFileSize(file, maxFileSize)) {
        throw new Error(`文件大小不能超过 ${Math.floor(maxFileSize / 1024 / 1024)}MB`);
      }

      // 上传文件
      const result = await OSSUploader.upload(file, type);

      // 更新文件列表
      setFileList([
        {
          uid: file.uid,
          name: file.name,
          status: 'done',
          url: result.url,
        },
      ]);

      // 触发 onChange
      onChange?.(result.url);

      onSuccess(result, file);
      message.success('上传成功');
    } catch (error: any) {
      onError(error);
      message.error(error.message || '上传失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 删除文件
   */
  const handleRemove = () => {
    setFileList([]);
    onChange?.('');
  };

  return (
    <div>
      {value && showPreview ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Image
            src={value}
            alt="uploaded"
            width={100}
            height={100}
            style={{ objectFit: 'cover', borderRadius: '4px' }}
          />
          {!disabled && (
            <Button danger icon={<DeleteOutlined />} onClick={handleRemove} loading={loading}>
              删除
            </Button>
          )}
        </div>
      ) : (
        <Upload
          fileList={fileList}
          customRequest={customUpload}
          accept={accept}
          disabled={disabled || loading}
          maxCount={1}
          showUploadList={false}
        >
          <Button icon={<UploadOutlined />} loading={loading} disabled={disabled}>
            {loading ? '上传中...' : '上传图片'}
          </Button>
        </Upload>
      )}

      <div style={{ marginTop: '8px', color: '#999', fontSize: '12px' }}>
        支持 JPG、PNG、GIF、WEBP 格式，最大 {Math.floor(maxFileSize / 1024 / 1024)}MB
      </div>
    </div>
  );
};
