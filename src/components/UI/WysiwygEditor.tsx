import React, { useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useTheme } from '../../context/ThemeContext';

interface WysiwygEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const WysiwygEditor: React.FC<WysiwygEditorProps> = ({
  value,
  onChange,
  placeholder = 'Enter text...',
  disabled = false,
  className = ''
}) => {
  const quillRef = useRef<ReactQuill>(null);
  const { theme } = useTheme();

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
    'link'
  ];

  useEffect(() => {
    const style = document.createElement('style');
    const isDark = theme === 'dark';

    style.textContent = `
      .ql-snow {
        border: 1px solid ${isDark ? '#475569' : '#d1d5db'} !important;
        border-radius: 0.5rem !important;
        background-color: ${isDark ? '#334155' : '#ffffff'} !important;
      }

      .ql-snow .ql-toolbar {
        border-bottom: 1px solid ${isDark ? '#475569' : '#d1d5db'} !important;
        background-color: ${isDark ? '#1e293b' : '#f9fafb'} !important;
        border-radius: 0.5rem 0.5rem 0 0 !important;
      }

      .ql-snow .ql-container {
        border: none !important;
        background-color: ${isDark ? '#334155' : '#ffffff'} !important;
        color: ${isDark ? '#f1f5f9' : '#1f2937'} !important;
        border-radius: 0 0 0.5rem 0.5rem !important;
      }

      .ql-snow:focus-within {
        outline: 2px solid #06b6d4 !important;
        outline-offset: 0px !important;
        border-radius: 0.5rem !important;
      }

      .ql-snow .ql-editor {
        color: ${isDark ? '#f1f5f9' : '#1f2937'} !important;
        min-height: 120px;
      }

      .ql-snow .ql-editor.ql-blank::before {
        color: ${isDark ? '#94a3b8' : '#6b7280'} !important;
        font-style: normal !important;
      }

      .ql-snow .ql-stroke {
        stroke: ${isDark ? '#94a3b8' : '#4b5563'} !important;
      }

      .ql-snow .ql-fill {
        fill: ${isDark ? '#94a3b8' : '#4b5563'} !important;
      }

      .ql-snow .ql-picker-label {
        color: ${isDark ? '#94a3b8' : '#4b5563'} !important;
      }

      .ql-snow .ql-picker-options {
        background-color: ${isDark ? '#1e293b' : '#ffffff'} !important;
        border: 1px solid ${isDark ? '#475569' : '#d1d5db'} !important;
      }

      .ql-snow .ql-picker-item {
        color: ${isDark ? '#f1f5f9' : '#1f2937'} !important;
      }

      .ql-snow .ql-picker-item:hover {
        background-color: ${isDark ? '#334155' : '#f3f4f6'} !important;
      }

      .ql-snow .ql-tooltip {
        background-color: ${isDark ? '#1e293b' : '#ffffff'} !important;
        border: 1px solid ${isDark ? '#475569' : '#d1d5db'} !important;
        color: ${isDark ? '#f1f5f9' : '#1f2937'} !important;
      }

      .ql-snow .ql-tooltip input {
        background-color: ${isDark ? '#334155' : '#ffffff'} !important;
        border: 1px solid ${isDark ? '#475569' : '#d1d5db'} !important;
        color: ${isDark ? '#f1f5f9' : '#1f2937'} !important;
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
  }, [theme]);

  return (
    <div className={className}>
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
    </div>
  );
};

export default WysiwygEditor;