import React, { useRef, useState } from 'react';
import { Upload, Loader, Trash2 } from 'lucide-react';
import { imageProcessingService, UploadFieldType } from '../../services/imageProcessingService';
import toast from 'react-hot-toast';

interface AutoImageUploadButtonProps {
  onFileUploaded: (html: string) => void;
  onFileDeleted?: () => void;
  fieldName: UploadFieldType;
  disabled?: boolean;
  accept?: string;
  className?: string;
  autoProcess?: boolean;
}

const AutoImageUploadButton: React.FC<AutoImageUploadButtonProps> = ({
  onFileUploaded,
  onFileDeleted,
  fieldName,
  disabled = false,
  accept = 'image/*',
  className = '',
  autoProcess = true
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input value to allow selecting the same file again
    event.target.value = '';

    if (!autoProcess) {
      // If auto-process is disabled, just pass the file to parent
      return;
    }


    try {
      setIsUploading(true);

      // Process the image

      const result = await imageProcessingService.processImageOnUpload(file, fieldName);

      const imageHtml = imageProcessingService.generateImageHtml(result, file.name, false); // Don't wrap in paragraph

      // Insert the HTML into the editor

      onFileUploaded(imageHtml);
      
      // Success feedback
      toast.success(`${file.name} uploaded successfully`);
      
    } catch (error) {
      console.error('🖼️ Image processing failed:', error);
      console.error('🖼️ AutoImageUploadButton error details:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        fieldName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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

  const handleDelete = () => {
    if (onFileDeleted) {
      onFileDeleted();
      toast.success('Images removed from content');
    }
  };

  return (
    <div className="flex items-center space-x-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isUploading}
        className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded transition-colors ${
          disabled || isUploading
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : 'bg-slate-600 text-gray-300 hover:bg-slate-500 hover:text-cyan-400 border border-slate-500 hover:border-cyan-400'
        } ${className}`}
        title={isUploading ? 'Uploading...' : 'Upload image'}
      >
        {isUploading ? (
          <Loader className="w-3 h-3 mr-1 animate-spin" />
        ) : (
          <Upload className="w-3 h-3 mr-1" />
        )}
        {isUploading ? 'Uploading...' : 'Image'}
      </button>

      {onFileDeleted && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={disabled || isUploading}
          className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded transition-colors ${
            disabled || isUploading
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-red-600 text-red-300 hover:bg-red-500 hover:text-white border border-red-500 hover:border-red-400'
          }`}
          title="Remove images from content"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />
    </div>
  );
};

export default AutoImageUploadButton;