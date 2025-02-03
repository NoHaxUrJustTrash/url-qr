import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Copy, ExternalLink, QrCode, Scan, History, RotateCcw, Link } from 'lucide-react';
import { QRScanner } from './components/QRScanner';
import type { UrlEntry } from './types';

function App() {
  const [url, setUrl] = useState('');
  const [urlHistory, setUrlHistory] = useState<UrlEntry[]>(() => {
    const saved = localStorage.getItem('urlHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const [showScanner, setShowScanner] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lastScannedUrl, setLastScannedUrl] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('urlHistory', JSON.stringify(urlHistory));
  }, [urlHistory]);

  // Handle redirects when the page loads
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/r/')) {
      const shortCode = path.split('/r/')[1];
      const savedHistory = localStorage.getItem('urlHistory');
      if (savedHistory) {
        const history = JSON.parse(savedHistory);
        const entry = history.find((e: UrlEntry) => e.shortUrl.endsWith(shortCode));
        if (entry) {
          // Update clicks and save back to localStorage
          const updatedHistory = history.map((e: UrlEntry) =>
            e.shortUrl === entry.shortUrl ? { ...e, clicks: e.clicks + 1 } : e
          );
          localStorage.setItem('urlHistory', JSON.stringify(updatedHistory));
          // Redirect to the original URL
          window.location.href = entry.originalUrl;
        }
      }
    }
  }, []);

  const generateShortUrl = async () => {
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    try {
      // Validate URL
      const urlObject = new URL(url);
      if (!urlObject.protocol.startsWith('http')) {
        throw new Error('Invalid URL: Must start with http:// or https://');
      }

      // Generate a short code
      const shortCode = Math.random().toString(36).substring(2, 8);
      // Create the full short URL using the current domain
      const baseUrl = `${window.location.protocol}//${window.location.host}`;
      const shortUrl = `${baseUrl}/r/${shortCode}`;
      
      const qrCode = await QRCode.toDataURL(url);
      
      const newEntry: UrlEntry = {
        originalUrl: url,
        shortUrl,
        createdAt: new Date(),
        clicks: 0,
        qrCode,
      };

      setUrlHistory((prev) => [newEntry, ...prev]);
      setUrl('');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid URL format');
    }
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  const handleUrlClick = (entry: UrlEntry) => {
    const updatedHistory = urlHistory.map((item) =>
      item.shortUrl === entry.shortUrl
        ? { ...item, clicks: item.clicks + 1 }
        : item
    );
    setUrlHistory(updatedHistory);
    window.open(entry.originalUrl, '_blank');
  };

  const handleScanSuccess = (scannedUrl: string) => {
    setLastScannedUrl(scannedUrl);
    setUrl(scannedUrl);
  };

  const clearHistory = () => {
    setUrlHistory([]);
    localStorage.removeItem('urlHistory');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-purple-800">
          URL Shortener & QR Code Generator
        </h1>

        <div className="bg-white rounded-lg shadow-xl p-6 mb-8">
          <div className="flex gap-4 mb-6">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter URL to shorten..."
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <button
              onClick={generateShortUrl}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <QrCode size={20} /> Generate
            </button>
            <button
              onClick={() => setShowScanner(!showScanner)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Scan size={20} /> {showScanner ? 'Hide Scanner' : 'Scan QR'}
            </button>
          </div>

          {error && (
            <p className="text-red-500 mb-4">{error}</p>
          )}

          {showScanner && (
            <>
              <div className="mb-6">
                <QRScanner
                  onScanSuccess={handleScanSuccess}
                  onScanError={setError}
                />
              </div>
              {lastScannedUrl && (
                <div className="bg-green-50 p-4 rounded-lg mb-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-green-800 flex items-center gap-2">
                        <Link size={16} /> Scanned URL
                      </h3>
                      <p className="text-green-700 break-all mt-1">{lastScannedUrl}</p>
                    </div>
                    <button
                      onClick={() => handleCopy(lastScannedUrl, 'scanned')}
                      className={`px-4 py-2 rounded ${
                        copiedId === 'scanned'
                          ? 'bg-green-600 text-white'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      } transition-colors flex items-center gap-2`}
                    >
                      <Copy size={16} />
                      {copiedId === 'scanned' ? 'Copied!' : 'Copy URL'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {urlHistory.length > 0 && (
            <div className="mt-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <History size={20} /> URL History
                </h2>
                <button
                  onClick={clearHistory}
                  className="text-red-500 hover:text-red-600 flex items-center gap-2"
                >
                  <RotateCcw size={16} /> Clear History
                </button>
              </div>
              <div className="space-y-4">
                {urlHistory.map((entry) => (
                  <div key={entry.shortUrl} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <p className="text-sm text-gray-500 mb-1">
                          {new Date(entry.createdAt).toLocaleString()}
                        </p>
                        <p className="font-medium mb-2 break-all">{entry.originalUrl}</p>
                        <p className="text-sm text-purple-600 mb-2 break-all font-mono">{entry.shortUrl}</p>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => handleCopy(entry.shortUrl, entry.shortUrl)}
                            className={`text-purple-600 hover:text-purple-700 flex items-center gap-1 ${
                              copiedId === entry.shortUrl ? 'bg-purple-100 px-2 py-1 rounded' : ''
                            }`}
                          >
                            <Copy size={16} />
                            {copiedId === entry.shortUrl ? 'Copied!' : 'Copy Short URL'}
                          </button>
                          <button
                            onClick={() => handleUrlClick(entry)}
                            className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            <ExternalLink size={16} /> Open ({entry.clicks} clicks)
                          </button>
                        </div>
                      </div>
                      <img
                        src={entry.qrCode}
                        alt="QR Code"
                        className="w-24 h-24"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;