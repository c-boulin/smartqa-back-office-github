import React, { useRef, useState } from 'react';
import { Upload, Loader } from 'lucide-react';
import { fileUploadService, UploadFieldType } from '../../services/fileUploadService';
import toast from 'react-hot-toast';

interface FileUploadButtonProps {
  onFileUploaded: (html: string) => void;
  fieldName: UploadFieldType;
  disabled?: boolean;
  accept?: string;
  className?: string;
}

const FileUploadButton: React.FC<FileUploadButtonProps> = ({
  onFileUploaded,
  fieldName,
  disabled = false,
  accept = 'image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  className = ''
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input value to allow selecting the same file again
    event.target.value = '';

    try {
      setIsUploading(true);
      
      // Show upload progress toast
      const uploadToast = toast.loading(`Uploading ${file.name}...`);
      
      // Upload file using the service
      const result = await fileUploadService.uploadFile(file, fieldName);
      
      // Generate HTML for the uploaded file
      const fileHtml = fileUploadService.generateFileHtml(file, result.cloudFrontUrl);
      
      // Insert the HTML into the editor
      onFileUploaded(fileHtml);
      
      // Success feedback
      toast.success(`${file.name} uploaded successfully`, { id: uploadToast });
      
    } catch (error) {
      console.error('File upload failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      toast.error(`Upload failed: ${errorMessage}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClick = () => {
    if (!disabled && !isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isUploading}
        className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
          disabled || isUploading
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : 'bg-slate-700 text-gray-300 hover:bg-slate-600 hover:text-cyan-400 border border-slate-600 hover:border-cyan-500'
        } ${className}`}
        title={isUploading ? 'Uploading...' : 'Upload file'}
      >
        {isUploading ? (
          <Loader className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Upload className="w-4 h-4 mr-2" />
        )}
        {isUploading ? 'Uploading...' : 'Upload File'}
      </button>
      
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />
    </>
  );
};

export default FileUploadButton;