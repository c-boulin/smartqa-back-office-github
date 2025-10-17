import { apiService } from './api';

export interface AttachmentUploadResult {
  key: string;
  url: string;
  cloudFrontUrl: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  attachmentId?: string;
}

export interface SignedUrlResponse {
  data: {
    url: string;
  };
}

class AttachmentUploadService {
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
    const nameWithoutExtension = originalName.replace(/\.[^/.]+$/, '');
    const sanitizedName = nameWithoutExtension.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${timestamp}_${randomString}_${sanitizedName}.${extension}`;
  }

  /**
   * Create S3 key for attachment
   */
  createAttachmentKey(uniqueFileName: string): string {
    return `attachments/${uniqueFileName}`;
  }

  /**
   * Detect and normalize content type for PHP S3Client compatibility
   */
  normalizeContentType(file: File): string {
    let contentType = file.type;
    
    // Handle cases where browser doesn't detect MIME type correctly
    if (!contentType || contentType === 'application/octet-stream') {
      const extension = file.name.split('.').pop()?.toLowerCase();
      
      const extensionMap: Record<string, string> = {
        // Images
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'bmp': 'image/bmp',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        
        // Documents
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'txt': 'text/plain',
        'rtf': 'application/rtf',
        
        // Archives
        'zip': 'application/zip',
        'rar': 'application/x-rar-compressed',
        '7z': 'application/x-7z-compressed',
        
        // Videos
        'mp4': 'video/mp4',
        'avi': 'video/x-msvideo',
        'mov': 'video/quicktime',
        'wmv': 'video/x-ms-wmv',
        'flv': 'video/x-flv',
        'webm': 'video/webm',
        
        // Audio
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        'flac': 'audio/flac',
        
        // Other
        'json': 'application/json',
        'xml': 'application/xml',
        'csv': 'text/csv'
      };
      
      contentType = extensionMap[extension || ''] || 'application/octet-stream';
    }
    
    console.log('📎 Content type detection:', {
      originalType: file.type,
      detectedType: contentType,
      fileName: file.name
    });
    
    return contentType;
  }

  /**
   * Request signed URL from the API
   */
  async getSignedUrl(key: string, contentType: string): Promise<string> {
    try {
      console.log('📎 Requesting signed URL for attachment:', { key, contentType });
      
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

      console.log('📎 Received signed URL for attachment upload');
      return response.data.url;
    } catch (error) {
      console.error('📎 Failed to get signed URL for attachment:', error);
      throw new Error(`Failed to get signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload file to S3 using signed URL
   */
  async uploadToS3(signedUrl: string, file: File, contentType: string): Promise<void> {
    try {
      console.log('📎 Uploading attachment to S3:', {
        fileName: file.name,
        fileSize: file.size,
        contentType
      });
      
      const response = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': contentType,
        },
      });

      if (!response.ok) {
        throw new Error(`S3 upload failed: ${response.status} ${response.statusText}`);
      }
      
      console.log('📎 Successfully uploaded attachment to S3');
    } catch (error) {
      console.error('📎 Failed to upload attachment to S3:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get CloudFront URL for the uploaded file
   */
  getCloudFrontUrl(key: string): string {
    return `${this.CLOUDFRONT_DOMAIN}/${key}`;
  }

  /**
   * Complete file upload workflow for attachments
   */
  async uploadAttachment(file: File): Promise<AttachmentUploadResult> {
    try {
      console.log('📎 Starting attachment upload workflow:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
      
      // Step 1: Generate unique file name
      const uniqueFileName = this.generateUniqueFileName(file.name);
      console.log('📎 Generated unique filename:', uniqueFileName);
      
      // Step 2: Create S3 key
      const s3Key = this.createAttachmentKey(uniqueFileName);
      console.log('📎 Created S3 key:', s3Key);
      
      // Step 3: Normalize content type
      const contentType = this.normalizeContentType(file);
      console.log('📎 Normalized content type:', contentType);
      
      // Step 4: Request signed URL
      const signedUrl = await this.getSignedUrl(s3Key, contentType);
      console.log('📎 Received signed URL');
      
      // Step 5: Upload to S3
      await this.uploadToS3(signedUrl, file, contentType);
      console.log('📎 Upload completed successfully');
      
      // Step 6: Generate CloudFront URL
      const cloudFrontUrl = this.getCloudFrontUrl(s3Key);
      console.log('📎 Generated CloudFront URL:', cloudFrontUrl);
      
      return {
        key: s3Key,
        url: signedUrl,
        cloudFrontUrl,
        fileName: file.name,
        fileSize: file.size,
        contentType
      };
    } catch (error) {
      console.error('📎 Attachment upload workflow failed:', error);
      throw error;
    }
  }

  /**
   * Check if file is an image
   */
  isImage(file: File): boolean {
    return file.type.startsWith('image/') || 
           /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(file.name);
  }

  /**
   * Check if file is a document
   */
  isDocument(file: File): boolean {
    return file.type.includes('pdf') || 
           file.type.includes('document') || 
           file.type.includes('text') ||
           /\.(pdf|doc|docx|txt|rtf)$/i.test(file.name);
  }

  /**
   * Get file type category for display
   */
  getFileCategory(file: File): 'image' | 'document' | 'video' | 'audio' | 'archive' | 'other' {
    if (this.isImage(file)) return 'image';
    if (this.isDocument(file)) return 'document';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type.includes('zip') || file.type.includes('rar') || file.type.includes('7z')) return 'archive';
    return 'other';
  }
}

export const attachmentUploadService = new AttachmentUploadService();