import { apiService } from './api';

export interface CreateAttachmentRequest {
  data: {
    type: "Attachment";
    attributes: {
      url: string;
      name?: string;
    };
    relationships: {
      user: {
        data: {
          type: "User";
          id: string;
        };
      };
    };
  };
}

export interface CreateAttachmentResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      id: number;
      url: string;
      createdAt: string;
      updatedAt: string;
    };
  };
}

export interface UpdateAttachmentRequest {
  data: {
    type: "Attachment";
    id: string;
    attributes: {
      name: string;
    };
  };
}

export interface UpdateAttachmentResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      id: number;
      url: string;
      name: string;
      createdAt: string;
      updatedAt: string;
    };
  };
}

class AttachmentsApiService {
  async createAttachment(attachmentData: {
    url: string;
    userId: string;
    name?: string;
  }): Promise<CreateAttachmentResponse> {
    const requestBody: CreateAttachmentRequest = {
      data: {
        type: "Attachment",
        attributes: {
          url: attachmentData.url,
          ...(attachmentData.name && { name: attachmentData.name })
        },
        relationships: {
          user: {
            data: {
              type: "User",
              id: `/api/users/${attachmentData.userId}`
            }
          }
        }
      }
    };

    const response = await apiService.authenticatedRequest('/attachments', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    if (!response) {
      throw new Error('No response received from server');
    }

    return response;
  }

  async updateAttachment(attachmentId: string, name: string): Promise<UpdateAttachmentResponse> {
    const requestBody: UpdateAttachmentRequest = {
      data: {
        type: "Attachment",
        id: `/api/attachments/${attachmentId}`,
        attributes: {
          name: name
        }
      }
    };

    const response = await apiService.authenticatedRequest(`/attachments/${attachmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(requestBody),
    });

    if (!response) {
      throw new Error('No response received from server');
    }

    return response;
  }
}

export const attachmentsApiService = new AttachmentsApiService();