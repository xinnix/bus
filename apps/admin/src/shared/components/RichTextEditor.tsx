// apps/admin/src/shared/components/RichTextEditor.tsx
import { useEffect, useRef, useState } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { OSSUploader } from '../utils/oss-upload';
import { message } from 'antd';

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = '请输入内容...',
}) => {
  const quillRef = useRef<HTMLDivElement>(null);
  const [quill, setQuill] = useState<Quill | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const isInternalChange = useRef(false);
  const initialized = useRef(false);

  // 初始化 Quill 实例
  useEffect(() => {
    if (!quillRef.current || initialized.current) return;
    initialized.current = true;

    const quillInstance = new Quill(quillRef.current, {
      theme: 'snow',
      placeholder,
      modules: {
        toolbar: {
          container: [
            [{ header: [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            [{ color: [] }, { background: [] }],
            ['link', 'image'],
            [{ align: [] }],
            ['clean'],
          ],
          handlers: {
            // 自定义图片上传处理
            image: function (this: any) {
              const input = document.createElement('input');
              input.setAttribute('type', 'file');
              input.setAttribute('accept', 'image/*');
              input.click();

              input.onchange = async () => {
                const file = input.files?.[0];
                if (!file) return;

                try {
                  // 验证文件类型
                  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                  if (!OSSUploader.validateFileType(file, allowedTypes)) {
                    message.error('仅支持 JPG、PNG、GIF、WEBP 格式的图片');
                    return;
                  }

                  // 验证文件大小（最大 5MB）
                  const maxSize = 5 * 1024 * 1024;
                  if (!OSSUploader.validateFileSize(file, maxSize)) {
                    message.error('图片大小不能超过 5MB');
                    return;
                  }

                  message.loading({ content: '图片上传中...', key: 'upload' });

                  // 上传到 OSS
                  const result = await OSSUploader.upload(file, 'news_content');

                  message.success({ content: '图片上传成功', key: 'upload' });

                  // 获取光标位置
                  const range = this.quill.getSelection();
                  const index = range?.index ?? 0;

                  // 插入图片 URL
                  this.quill.insertEmbed(index, 'image', result.url);
                  this.quill.setSelection(index + 1, 0);
                } catch (error: any) {
                  message.error({
                    content: error.message || '图片上传失败',
                    key: 'upload',
                  });
                  console.error('Image upload error:', error);
                }
              };
            },
          },
        },
      },
    });

    setQuill(quillInstance);
  }, [placeholder]);

  // quill 实例就绪后设置初始值和监听
  useEffect(() => {
    if (!quill) return;

    if (value) {
      isInternalChange.current = true;
      quill.root.innerHTML = value;
      isInternalChange.current = false;
    }

    quill.on('text-change', () => {
      if (!isInternalChange.current) {
        const html = quill.root.innerHTML;
        onChangeRef.current?.(html === '<p><br></p>' ? '' : html);
      }
    });
  }, [quill]);

  // 外部 value 变化时同步到编辑器
  useEffect(() => {
    if (!quill) return;
    const currentHtml = quill.root.innerHTML;
    const normalizedValue = value || '';
    const normalizedCurrent = currentHtml === '<p><br></p>' ? '' : currentHtml;
    if (normalizedValue !== normalizedCurrent) {
      isInternalChange.current = true;
      quill.root.innerHTML = normalizedValue || '<p><br></p>';
      isInternalChange.current = false;
    }
  }, [quill, value]);

  return (
    <div style={{ minHeight: 500 }}>
      <div ref={quillRef} />
      <style>{`
        .ql-container {
          min-height: 400px;
          font-size: 16px;
        }
        .ql-editor {
          min-height: 400px;
        }
      `}</style>
    </div>
  );
};
