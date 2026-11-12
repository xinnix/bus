import { Injectable } from '@nestjs/common';
import crypto from 'crypto';

@Injectable()
export class WecomCryptoService {
  /**
   * 验证签名: SHA1(sort([token, timestamp, nonce])) == signature
   * 用于 GET 回调验证
   */
  verifySignature(token: string, timestamp: string, nonce: string, signature: string): boolean {
    const parts = [token, timestamp, nonce].sort();
    const hash = crypto.createHash('sha1').update(parts.join('')).digest('hex');
    return hash === signature;
  }

  /**
   * 验证签名（含加密内容）: SHA1(sort([token, timestamp, nonce, encrypt])) == signature
   * 用于 POST 消息/事件回调
   */
  verifySignatureWithEncrypt(
    token: string,
    timestamp: string,
    nonce: string,
    encrypt: string,
    signature: string,
  ): boolean {
    const parts = [token, timestamp, nonce, encrypt].sort();
    const hash = crypto.createHash('sha1').update(parts.join('')).digest('hex');
    return hash === signature;
  }

  /**
   * 解密企业微信消息
   * AES-256-CBC，key = base64decode(EncodingAESKey + "=")，IV = key 前16字节
   * 明文格式: random(16) + msgLen(4, big-endian) + msg + corpId
   */
  decryptMessage(encodingAESKey: string, corpId: string, encrypted: string): string {
    const aesKey = Buffer.from(encodingAESKey + '=', 'base64');
    const iv = aesKey.subarray(0, 16);

    const encryptedBuf = Buffer.from(encrypted, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, iv);
    decipher.setAutoPadding(false);
    let decrypted = Buffer.concat([decipher.update(encryptedBuf), decipher.final()]);

    // 去掉 16 字节随机前缀
    decrypted = decrypted.subarray(16);

    // 读取 4 字节消息长度（big-endian）
    const msgLen = decrypted.readUInt32BE(0);
    decrypted = decrypted.subarray(4);

    // 提取消息
    const message = decrypted.subarray(0, msgLen).toString('utf-8');

    // 验证 corpId
    const receivedCorpId = decrypted.subarray(msgLen).toString('utf-8');
    if (receivedCorpId !== corpId) {
      throw new Error(`corpId 不匹配: 期望 ${corpId}, 实际 ${receivedCorpId}`);
    }

    return message;
  }

  /**
   * 加密企业微信回复消息
   * 格式: random(16) + msgLen(4, big-endian) + msg + corpId
   * 然后 AES-256-CBC 加密，base64 编码
   */
  encryptMessage(encodingAESKey: string, corpId: string, replyMsg: string): string {
    const aesKey = Buffer.from(encodingAESKey + '=', 'base64');
    const iv = aesKey.subarray(0, 16);

    const random = crypto.randomBytes(16);
    const msgBuf = Buffer.from(replyMsg, 'utf-8');
    const msgLenBuf = Buffer.alloc(4);
    msgLenBuf.writeUInt32BE(msgBuf.length, 0);
    const corpIdBuf = Buffer.from(corpId, 'utf-8');

    const plainBuf = Buffer.concat([random, msgLenBuf, msgBuf, corpIdBuf]);

    // PKCS7 padding to 32-byte block size
    const blockSize = 32;
    const padLen = blockSize - (plainBuf.length % blockSize);
    const padBuf = Buffer.alloc(padLen, padLen);
    const paddedBuf = Buffer.concat([plainBuf, padBuf]);

    const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
    cipher.setAutoPadding(false);
    const encrypted = Buffer.concat([cipher.update(paddedBuf), cipher.final()]);

    return encrypted.toString('base64');
  }

  /**
   * 生成签名（用于加密回复消息）
   */
  generateSignature(token: string, timestamp: string, nonce: string, encrypt: string): string {
    const parts = [token, timestamp, nonce, encrypt].sort();
    return crypto.createHash('sha1').update(parts.join('')).digest('hex');
  }

  /**
   * 从 XML 中提取 <Encrypt> 值
   */
  extractEncryptFromXml(xmlBody: string): string {
    const match = xmlBody.match(/<Encrypt><!\[CDATA\[(.*?)\]\]><\/Encrypt>/);
    if (match) return match[1];
    // 无 CDATA 的情况
    const match2 = xmlBody.match(/<Encrypt>(.*?)<\/Encrypt>/);
    if (match2) return match2[1];
    throw new Error('无法从 XML 中提取 Encrypt 字段');
  }

  /**
   * 简单 XML 解析为对象
   * 企业微信回调 XML 结构简单，不需要完整 XML 解析器
   */
  parseXml(xml: string): Record<string, string> {
    const result: Record<string, string> = {};
    const regex = /<(\w+)><!\[CDATA\[(.*?)\]\]><\/\1>|<(\w+)>(.*?)<\/\3>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      const key = match[1] || match[3];
      const value = match[2] || match[4];
      if (key && value !== undefined) {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * 生成加密回复 XML
   */
  generateEncryptedXml(
    token: string,
    encodingAESKey: string,
    corpId: string,
    replyMsg: string,
  ): string {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(8).toString('hex');
    const encrypt = this.encryptMessage(encodingAESKey, corpId, replyMsg);
    const signature = this.generateSignature(token, timestamp, nonce, encrypt);

    return `<xml>
<Encrypt><![CDATA[${encrypt}]]></Encrypt>
<MsgSignature><![CDATA[${signature}]]></MsgSignature>
<Timestamp>${timestamp}</Timestamp>
<Nonce><![CDATA[${nonce}]]></Nonce>
</xml>`;
  }
}
