import { apiService } from './api';

export type ReportFormat = 'pdf' | 'csv';

interface EmailAttachment {
  name: string;
  content: string;
  mimeType: string;
}

interface EmailReportPayload {
  recipients: string[];
  subject: string;
  message?: string;
  reportType: string;
  attachments: EmailAttachment[];
}

class ReportEmailService {
  async convertBlobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert blob to base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  getMimeType(format: ReportFormat): string {
    return format === 'pdf' ? 'application/pdf' : 'text/csv';
  }

  getFileExtension(format: ReportFormat): string {
    return format === 'pdf' ? '.pdf' : '.csv';
  }

  generateReportFileName(reportTitle: string, format: ReportFormat): string {
    // Sanitize the report title to be filename-safe
    const sanitizedTitle = reportTitle
      .replace(/[^a-zA-Z0-9\s\-_]/g, '') // Remove special characters except spaces, hyphens, underscores
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .trim();

    const extension = this.getFileExtension(format);
    return `${sanitizedTitle}${extension}`;
  }

  async sendReportEmail(
    recipients: string[],
    reportTitle: string,
    reportType: string,
    projectName: string,
    message: string,
    reportContent: Blob,
    format: ReportFormat
  ): Promise<void> {
    try {
      const base64Content = await this.convertBlobToBase64(reportContent);
      const mimeType = this.getMimeType(format);
      const fileName = this.generateReportFileName(reportTitle, format);

      const payload: EmailReportPayload = {
        recipients,
        subject: 'Test Report from SmartQA',
        reportType,
        attachments: [
          {
            name: fileName,
            content: base64Content,
            mimeType
          }
        ]
      };

      // Only include message if it's not empty
      if (message.trim()) {
        payload.message = message;
      }

      await apiService.authenticatedRequest('/reports/email', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

    } catch (error) {
      console.error('❌ Failed to send report email:', error);
      throw error;
    }
  }
}

export const reportEmailService = new ReportEmailService();
