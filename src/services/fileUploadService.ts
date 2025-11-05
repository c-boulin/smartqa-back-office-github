import { apiService } from './api';

export interface FileUploadResult {
  key: string;
  url: string;
  cloudFrontUrl: string;
}

export interface SignedUrlResponse {
  data: {
    url: string;
  };
}

export type UploadFieldType = 'description' | 'precondition' | 'step' | 'expected_result' | 'execution-comments';

class FileUploadService {
  private readonly CLOUDFRONT_DOMAIN: string;

  constructor() {
    const domain = import.meta.env.VITE_ASSETS_CLOUDFRONT_DOMAIN;
    if (!domain || typeof domain !== 'string' || domain.trim() === '') {
      console.error('VITE_ASSETS_CLOUDFRONT_DOMAIN is not defined or is empty. Please set it in your environment.');
      throw new Error('VITE_ASSETS_CLOUDFRONT_DOMAIN is not configured. Please check your environment variables.');
    }
    this.CLOUDFRONT_DOMAIN = domain;
  }

  /**
   * Generate a unique file name to prevent conflicts
   */
  generateUniqueFileName(originalName: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop() || '';
    return `${timestamp}_${randomString}.${extension}`;
  }

  /**
   * Create S3 key based on field and unique file name
   */
  createS3Key(fieldName: UploadFieldType, uniqueFileName: string): string {
    return `${fieldName}/${uniqueFileName}`;
  }

  /**
   * Request signed URL from the API
   */
  async getSignedUrl(key: string, contentType: string): Promise<string> {
    try {
      const params = new URLSearchParams({
        key: key,
        content_type: contentType
      });

      const response: SignedUrlResponse = await apiService.authenticatedRequest(
        `/s3/signed-url?${params.toString()}`
      );

      if (!response?.data?.url) {
        throw new Error('Invalid signed URL response');
      }

      return response.data.url;
    } catch (error) {
      console.error('Failed to get signed URL:', error);
      throw new Error(`Failed to get signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload file to S3 using signed URL
   */
  async uploadToS3(signedUrl: string, file: File): Promise<void> {
    try {
      const response = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!response.ok) {
        throw new Error(`S3 upload failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to upload to S3:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get CloudFront URL for displaying the uploaded file
   */
  getCloudFrontUrl(key: string): string {
    return `${this.CLOUDFRONT_DOMAIN}/${key}`;
  }

  /**
   * Complete file upload workflow
   */
  async uploadFile(file: File, fieldName: UploadFieldType): Promise<FileUploadResult> {
    try {
      // Step 1: Generate unique file name
      const uniqueFileName = this.generateUniqueFileName(file.name);
      
      // Step 2: Create S3 key
      const s3Key = this.createS3Key(fieldName, uniqueFileName);
      
      // Step 3: Request signed URL
      const signedUrl = await this.getSignedUrl(s3Key, file.type);
      
      // Step 4: Upload to S3
      await this.uploadToS3(signedUrl, file);
      
      // Step 5: Generate CloudFront URL
      const cloudFrontUrl = this.getCloudFrontUrl(s3Key);
      
      return {
        key: s3Key,
        url: signedUrl,
        cloudFrontUrl
      };
    } catch (error) {
      console.error('File upload workflow failed:', error);
      throw error;
    }
  }

  /**
   * Check if file is an image
   */
  isImage(file: File): boolean {
    return file.type.startsWith('image/');
  }

  /**
   * Generate HTML for displaying uploaded file
   */
  generateFileHtml(file: File, cloudFrontUrl: string): string {
    if (this.isImage(file)) {
      return `<img src="${cloudFrontUrl}" alt="${file.name}" style="max-width: 300px; max-height: 200px; width: auto; height: auto; border-radius: 8px; margin: 8px; box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3); object-fit: contain; display: inline-block; vertical-align: top;" />`;
    } else {
      return `<a href="${cloudFrontUrl}" target="_blank" style="color: #06b6d4; text-decoration: underline;">${file.name}</a>`;
    }
  }
}

export const fileUploadService = new FileUploadService();