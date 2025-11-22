"use client";

import { useState } from "react";
import QRCode from "react-qr-code";

interface KeyShareProps {
  myPublicKey: string | null;
  onKeyReceived: (publicKey: string) => void;
  isConnected: boolean;
}

export default function KeyShare({ myPublicKey, onKeyReceived, isConnected }: KeyShareProps) {
  const [showQR, setShowQR] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [inputKey, setInputKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [keyError, setKeyError] = useState("");

  const handleCopy = async () => {
    if (!myPublicKey) return;
    try {
      await navigator.clipboard.writeText(myPublicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleShare = async () => {
    if (!myPublicKey || typeof window === "undefined") return;
    try {
      // Create a shareable link with the public key as a query parameter
      const shareableLink = `${window.location.origin}${window.location.pathname}?key=${encodeURIComponent(myPublicKey)}`;
      await navigator.clipboard.writeText(shareableLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy shareable link:", error);
    }
  };

  const handleSubmitKey = () => {
    setKeyError("");
    const trimmedKey = inputKey.trim();
    if (!trimmedKey) {
      setKeyError("Please enter a public key");
      return;
    }

    // Basic validation - check if it looks like a base64 encoded key
    try {
      // Try to decode to see if it's valid base64
      atob(trimmedKey);
      onKeyReceived(trimmedKey);
      setInputKey("");
      setShowInput(false);
    } catch (error) {
      setKeyError("Invalid public key format. Please check and try again.");
    }
  };

  if (!myPublicKey) {
    return null;
  }

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-700/50 shadow-sm">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Share Your Public Key</span>
          </div>
          {isConnected && (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Connected
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Your Public Key Display */}
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
              Your Public Key
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={myPublicKey}
                className="flex-1 text-xs p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 font-mono text-gray-700 dark:text-gray-300"
              />
              <button
                onClick={handleCopy}
                className="px-4 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Share Options */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowQR(!showQR)}
              className="flex-1 px-4 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              {showQR ? "Hide QR Code" : "Show QR Code"}
            </button>
            <button
              onClick={handleShare}
              className="flex-1 px-4 py-2 text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Copy Shareable Link
            </button>
            <button
              onClick={() => {
                setShowInput(!showInput);
                setKeyError("");
                setInputKey("");
              }}
              className="flex-1 px-4 py-2 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {showInput ? "Cancel" : "Add Friend's Key"}
            </button>
          </div>

          {/* QR Code Display */}
          {showQR && (
            <div className="flex flex-col items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                Scan this QR code to share your public key
              </p>
              <div className="p-4 bg-white rounded-lg">
                <QRCode
                  value={myPublicKey}
                  size={200}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  viewBox="0 0 200 200"
                />
              </div>
              {typeof window !== "undefined" && (
                <p className="text-xs text-gray-500 dark:text-gray-500 text-center max-w-xs">
                  Or share the link: {window.location.origin}{window.location.pathname}?key={myPublicKey.substring(0, 20)}...
                </p>
              )}
            </div>
          )}

          {/* Input Friend's Key */}
          {showInput && (
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
                Enter Friend's Public Key
              </label>
              <div className="space-y-2">
                <textarea
                  value={inputKey}
                  onChange={(e) => {
                    setInputKey(e.target.value);
                    setKeyError("");
                  }}
                  placeholder="Paste the public key here..."
                  className="w-full text-xs p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 font-mono text-gray-700 dark:text-gray-300 resize-none"
                  rows={4}
                />
                {keyError && (
                  <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {keyError}
                  </p>
                )}
                <button
                  onClick={handleSubmitKey}
                  className="w-full px-4 py-2 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-sm"
                >
                  Connect
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

