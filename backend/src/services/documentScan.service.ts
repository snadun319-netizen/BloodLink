import net from 'node:net';
import { HttpError } from '../transaction';

// ClamAV INSTREAM protocol. Documents never need a public URL or temporary file.
export async function scanDocument(content: Buffer): Promise<void> {
  const host = process.env.CLAMAV_HOST;
  if (!host) {
    if (process.env.NODE_ENV === 'production') throw new HttpError(503, 'Document scanning is not configured');
    return;
  }
  const port = Number(process.env.CLAMAV_PORT || 3310);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new HttpError(503, 'Document scanning is not configured');
  await new Promise<void>((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    let result = '', settled = false;
    const finish = (error?: Error) => {
      if (settled) return; settled = true; socket.destroy();
      if (error) reject(error); else resolve();
    };
    socket.setTimeout(15000, () => finish(new HttpError(503, 'Document scanning timed out')));
    socket.once('error', () => finish(new HttpError(503, 'Document scanning is unavailable')));
    socket.once('connect', () => {
      socket.write(Buffer.from('zINSTREAM\0'));
      for (let offset = 0; offset < content.length; offset += 65536) {
        const chunk = content.subarray(offset, offset + 65536), size = Buffer.alloc(4);
        size.writeUInt32BE(chunk.length); socket.write(size); socket.write(chunk);
      }
      socket.write(Buffer.alloc(4));
    });
    socket.on('data', data => {
      result += data.toString('utf8');
      if (result.length > 4096) return finish(new HttpError(503, 'Invalid document scanner response'));
      if (!result.includes('\0')) return;
      if (/ FOUND\0/.test(result)) return finish(new HttpError(400, 'The document failed malware scanning'));
      if (result === 'stream: OK\0') return finish();
      finish(new HttpError(503, 'Document scanning failed'));
    });
    socket.once('end', () => { if (!settled) finish(new HttpError(503, 'Incomplete document scanner response')); });
    socket.once('close', () => { if (!settled) finish(new HttpError(503, 'Document scanning connection closed')); });
  });
}
