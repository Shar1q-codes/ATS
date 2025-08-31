import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration is missing');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async uploadFile(
    file: Express.Multer.File,
    candidateId: string,
  ): Promise<{ url: string; path: string }> {
    try {
      const fileExtension = this.getFileExtension(file.originalname);
      const fileName = `resume_${Date.now()}${fileExtension}`;
      const filePath = `candidates/${candidateId}/${fileName}`;

      this.logger.log(`Uploading file to path: ${filePath}`);

      const { data, error } = await this.supabase.storage
        .from('resumes')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        this.logger.error('Failed to upload file to Supabase:', error);
        throw new Error(`File upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);

      this.logger.log(`File uploaded successfully: ${urlData.publicUrl}`);

      return {
        url: urlData.publicUrl,
        path: filePath,
      };
    } catch (error) {
      this.logger.error('Error uploading file:', error);
      throw error;
    }
  }

  async downloadFile(filePath: string): Promise<Buffer> {
    try {
      this.logger.log(`Downloading file from path: ${filePath}`);

      const { data, error } = await this.supabase.storage
        .from('resumes')
        .download(filePath);

      if (error) {
        this.logger.error('Failed to download file from Supabase:', error);
        throw new Error(`File download failed: ${error.message}`);
      }

      const buffer = Buffer.from(await data.arrayBuffer());
      this.logger.log(
        `File downloaded successfully, size: ${buffer.length} bytes`,
      );

      return buffer;
    } catch (error) {
      this.logger.error('Error downloading file:', error);
      throw error;
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      this.logger.log(`Deleting file from path: ${filePath}`);

      const { error } = await this.supabase.storage
        .from('resumes')
        .remove([filePath]);

      if (error) {
        this.logger.error('Failed to delete file from Supabase:', error);
        throw new Error(`File deletion failed: ${error.message}`);
      }

      this.logger.log('File deleted successfully');
    } catch (error) {
      this.logger.error('Error deleting file:', error);
      throw error;
    }
  }

  private getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex !== -1 ? filename.substring(lastDotIndex) : '';
  }

  validateFileType(file: Express.Multer.File): boolean {
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'image/jpeg',
      'image/png',
      'image/gif',
    ];

    return allowedMimes.includes(file.mimetype);
  }

  validateFileSize(
    file: Express.Multer.File,
    maxSizeInMB: number = 10,
  ): boolean {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    return file.size <= maxSizeInBytes;
  }
}
