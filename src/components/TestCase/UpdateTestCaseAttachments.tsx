import React from 'react';
import { CheckCircle, Loader } from 'lucide-react';
import FileUpload from '../UI/FileUpload';

interface UpdateTestCaseAttachmentsProps {
  existingAttachments: Array<{
    id: string;
    url: string;
    fileName: string;
  }>;
  attachments: File[];
  onFilesChange: (files: File[]) => void;
  onFileUploaded: (uploadData: { id: string; filename: string; url: string }) => void;
  loadingAttachments: boolean;
  isSubmitting: boolean;
}

const UpdateTestCaseAttachments: React.FC<UpdateTestCaseAttachmentsProps> = ({
  existingAttachments,
  attachments,
  onFilesChange,
  onFileUploaded,
  loadingAttachments,
  isSubmitting
}) => {
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Attachments
      </label>
      
      {/* Loading state for attachments */}
      {loadingAttachments && (
        <div className="flex items-center text-gray-400 text-sm mb-4">
          <Loader className="w-4 h-4 mr-2 animate-spin" />
          Loading existing attachments...
        </div>
      )}
      
      {/* Display existing attachments from GET response */}
      {!loadingAttachments && existingAttachments.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2">
            Existing Attachments ({existingAttachments.length})
          </h4>
          <div className="space-y-2">
            {existingAttachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-green-400">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm text-white">{attachment.fileName}</p>
                    <p className="text-xs text-green-400">Existing attachment</p>
                  </div>
                </div>
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 hover:text-green-300 text-sm underline"
                >
                  View
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* File upload for new attachments only */}
      <FileUpload
        files={attachments}
        onFilesChange={onFilesChange}
        onFileUploaded={onFileUploaded}
        disabled={isSubmitting}
        accept="*/*"
        multiple={true}
        maxSize={10}
      />
    </div>
  );
};

export default UpdateTestCaseAttachments;