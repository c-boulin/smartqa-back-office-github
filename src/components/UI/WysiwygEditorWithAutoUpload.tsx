import React, { useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
// import AutoImageUploadButton from './AutoImageUploadButton';
import { UploadFieldType } from '../../services/fileUploadService';
import { imageProcessingService } from '../../services/imageProcessingService';
import toast from 'react-hot-toast';
import { useTheme } from '../../context/ThemeContext';

interface WysiwygEditorWithAutoUploadProps {
  value: string;
  onChange: (value: string) => void;
  fieldName: UploadFieldType;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  autoProcessImages?: boolean;
  accept?: string;
}

const WysiwygEditorWithAutoUpload: React.FC<WysiwygEditorWithAutoUploadProps> = ({
  value,
  onChange,
  fieldName,
  placeholder = 'Enter text...',
  disabled = false,
  className = '',
  autoProcessImages = true,
  accept = 'image/*' // eslint-disable-line @typescript-eslint/no-unused-vars -- Prop definition with default value
}) => {
  const quillRef = useRef<ReactQuill>(null);
  const { theme } = useTheme();

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      ['link', 'image'],
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


      // Extract image src from HTML
      const srcMatch = fileHtml.match(/src="([^"]+)"/);
      const imageSrc = srcMatch ? srcMatch[1] : '';
      
      if (!imageSrc) {
        console.error('🖼️ No image src found in HTML');
        return;
      }

      const currentHTML = quill.root.innerHTML;
      const currentText = quill.getText().trim();
      const isEmptyEditor = currentText === '' || currentText === '\n';

      try {
        if (isEmptyEditor) {
          // Rule: Empty editor - insert image at the beginning

          quill.insertEmbed(0, 'image', imageSrc, 'user');
          quill.setSelection(1); // Position cursor after image
        } else {
          // Rule: Editor has content
          const hasImages = currentHTML.includes('<img');
          
          if (hasImages) {
            // Rule: Already has images - add new image right after the last image (side by side)

            const endIndex = quill.getLength() - 1;
            quill.insertEmbed(endIndex, 'image', imageSrc, 'user');
            quill.setSelection(endIndex + 1);
          } else {
            // Rule: Has text but no images - insert image below text (new paragraph)

            const endIndex = quill.getLength() - 1;
            quill.insertText(endIndex, '\n', 'user'); // Create new line
            quill.insertEmbed(endIndex + 1, 'image', imageSrc, 'user');
            quill.setSelection(endIndex + 2);
          }
        }


        // Force update the content
        setTimeout(() => {
          const updatedContent = quill.root.innerHTML;

          onChange(updatedContent);
        }, 100);
        
      } catch (error) {
        console.error('🖼️ Error during image insertion:', error);
        console.error('🖼️ Insertion error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          imageSrc,
          editorLength: quill.getLength()
        });
      }
    }
  };

  // const handleFileDeleted = () => {
  //   if (quillRef.current) {
  //     const quill = quillRef.current.getEditor();
  //     const currentContent = quill.root.innerHTML;
  //     
  //     // Clean the content by removing image tags
  //     const cleanedContent = imageProcessingService.cleanFieldContent(currentContent);
  //     
  //     // Update the editor content
  //     quill.root.innerHTML = cleanedContent;
  //     onChange(cleanedContent);
  //   }
  // };

  // Handle paste events for automatic image processing
  const handlePaste = async (event: ClipboardEvent) => {

    const items = event.clipboardData?.items;
    if (!items || disabled) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.type.indexOf('image') !== -1) {

        event.preventDefault();
        
        const file = item.getAsFile();
        if (file && autoProcessImages) {

          try {

            // Process the pasted image
            const result = await imageProcessingService.processImageOnUpload(file, fieldName);
            const imageHtml = imageProcessingService.generateImageHtml(result, 'Pasted image');
            
            // Insert at current cursor position
            handleFileUploaded(imageHtml);
            
          } catch (error) {
            console.error('Failed to process pasted image:', error);
            toast.error('Failed to process pasted image');
          }
        }
        break;
      }
    }
  };

  // Add paste event listener
  useEffect(() => {
    const quillEditor = quillRef.current?.getEditor();
    if (quillEditor && autoProcessImages) {
      const editorElement = quillEditor.root;
      editorElement.addEventListener('paste', handlePaste);
      
      // Override the default image handler
      const toolbar = quillEditor.getModule('toolbar');
      if (toolbar) {
        toolbar.addHandler('image', () => {

          // Create a file input element
          const input = document.createElement('input');
          input.setAttribute('type', 'file');
          input.setAttribute('accept', 'image/*');
          input.style.display = 'none';
          
          input.onchange = async () => {
            const file = input.files?.[0];
            if (file) {

              try {

                const result = await imageProcessingService.processImageOnUpload(file, fieldName);
                const imageHtml = imageProcessingService.generateImageHtml(result, file.name);
                handleFileUploaded(imageHtml);
                toast.success(`${file.name} uploaded successfully`);
              } catch (error) {
                console.error('🖼️ Quill toolbar upload failed:', error);
                toast.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
              }
            }
            // Clean up
            document.body.removeChild(input);
          };
          
          // Add to DOM and trigger click
          document.body.appendChild(input);
          input.click();
        });
      }
      
      return () => {
        editorElement.removeEventListener('paste', handlePaste);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fieldName, handleFileUploaded, handlePaste are stable
  }, [autoProcessImages, disabled]);

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

      /* Improve toolbar button spacing */
      .ql-snow .ql-toolbar .ql-formats {
        margin-right: 12px !important;
      }

      .ql-snow .ql-toolbar .ql-formats:last-child {
        margin-right: 0 !important;
      }

      .ql-snow .ql-toolbar button {
        margin: 0 2px !important;
        padding: 5px 6px !important;
      }

      .ql-snow .ql-toolbar .ql-picker {
        margin: 0 2px !important;
      }

      /* Style for uploaded images */
      .ql-snow .ql-editor img {
        max-width: 300px !important;
        max-height: 200px !important;
        width: auto !important;
        height: auto !important;
        object-fit: contain !important;
        display: inline-block !important;
        vertical-align: top !important;
        border-radius: 4px !important;
        margin: 8px !important;
        box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3) !important;
        transition: transform 0.2s ease !important;
      }

      .ql-snow .ql-editor img:hover {
        transform: scale(1.02) !important;
        box-shadow: 0 6px 20px rgba(6, 182, 212, 0.4) !important;
      }

      /* Ensure paragraph containing images allows side-by-side layout */
      .ql-snow .ql-editor p {
        line-height: 1.6 !important;
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

export default WysiwygEditorWithAutoUpload;