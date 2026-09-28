import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  FolderSync,
  LogOut,
  Key,
  Lock,
  HardDrive,
  FolderOpen,
} from 'lucide-react';
import { GoogleDriveConfig } from '../types';
import {
  getStoredGoogleDriveConfig,
  saveGoogleDriveConfig,
  clearGoogleDriveConfig,
  googleSignIn,
  logout,
  getAccessToken,
  testGoogleDriveConnection,
} from '../services/googleDrive';

interface GoogleDriveModalProps {
  onClose: () => void;
  onConfigUpdated: () => void;
  onSyncWithDrive?: () => Promise<void>;
  isSyncing?: boolean;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  onClose,
  onConfigUpdated,
  onSyncWithDrive,
  isSyncing = false,
}) => {
  const currentConfig: GoogleDriveConfig = getStoredGoogleDriveConfig();

  const [clientId, setClientId] = useState(currentConfig.clientId || '');
  const [clientSecret, setClientSecret] = useState(currentConfig.clientSecret || '');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [savedNotification, setSavedNotification] = useState(false);

  useEffect(() => {
    // If already connected with an active token, run a silent probe or display status
    getAccessToken().then((token) => {
      if (token && currentConfig.isConnected) {
        testGoogleDriveConnection(token).then((res) => {
          if (res.success) {
            setTestResult(res);
          }
        });
      }
    });
  }, []);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setTestResult(null);
    try {
      const res = await googleSignIn();
      if (res?.user) {
        // Probe drive
        const testRes = await testGoogleDriveConnection(res.accessToken);
        setTestResult(testRes);
        onConfigUpdated();
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setTestResult({
        success: false,
        message: err?.message || 'Failed to authenticate with Google Drive.',
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const token = await getAccessToken();
      const res = await testGoogleDriveConnection(token || undefined);
      setTestResult(res);
      if (res.success) {
        onConfigUpdated();
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Connection test to Google Drive API failed.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveCredentials = () => {
    saveGoogleDriveConfig(clientId, clientSecret);
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 2500);
    onConfigUpdated();
  };

  const handleSignOut = async () => {
    await logout();
    setTestResult(null);
    onConfigUpdated();
  };

  const handleClearAll = () => {
    clearGoogleDriveConfig();
    setClientId('');
    setClientSecret('');
    setTestResult(null);
    onConfigUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6 my-8 text-neutral-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              {/* Google Drive Logo SVG */}
              <svg className="w-6 h-6" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
                <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                Google Drive Storage & OAuth 2.0
                {currentConfig.isConnected && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Connected
                  </span>
                )}
              </h2>
              <p className="text-xs text-neutral-400">
                Store, upload, and read PDF study documents directly in your Google Drive
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Account Authentication Card */}
        <div className="mt-5 p-4 rounded-xl bg-neutral-950/70 border border-neutral-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {currentConfig.userPhoto ? (
                <img
                  src={currentConfig.userPhoto}
                  alt={currentConfig.userName || 'Google Account'}
                  className="w-12 h-12 rounded-full border border-neutral-700"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <HardDrive className="w-6 h-6" />
                </div>
              )}
              <div>
                <div className="text-sm font-semibold flex items-center gap-2">
                  {currentConfig.userName || (currentConfig.isConnected ? 'Google Account' : 'Not Signed In')}
                  {currentConfig.isConnected && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </div>
                <div className="text-xs text-neutral-400">
                  {currentConfig.userEmail || 'Sign in with your Google account to access your personal Google Drive storage.'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentConfig.isConnected ? (
                <button
                  onClick={handleSignOut}
                  className="px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              ) : (
                /* Official Google Sign-In Button */
                <button
                  onClick={handleSignIn}
                  disabled={isSigningIn}
                  className="px-4 py-2 text-xs font-semibold text-neutral-900 bg-white hover:bg-neutral-100 rounded-xl transition-all shadow-md flex items-center gap-2.5 active:scale-95 disabled:opacity-50"
                >
                  {isSigningIn ? (
                    <Loader2 className="w-4 h-4 animate-spin text-neutral-900" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                    </svg>
                  )}
                  {isSigningIn ? 'Signing In...' : 'Sign in with Google'}
                </button>
              )}
            </div>
          </div>

          {currentConfig.isConnected && (
            <div className="mt-3 pt-3 border-t border-neutral-800/80 flex flex-wrap items-center justify-between text-xs text-neutral-400 gap-2">
              <div className="flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Drive Target:</span>
                <span className="text-neutral-200 font-mono">AcademiaVault - Study Materials</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <HardDrive className="w-3 h-3" />}
                  Verify Quota & Drive
                </button>
                {onSyncWithDrive && (
                  <button
                    onClick={onSyncWithDrive}
                    disabled={isSyncing}
                    className="text-xs text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    {isSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <FolderSync className="w-3 h-3" />}
                    Sync Files
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* OAuth Credentials Configuration Form */}
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400" />
              Google Drive OAuth Credentials
            </h3>
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              {showGuide ? 'Hide Setup Guide' : 'How to get OAuth Credentials?'}
            </button>
          </div>

          {/* VITE_GOOGLE_CLIENT_ID */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Google Client ID (<code className="text-amber-400">VITE_GOOGLE_CLIENT_ID</code>)
            </label>
            <div className="relative">
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="e.g. 1234567890-abcdefg.apps.googleusercontent.com"
                className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm font-mono text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500/60"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(clientId);
                  setCopiedKey(true);
                  setTimeout(() => setCopiedKey(false), 2000);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
                title="Copy Client ID"
              >
                {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-neutral-400">
              Web Client ID from Google Cloud Console &gt; APIs &amp; Services &gt; Credentials.
            </p>
          </div>

          {/* VITE_GOOGLE_CLIENT_SECRET */}
          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1">
              Google Client Secret (<code className="text-amber-400">VITE_GOOGLE_CLIENT_SECRET</code>)
            </label>
            <div className="relative">
              <input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="e.g. GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-sm font-mono text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-amber-500/60"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-neutral-500">
                <Lock className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-1 text-[11px] text-neutral-400">
              Client secret associated with your Web Application OAuth Client.
            </p>
          </div>
        </div>

        {/* Setup Guide Accordion */}
        {showGuide && (
          <div className="mt-4 p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 space-y-2.5 animate-in fade-in duration-150">
            <h4 className="font-semibold text-neutral-100 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              How to configure Google Drive OAuth in Google Cloud Console:
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-neutral-400 leading-relaxed">
              <li>
                Go to the{' '}
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 underline hover:text-blue-300"
                >
                  Google Cloud Console Credentials Page
                </a>
                .
              </li>
              <li>Ensure the <strong>Google Drive API</strong> is enabled in <em>APIs &amp; Services &gt; Library</em>.</li>
              <li>Under <strong>OAuth 2.0 Client IDs</strong>, create a new <strong>Web application</strong> credential.</li>
              <li>
                Add the current app URL (<code>{window.location.origin}</code>) to <strong>Authorized JavaScript origins</strong> and <strong>Authorized redirect URIs</strong>.
              </li>
              <li>Copy the <strong>Client ID</strong> and <strong>Client Secret</strong> into the fields above, then click <strong>Save Credentials</strong> and <strong>Sign in with Google</strong>.</li>
            </ol>
          </div>
        )}

        {/* Live Test / Diagnostic Results */}
        {testResult && (
          <div
            className={`mt-4 p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <p className="font-medium">{testResult.message}</p>
              {testResult.details && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1 text-[11px] text-neutral-300 font-mono">
                  {testResult.details.userEmail && <div>Account: {testResult.details.userEmail}</div>}
                  {testResult.details.storageUsed && <div>Drive Used: {testResult.details.storageUsed}</div>}
                  {testResult.details.storageLimit && <div>Drive Quota: {testResult.details.storageLimit}</div>}
                  {testResult.details.folderName && <div>Sync Folder: {testResult.details.folderName}</div>}
                </div>
              )}
            </div>
          </div>
        )}

        {savedNotification && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            Credentials saved successfully to environment configuration.
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-6 pt-4 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs text-neutral-500 hover:text-rose-400 transition-colors"
          >
            Reset Credentials
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveCredentials}
              className="px-4 py-2 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-xl transition-colors"
            >
              Save Credentials
            </button>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {testing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Test Drive Connection
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-900 bg-white hover:bg-neutral-200 rounded-xl transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
