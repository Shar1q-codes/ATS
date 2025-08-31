import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';
import * as zlib from 'zlib';

@Injectable()
export class CompressionInterceptor implements NestInterceptor {
  private readonly minCompressionSize = 1024; // 1KB minimum
  private readonly compressibleTypes = [
    'application/json',
    'text/plain',
    'text/html',
    'text/css',
    'text/javascript',
    'application/javascript',
    'application/xml',
    'text/xml',
  ];

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse<Response>();
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      map((data) => {
        // Only compress if client accepts compression
        const acceptEncoding = request.headers['accept-encoding'] || '';

        if (!this.shouldCompress(data, response, acceptEncoding)) {
          return data;
        }

        const jsonData = JSON.stringify(data);
        const dataSize = Buffer.byteLength(jsonData, 'utf8');

        // Only compress if data is large enough
        if (dataSize < this.minCompressionSize) {
          return data;
        }

        try {
          let compressed: Buffer;
          let encoding: string;

          if (acceptEncoding.includes('gzip')) {
            compressed = zlib.gzipSync(jsonData);
            encoding = 'gzip';
          } else if (acceptEncoding.includes('deflate')) {
            compressed = zlib.deflateSync(jsonData);
            encoding = 'deflate';
          } else {
            return data; // No supported compression
          }

          // Set compression headers
          response.setHeader('Content-Encoding', encoding);
          response.setHeader('Content-Length', compressed.length);
          response.setHeader('Vary', 'Accept-Encoding');

          // Calculate compression ratio
          const compressionRatio =
            ((dataSize - compressed.length) / dataSize) * 100;
          response.setHeader(
            'X-Compression-Ratio',
            compressionRatio.toFixed(2),
          );

          // Send compressed data
          response.end(compressed);
          return; // Don't return data as we've already sent the response
        } catch (error) {
          // If compression fails, return original data
          console.error('Compression error:', error);
          return data;
        }
      }),
    );
  }

  private shouldCompress(
    data: any,
    response: Response,
    acceptEncoding: string,
  ): boolean {
    // Check if client accepts compression
    if (
      !acceptEncoding.includes('gzip') &&
      !acceptEncoding.includes('deflate')
    ) {
      return false;
    }

    // Check if response is already compressed
    if (response.getHeader('Content-Encoding')) {
      return false;
    }

    // Check content type
    const contentType = response.getHeader('Content-Type') as string;
    if (contentType && !this.isCompressibleType(contentType)) {
      return false;
    }

    // Check if data is compressible
    if (!data || typeof data !== 'object') {
      return false;
    }

    return true;
  }

  private isCompressibleType(contentType: string): boolean {
    return this.compressibleTypes.some((type) =>
      contentType.toLowerCase().includes(type),
    );
  }
}
