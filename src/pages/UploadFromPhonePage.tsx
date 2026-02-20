import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { uploadFromPhoneService } from '../services/uploadFromPhoneService';

const UploadFromPhonePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('t');
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [uploadedCount, setUploadedCount] = useState(0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setStatus('uploading');
    setMessage('');

    try {
      await uploadFromPhoneService.uploadRelay(token, file);
      setUploadedCount(prev => prev + 1);
      setStatus('success');
      setMessage('Image sent! You can send another or close this page.');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Upload failed');
    }

    e.target.value = '';
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-4">
        <div className="text-center text-slate-700 dark:text-slate-300">
          <p className="font-medium">Invalid or missing link</p>
          <p className="text-sm mt-2">Use the QR code or link from the form to upload an image.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 text-center">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          Upload to form
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
          Choose or take a photo to add to the form.
        </p>

        {uploadedCount > 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            {uploadedCount} {uploadedCount === 1 ? 'image' : 'images'} sent
          </p>
        )}

        <label className="inline-flex items-center justify-center px-4 py-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium cursor-pointer transition-colors">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={status === 'uploading'}
            className="sr-only"
          />
          {status === 'uploading' ? 'Uploading…' : uploadedCount > 0 ? 'Send another image' : 'Choose image'}
        </label>

        {status === 'success' && (
          <p className="mt-4 text-sm text-green-600 dark:text-green-400">{message}</p>
        )}
        {status === 'error' && (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">{message}</p>
        )}
      </div>
    </div>
  );
};

export default UploadFromPhonePage;
