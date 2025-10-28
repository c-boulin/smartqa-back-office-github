import React, { useRef, useState } from 'react';
import { Upload, X, File, Image, FileText, Loader } from 'lucide-react';
import { attachmentUploadService } from '../../services/attachmentUploadService';
import toast from 'react-hot-toast';

interface FileUploadResult {
  url?: string;
  id?: string;
  [key: string]: unknown; // Allow additional properties
}

interface FileUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  onFileUploaded?: (result: FileUploadResult) => void;
  disabled?: boolean;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in MB
  className?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  files,
  onFilesChange,
  onFileUploaded,
  disabled = false,
  accept = '*/*',
  multiple = true,
  maxSize = 10, // 10MB default
  className = ''
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [uploadedFiles, setUploadedFiles] = useState<Set<string>>(new Set());
  // const { state: authState } = useAuth();

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles = Array.from(selectedFiles).filter(file => {
      // Check file size
      if (file.size > maxSize * 1024 * 1024) {
        toast.error(`File ${file.name} is too large (max ${maxSize}MB)`);
        return false;
      }
      return true;
    });

    // Add files to the list first
    if (multiple) {
      onFilesChange([...files, ...newFiles]);
    } else {
      onFilesChange(newFiles.slice(0, 1));
    }

    // Upload each file automatically
    for (const file of newFiles) {
      uploadFile(file);
    }
  };

  const uploadFile = async (file: File) => {
    const fileId = `${file.name}-${file.size}-${file.lastModified}`;
    
    // Prevent duplicate uploads and callbacks for the same file
    if (uploadingFiles.has(fileId) || uploadedFiles.has(fileId)) {
      console.log('📎 File already uploaded or being uploaded, skipping:', file.name);
      return;
    }
    
    try {
      setUploadingFiles(prev => new Set([...prev, fileId]));
      
      console.log('📎 Starting S3 upload for:', file.name);
      
      // Upload to S3 only (no database record yet)
      const result = await attachmentUploadService.uploadAttachment(file);
      
      console.log('📎 S3 upload completed:', result);
      
      // Mark as uploaded to prevent duplicates
      setUploadedFiles(prev => new Set([...prev, fileId]));
      
      // Notify parent component of successful S3 upload (no database record yet)
      if (onFileUploaded) {
        console.log('📎 Notifying parent of S3 upload completion for:', file.name);
        onFileUploaded({
          file,
          key: result.key,
          cloudFrontUrl: result.cloudFrontUrl,
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type
        });
      } else {
        console.log('📎 No onFileUploaded callback provided');
      }
      
      toast.success(`${file.name} uploaded to storage`);
      
    } catch (error) {
      console.error('📎 Attachment upload failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      toast.error(`Upload failed for ${file.name}: ${errorMessage}`);
      
      // Remove the file from the list if upload failed
      onFilesChange(files.filter(f => f !== file));
    } finally {
      setUploadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
    }
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!disabled) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onFilesChange(newFiles);
  };

  const isFileUploading = (file: File): boolean => {
    const fileId = `${file.name}-${file.size}-${file.lastModified}`;
    return uploadingFiles.has(fileId);
  };
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="w-4 h-4" />;
    } else if (file.type.includes('text') || file.type.includes('document')) {
      return <FileText className="w-4 h-4" />;
    } else {
      return <File className="w-4 h-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={className}>
      {/* Upload Area */}
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${dragOver 
            ? 'border-cyan-400 bg-cyan-500/10' 
            : 'border-slate-600 hover:border-slate-500'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-300 mb-1">
          {dragOver ? 'Drop files here' : 'Click to upload or drag and drop'}
        </p>
        <p className="text-sm text-gray-500">
          Max file size: {maxSize}MB
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
        disabled={disabled}
      />

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-gray-300">
            Attached Files ({files.length})
          </h4>
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-slate-800 border border-slate-700 rounded-lg"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="text-gray-400">
                  {getFileIcon(file)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{file.name}</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                    {isFileUploading(file) && (
                      <div className="flex items-center text-xs text-cyan-400">
                        <Loader className="w-3 h-3 mr-1 animate-spin" />
                        Uploading...
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                  disabled={isFileUploading(file)}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;