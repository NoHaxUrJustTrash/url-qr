import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { FileUp } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (url: string) => void;
  onScanError: (error: string) => void;
}

export function QRScanner({ onScanSuccess, onScanError }: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scannerRef.current = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scannerRef.current.render(
      (decodedText) => {
        onScanSuccess(decodedText);
        if (scannerRef.current) {
          scannerRef.current.clear();
        }
      },
      (error) => {
        onScanError(error?.message || 'Scan failed');
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    };
  }, [onScanSuccess, onScanError]);

  const handleFile = async (file: File) => {
    try {
      const html5QrCode = new Html5Qrcode("qr-reader");
      const imageUrl = URL.createObjectURL(file);
      const decodedText = await html5QrCode.scanFile(file, true);
      URL.revokeObjectURL(imageUrl);
      await html5QrCode.clear();
      onScanSuccess(decodedText);
    } catch (err) {
      onScanError('Failed to scan QR code from image');
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      await handleFile(file);
    } else {
      onScanError('Please drop an image file');
    }
  };

  const handlePaste = async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          await handleFile(file);
          break;
        }
      }
    }
  };

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  return (
    <div className="relative">
      <div 
        id="qr-reader" 
        className="w-full max-w-md mx-auto"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      />
      <div 
        className={`absolute inset-0 flex items-center justify-center transition-opacity ${
          isDragging ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-purple-100 border-2 border-dashed border-purple-400 rounded-lg p-8 text-center">
          <FileUp className="mx-auto mb-2 text-purple-600" size={32} />
          <p className="text-purple-700">Drop image here to scan</p>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <div className="text-center mt-4 text-sm text-gray-600">
        <p>You can also paste an image (Ctrl/Cmd + V) to scan</p>
      </div>
    </div>
  );
}