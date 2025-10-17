import { apiService } from './api';
import { SignedUrlResponse } from './fileUploadService';

export interface ImageProcessingResult {
  processedUrl: string;
  key: string;
  originalFile: File;
}

export type UploadFieldType = 'description' | 'precondition' | 'step' | 'expected_result';

class ImageProcessingService {
  private readonly cloudFrontBaseUrl: string;

  constructor() {
    const domain = import.meta.env.VITE_ASSETS_CLOUDFRONT_DOMAIN;
    if (!domain || typeof domain !== 'string' || domain.trim() === '') {
      console.error('VITE_ASSETS_CLOUDFRONT_DOMAIN is not defined or is empty. Please set it in your environment.');
      throw new Error('VITE_ASSETS_CLOUDFRONT_DOMAIN is not configured. Please check your environment variables.');
    }
    this.cloudFrontBaseUrl = domain;
  }

  /**
   * Process an image file when uploaded
   */
  async processImageOnUpload(file: File, fieldName: UploadFieldType): Promise<ImageProcessingResult> {
    try {
      console.log('🖼️ Starting image processing for field:', fieldName);
      console.log('🖼️ File details:', { name: file.name, size: file.size, type: file.type });
      
      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const uniqueName = `${timestamp}_${randomString}.${fileExtension}`;
      const key = `${fieldName}/${uniqueName}`;

      console.log('🖼️ Generated key:', key);

      // Get signed URL for upload
      console.log('🖼️ Requesting signed URL from API...');
      const response = await apiService.authenticatedRequest<SignedUrlResponse>(
        `/s3/signed-url?key=${encodeURIComponent(key)}&content_type=${encodeURIComponent(file.type)}`,
        { method: 'GET' }
      );
      
      if (!response || !response.data || !response.data.url) {
        console.error('🖼️ Invalid signed URL response:', response);
        throw new Error('Invalid signed URL response from server');
      }
      
      const signedUrl = response.data.url;
      console.log('🖼️ Got signed URL for upload');
      console.log('🖼️ Signed URL:', signedUrl);

      // Upload to S3
      console.log('🖼️ Uploading to S3...');
      const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        console.error('🖼️ S3 upload failed:', uploadResponse.status, uploadResponse.statusText);
        throw new Error(`Failed to upload to S3: ${uploadResponse.statusText}`);
      }

      console.log('🖼️ Successfully uploaded to S3');

      // Generate CloudFront URL
      const processedUrl = `${this.cloudFrontBaseUrl}/${key}`;
      console.log('🖼️ Generated CloudFront URL:', processedUrl);

      return {
        processedUrl,
        key,
        originalFile: file
      };

    } catch (error) {
      console.error('🖼️ Image processing failed:', error);
      console.error('🖼️ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  /**
   * Generate HTML for displaying an image
   */
  generateImageHtml(result: ImageProcessingResult, alt: string = 'Uploaded image', wrapInParagraph: boolean = false): string {
    console.log('🖼️ Generating image HTML for URL:', result.processedUrl);
    
    const imageTag = `<img src="${result.processedUrl}" alt="${alt}" style="max-width: 300px; max-height: 200px; width: auto; height: auto; border-radius: 8px; margin: 8px; box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3); object-fit: contain; display: inline-block; vertical-align: top;" />`;
    const imageHtml = wrapInParagraph ? `<p>${imageTag}</p>` : imageTag;
    
    console.log('🖼️ Generated image HTML:', imageHtml);
    return imageHtml;
  }

  /**
   * Clean field content by removing image tags
   */
  cleanFieldContent(content: string): string {
    // Remove all img tags and their containing paragraphs
    return content
      .replace(/<p[^>]*>\s*<img[^>]*>\s*<\/p>/gi, '')
      .replace(/<img[^>]*>/gi, '')
      .trim();
  }

  /**
   * Extract image URLs from HTML content
   */
  extractImageUrls(content: string): string[] {
    const imgRegex = /<img[^>]+src="([^"]+)"/gi;
    const urls: string[] = [];
    let match;

    while ((match = imgRegex.exec(content)) !== null) {
      urls.push(match[1]);
    }

    return urls;
  }

  /**
   * Get S3 key from CloudFront URL
   */
  getKeyFromUrl(url: string): string | null {
    if (url.startsWith(this.cloudFrontBaseUrl)) {
      return url.replace(`${this.cloudFrontBaseUrl}/`, '');
    }
    return null;
  }
}

export const imageProcessingService = new ImageProcessingService();