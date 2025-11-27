import React, { useState } from 'react';
import { CheckCircle, Loader, X, Save } from 'lucide-react';
import FileUpload from '../UI/FileUpload';
import { attachmentsApiService } from '../../services/attachmentsApi';
import toast from 'react-hot-toast';

interface UpdateTestCaseAttachmentsProps {
  existingAttachments: Array<{
    id: string;
    url: string;
    fileName: string;
    name?: string;
  }>;
  attachments: File[];
  onFilesChange: (files: File[]) => void;
  onFileUploaded: (uploadData: { id: string; filename: string; url: string }) => void;
  onRemoveExistingAttachment: (attachmentId: string) => void;
  loadingAttachments: boolean;
  isSubmitting: boolean;
  fileNames?: Map<string, string>;
  onFileNameChange?: (fileId: string, name: string) => void;
  onAttachmentNameUpdated?: (attachmentId: string, newName: string) => void;
}

const UpdateTestCaseAttachments: React.FC<UpdateTestCaseAttachmentsProps> = ({
  existingAttachments,
  attachments,
  onFilesChange,
  onFileUploaded,
  onRemoveExistingAttachment,
  loadingAttachments,
  isSubmitting,
  fileNames,
  onFileNameChange,
  onAttachmentNameUpdated
}) => {
  const [editingAttachmentId, setEditingAttachmentId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [savingAttachmentId, setSavingAttachmentId] = useState<string | null>(null);

  const handleEditClick = (attachment: { id: string; name?: string; fileName: string }) => {
    setEditingAttachmentId(attachment.id);
    setEditingName(attachment.name || '');
  };

  const handleCancelEdit = () => {
    setEditingAttachmentId(null);
    setEditingName('');
  };

  const handleSaveEdit = async (attachmentId: string) => {
    if (!editingName.trim()) {
      toast.error('Attachment name cannot be empty');
      return;
    }

    setSavingAttachmentId(attachmentId);
    try {
      await attachmentsApiService.updateAttachment(attachmentId, editingName.trim());
      toast.success('Attachment name updated successfully');

      if (onAttachmentNameUpdated) {
        onAttachmentNameUpdated(attachmentId, editingName.trim());
      }

      setEditingAttachmentId(null);
      setEditingName('');
    } catch (error) {
      console.error('Failed to update attachment name:', error);
      toast.error('Failed to update attachment name');
    } finally {
      setSavingAttachmentId(null);
    }
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-slate-600 dark:text-gray-300 mb-2">
        Attachments
      </label>
      
      {/* Loading state for attachments */}
      {loadingAttachments && (
        <div className="flex items-center text-slate-500 dark:text-gray-400 text-sm mb-4">
          <Loader className="w-4 h-4 mr-2 animate-spin" />
          Loading existing attachments...
        </div>
      )}
      
      {/* Display existing attachments from GET response */}
      {!loadingAttachments && existingAttachments.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-500 dark:text-gray-400 mb-2">
            Existing Attachments ({existingAttachments.length})
          </h4>
          <div className="space-y-2">
            {existingAttachments.map((attachment) => (
              <div
                key={attachment.id}
                className="p-3 bg-green-50 dark:bg-green-500/10 border border-green-300 dark:border-green-500/30 rounded-lg space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="text-green-600 dark:text-green-400">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900 dark:text-white truncate">{attachment.name || attachment.fileName}</p>
                      <p className="text-xs text-green-600 dark:text-green-400">Existing attachment</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 text-sm underline"
                    >
                      View
                    </a>
                    <button
                      type="button"
                      onClick={() => onRemoveExistingAttachment(attachment.id)}
                      disabled={isSubmitting || savingAttachmentId === attachment.id}
                      className="p-1.5 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-500/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Remove attachment"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {editingAttachmentId === attachment.id ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      placeholder="Enter attachment name"
                      className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400"
                      disabled={savingAttachmentId === attachment.id}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(attachment.id)}
                      disabled={savingAttachmentId === attachment.id}
                      className="px-3 py-2 bg-cyan-500 text-white rounded-lg text-sm hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                    >
                      {savingAttachmentId === attachment.id ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Save</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={savingAttachmentId === attachment.id}
                      className="px-3 py-2 bg-slate-300 dark:bg-slate-600 text-slate-900 dark:text-white rounded-lg text-sm hover:bg-slate-400 dark:hover:bg-slate-500 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleEditClick(attachment)}
                    disabled={isSubmitting || savingAttachmentId !== null}
                    className="text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 underline disabled:opacity-50"
                  >
                    Edit name
                  </button>
                )}
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
        fileNames={fileNames}
        onFileNameChange={onFileNameChange}
      />
    </div>
  );
};

export default UpdateTestCaseAttachments;