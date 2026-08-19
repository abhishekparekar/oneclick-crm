import React, { useRef, useState } from 'react';
import { api } from '../../utils/leads/api';
import { Upload, Loader2, Link } from 'lucide-react';
import { useToast } from './Toast';

interface MediaUrlUploaderProps {
  value: string;
  onChange: (url: string) => void;
  headerType?: string; // 'IMAGE' | 'VIDEO' | 'DOCUMENT'
  borderColor?: string;
  labelColor?: string;
  placeholder?: string;
}

export default function MediaUrlUploader({
  value,
  onChange,
  headerType = 'IMAGE',
  borderColor = '#E2E8F0',
  labelColor = '#0E6B50',
  placeholder = 'https://...',
}: MediaUrlUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { error, success } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Optional validations
    if (headerType === 'IMAGE' && !file.type.startsWith('image/')) {
      error('Invalid File Type', 'Please upload an image file.');
      return;
    }
    if (headerType === 'VIDEO' && !file.type.startsWith('video/')) {
      error('Invalid File Type', 'Please upload a video file.');
      return;
    }


    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          const res = await api.post('/api/upload', {
            filename: file.name,
            base64: base64String,
          });
          onChange(res.url);
          success('Upload successful');
        } catch (err: any) {
          error('Upload failed', err.message || 'Failed to upload file to server');
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      error('Upload failed', err.message || 'Failed to read file');
      setUploading(false);
    }
  };

  const triggerUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const acceptTypes = headerType === 'IMAGE'
    ? 'image/*'
    : headerType === 'VIDEO'
    ? 'video/*'
    : '*/*';

  const theme = headerType === 'IMAGE' 
    ? { inputBg: '#EFF6FF', btnBg: '#DBEAFE', hoverBg: '#BFDBFE', text: '#1E40AF' }
    : headerType === 'VIDEO'
    ? { inputBg: '#FFF7ED', btnBg: '#FFEDD5', hoverBg: '#FED7AA', text: '#9A3412' }
    : { inputBg: '#F0FDF4', btnBg: '#DCFCE7', hoverBg: '#BBF7D0', text: '#166534' };

  return (
    <div style={{ display: 'flex', gap: 6, width: '100%' }}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={acceptTypes}
        style={{ display: 'none' }}
      />
      <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
        <input
          type="text"
          required
          style={{
            width: '100%',
            height: 34,
            borderRadius: 7,
            border: `1px solid ${borderColor}`,
            background: theme.inputBg,
            padding: '0 32px 0 10px',
            fontFamily: 'monospace',
            fontSize: '11.5px',
            color: '#1E293B',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'all 120ms ease',
          }}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <div style={{
          position: 'absolute',
          right: 10,
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex',
          alignItems: 'center',
          color: theme.text,
          opacity: 0.7,
        }}>
          <Link style={{ width: 12, height: 12 }} />
        </div>
      </div>
      <button
        type="button"
        onClick={triggerUpload}
        disabled={uploading}
        style={{
          height: 34,
          padding: '0 14px',
          borderRadius: 7,
          border: `1px solid ${borderColor}`,
          background: theme.btnBg,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          fontSize: 12,
          fontWeight: 700,
          color: theme.text,
          transition: 'all 120ms ease',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = theme.hoverBg;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = theme.btnBg;
        }}
      >
        {uploading ? (
          <Loader2 className="animate-spin" style={{ width: 13, height: 13 }} />
        ) : (
          <Upload style={{ width: 13, height: 13 }} />
        )}
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
    </div>
  );
}

