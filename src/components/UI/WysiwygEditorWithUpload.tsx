import React, { useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import FileUploadButton from './FileUploadButton';
import { UploadFieldType } from '../../services/fileUploadService';

interface WysiwygEditorWithUploadProps {
  value: string;
  onChange: (value: string) => void;
  fieldName: UploadFieldType;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const WysiwygEditorWithUpload: React.FC<WysiwygEditorWithUploadProps> = ({
  value,
  onChange,
  fieldName,
  placeholder = 'Enter text...',
  disabled = false,
  className = ''
}) => {
  const quillRef = useRef<ReactQuill>(null);

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      ['link'],
      ['clean']
    ],
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent',
    'link',
    'image'
  ];

  const handleFileUploaded = (fileHtml: string) => {
    if (quillRef.current) {
      const quill = quillRef.current.getEditor();
      const range = quill.getSelection();
      const index = range ? range.index : quill.getLength();
      
      // Insert the file HTML at cursor position or end
      quill.clipboard.dangerouslyPasteHTML(index, fileHtml);
      
      // Update the value
      const newContent = quill.root.innerHTML;
      onChange(newContent);
    }
  };

  // Custom styles for dark theme
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .ql-snow {
        border: 1px solid #475569 !important;
        border-radius: 0.5rem !important;
        background-color: #334155 !important;
      }
      
      .ql-snow .ql-toolbar {
        border-bottom: 1px solid #475569 !important;
        background-color: #1e293b !important;
        border-radius: 0.5rem 0.5rem 0 0 !important;
      }
      
      .ql-snow .ql-container {
        border: none !important;
        background-color: #334155 !important;
        color: #f1f5f9 !important;
        border-radius: 0 0 0.5rem 0.5rem !important;
      }
      
      .ql-snow:focus-within {
        outline: 2px solid #06b6d4 !important;
        outline-offset: 0px !important;
        border-radius: 0.5rem !important;
      }
      
      .ql-snow .ql-editor {
        color: #f1f5f9 !important;
        min-height: 120px;
      }
      
      .ql-snow .ql-editor.ql-blank::before {
        color: #94a3b8 !important;
        font-style: normal !important;
      }
      
      .ql-snow .ql-stroke {
        stroke: #94a3b8 !important;
      }
      
      .ql-snow .ql-fill {
        fill: #94a3b8 !important;
      }
      
      .ql-snow .ql-picker-label {
        color: #94a3b8 !important;
      }
      
      .ql-snow .ql-picker-options {
        background-color: #1e293b !important;
        border: 1px solid #475569 !important;
      }
      
      .ql-snow .ql-picker-item {
        color: #f1f5f9 !important;
      }
      
      .ql-snow .ql-picker-item:hover {
        background-color: #334155 !important;
      }
      
      .ql-snow .ql-tooltip {
        background-color: #1e293b !important;
        border: 1px solid #475569 !important;
        color: #f1f5f9 !important;
      }
      
      .ql-snow .ql-tooltip input {
        background-color: #334155 !important;
        border: 1px solid #475569 !important;
        color: #f1f5f9 !important;
      }
      
      .ql-snow .ql-active {
        color: #06b6d4 !important;
      }
      
      .ql-snow .ql-active .ql-stroke {
        stroke: #06b6d4 !important;
      }
      
      .ql-snow .ql-active .ql-fill {
        fill: #06b6d4 !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className={className}>
      <div className="relative">
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          readOnly={disabled}
        />
        
        {/* File Upload Button - positioned in top right of editor */}
        <div className="absolute top-2 right-2 z-10">
          <FileUploadButton
            onFileUploaded={handleFileUploaded}
            fieldName={fieldName}
            disabled={disabled}
            className="text-xs px-2 py-1"
          />
        </div>
      </div>
    </div>
  );
};

export default WysiwygEditorWithUpload;