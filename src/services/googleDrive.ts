import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { GoogleDriveConfig, StudyMaterial, Subject } from '../types';

// Desired Google Drive scopes configured via set_up_oauth
export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive',
];

export const CLIENT_ID = (
  firebaseConfig.oAuthClientId ||
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '581330002115-up82eah2jd9m0n1mqd7d073mg68e65ph.apps.googleusercontent.com'
).trim();

const STORAGE_CONFIG_KEY = 'acad_google_drive_config_v1';
const STORAGE_MATERIALS_KEY = 'acad_google_drive_materials_v1';
const FOLDER_NAME = 'AcademiaVault - Study Materials';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Provider with drive scopes
const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: 'select_account',
});

// In-memory token cache (Do NOT store access token in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

/**
 * Checks for a redirect sign-in result when returning from redirect flow.
 */
export const checkRedirectAuth = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        cachedAccessToken = credential.accessToken;
        saveGoogleDriveConfig(CLIENT_ID, undefined, {
          userEmail: result.user.email || undefined,
          userName: result.user.displayName || undefined,
          userPhoto: result.user.photoURL || undefined,
          isConnected: true,
        });
        return { user: result.user, accessToken: cachedAccessToken };
      }
    }
  } catch (err: any) {
    console.warn('Redirect auth check notice:', err);
  }
  return null;
};

/**
 * Initialize auth listener. Must be called on app load.
 */
export const initAuth = (
  onAuthSuccess?: (user: User | any, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Check for redirect result first
  checkRedirectAuth().then((redirectRes) => {
    if (redirectRes && onAuthSuccess) {
      onAuthSuccess(redirectRes.user, redirectRes.accessToken);
    }
  });

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const token = await getAccessToken();
      if (token) {
        if (onAuthSuccess) onAuthSuccess(user, token);
      } else {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      const cfg = getStoredGoogleDriveConfig();
      if (cfg.manualAccessToken) {
        if (onAuthSuccess) {
          onAuthSuccess(
            { email: cfg.userEmail || 'Drive User', displayName: cfg.userName || 'Drive Connected' } as any,
            cfg.manualAccessToken
          );
        }
      } else {
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

/**
 * Initiates the Google OAuth sign-in flow with Google Drive permissions using Firebase Auth.
 * If popups are blocked by mobile browsers, seamlessly falls back to redirect.
 */
export const googleSignIn = async (): Promise<{ user: User | any; accessToken: string } | null> => {
  try {
    isSigningIn = true;

    let result;
    try {
      result = await signInWithPopup(auth, provider);
    } catch (popupErr: any) {
      // If mobile browser blocks popup or cancels popup request, fall back to redirect
      if (
        popupErr?.code === 'auth/popup-blocked' ||
        popupErr?.code === 'auth/cancelled-popup-request'
      ) {
        console.info('Mobile browser blocked popup; switching to signInWithRedirect...');
        await signInWithRedirect(auth, provider);
        return null;
      }
      throw popupErr;
    }

    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve access token from Google sign-in.');
    }

    cachedAccessToken = credential.accessToken;

    saveGoogleDriveConfig(CLIENT_ID, undefined, {
      userEmail: result.user.email || undefined,
      userName: result.user.displayName || undefined,
      userPhoto: result.user.photoURL || undefined,
      isConnected: true,
    });

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Drive sign-in error:', error);
    if (error?.code === 'auth/unauthorized-domain') {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
      const customErr = new Error(
        `Domain authorization required: The domain "${hostname}" must be added to Authorized Domains in Firebase Authentication Console (Project: ${firebaseConfig.projectId}).`
      );
      (customErr as any).code = 'auth/unauthorized-domain';
      (customErr as any).hostname = hostname;
      (customErr as any).projectId = firebaseConfig.projectId;
      throw customErr;
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Returns the currently cached access token or stored manual access token.
 */
export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) return cachedAccessToken;
  const cfg = getStoredGoogleDriveConfig();
  if (cfg.manualAccessToken) return cfg.manualAccessToken;
  return null;
};

/**
 * Ensures an access token is available. If none cached in memory,
 * triggers sign-in to retrieve one.
 */
export async function ensureAccessToken(): Promise<string> {
  const token = await getAccessToken();
  if (token) return token;

  const result = await googleSignIn();
  if (result?.accessToken) {
    return result.accessToken;
  }
  throw new Error('Google Drive authorization required.');
}

/**
 * Signs the user out and clears token.
 */
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (err) {
    console.error('Sign-out error:', err);
  } finally {
    cachedAccessToken = null;
    saveGoogleDriveConfig(CLIENT_ID, undefined, {
      isConnected: false,
      userEmail: undefined,
      userName: undefined,
      userPhoto: undefined,
      manualAccessToken: undefined,
    });
  }
};

/**
 * Returns stored Google Drive credentials and status.
 */
export function getStoredGoogleDriveConfig(): GoogleDriveConfig {
  const envClientSecret = (import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '').trim();

  let isConnected = false;
  let userEmail: string | undefined;
  let userName: string | undefined;
  let userPhoto: string | undefined;
  let folderId: string | undefined;
  let manualAccessToken: string | undefined;
  let lastTestedAt: string | undefined;
  let lastSyncedAt: string | undefined;

  try {
    const raw = localStorage.getItem(STORAGE_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      isConnected = Boolean(parsed.isConnected);
      userEmail = parsed.userEmail;
      userName = parsed.userName;
      userPhoto = parsed.userPhoto;
      folderId = parsed.folderId;
      manualAccessToken = parsed.manualAccessToken;
      lastTestedAt = parsed.lastTestedAt;
      lastSyncedAt = parsed.lastSyncedAt;
    }
  } catch (err) {
    console.warn('Failed reading Google Drive config from localStorage:', err);
  }

  if (auth.currentUser) {
    userEmail = auth.currentUser.email || userEmail;
    userName = auth.currentUser.displayName || userName;
    userPhoto = auth.currentUser.photoURL || userPhoto;
    if (cachedAccessToken || manualAccessToken) {
      isConnected = true;
    }
  } else if (manualAccessToken) {
    isConnected = true;
  }

  return {
    clientId: CLIENT_ID,
    clientSecret: envClientSecret,
    manualAccessToken,
    isConnected,
    userEmail,
    userName,
    userPhoto,
    folderId,
    lastTestedAt,
    lastSyncedAt,
  };
}

/**
 * Saves Google Drive OAuth credentials and connection state.
 */
export function saveGoogleDriveConfig(
  clientId: string,
  clientSecret?: string,
  extra?: Partial<GoogleDriveConfig>
): GoogleDriveConfig {
  const current = getStoredGoogleDriveConfig();
  const updated: GoogleDriveConfig = {
    ...current,
    clientId: clientId.trim(),
    clientSecret: clientSecret ? clientSecret.trim() : current.clientSecret,
    ...extra,
    lastTestedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed storing Google Drive config:', err);
  }

  return updated;
}

/**
 * Clears stored Google Drive configuration and sign-in info.
 */
export function clearGoogleDriveConfig(): void {
  try {
    localStorage.removeItem(STORAGE_CONFIG_KEY);
  } catch (err) {
    console.error('Failed clearing Google Drive config:', err);
  }
}

/**
 * Locates or creates the dedicated "AcademiaVault - Study Materials" folder in the user's Google Drive.
 */
export async function getOrCreateAcademiaFolder(token: string): Promise<string> {
  const currentConfig = getStoredGoogleDriveConfig();
  if (currentConfig.folderId) {
    // Verify existing folder is accessible
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${currentConfig.folderId}?fields=id,name,trashed`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (!data.trashed) {
          return currentConfig.folderId;
        }
      }
    } catch {
      // Continue to search or create
    }
  }

  // Search for folder by name
  const query = `name = '${FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&spaces=drive`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      const folderId = searchData.files[0].id;
      saveGoogleDriveConfig(currentConfig.clientId, currentConfig.clientSecret, { folderId });
      return folderId;
    }
  }

  // Create folder if not found
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Storage folder for AcademiaVault academic study documents and PDFs',
    }),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Failed to create Google Drive folder: ${errorText}`);
  }

  const newFolder = await createRes.json();
  saveGoogleDriveConfig(currentConfig.clientId, currentConfig.clientSecret, { folderId: newFolder.id });
  return newFolder.id;
}

/**
 * Uploads a file (PDF, notes, image) to the user's personal Google Drive using OAuth 2.0 multipart upload.
 */
export async function uploadFileToGoogleDrive(
  token: string,
  file: File | Blob,
  metadata: {
    title: string;
    mimeType: string;
    description?: string;
    subjectId?: string;
    semester?: number;
    type?: string;
  }
): Promise<{
  id: string;
  name: string;
  mimeType: string;
  size: number;
  webViewLink: string;
  webContentLink?: string;
}> {
  // Ensure the folder exists in Drive
  const folderId = await getOrCreateAcademiaFolder(token);

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const driveMetadata = {
    name: metadata.title,
    parents: [folderId],
    description: metadata.description || 'Uploaded via AcademiaVault',
    properties: {
      app: 'AcademiaVault',
      subjectId: metadata.subjectId || '',
      materialType: metadata.type || 'study_pdf',
    },
  };

  const fileBytes = await file.arrayBuffer();

  const metadataPart =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(driveMetadata) +
    '\r\n';

  const mediaPartHeader =
    `--${boundary}\r\n` +
    `Content-Type: ${metadata.mimeType || 'application/pdf'}\r\n\r\n`;

  // Combine multipart payload
  const enc = new TextEncoder();
  const part1 = enc.encode(metadataPart);
  const part2Header = enc.encode(mediaPartHeader);
  const part3Footer = enc.encode(closeDelimiter);

  const fullPayload = new Uint8Array(
    part1.byteLength + part2Header.byteLength + fileBytes.byteLength + part3Footer.byteLength
  );

  fullPayload.set(part1, 0);
  fullPayload.set(part2Header, part1.byteLength);
  fullPayload.set(new Uint8Array(fileBytes), part1.byteLength + part2Header.byteLength);
  fullPayload.set(part3Footer, part1.byteLength + part2Header.byteLength + fileBytes.byteLength);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,webContentLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: fullPayload,
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Drive upload failed (${res.status}): ${errText}`);
  }

  const uploadedFile = await res.json();

  // Try to create public link or reader permissions if permitted so files can be opened
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${uploadedFile.id}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });
  } catch {
    // Non-fatal if domain restricts public sharing
  }

  return {
    id: uploadedFile.id,
    name: uploadedFile.name,
    mimeType: uploadedFile.mimeType || metadata.mimeType,
    size: Number(uploadedFile.size || file.size),
    webViewLink: uploadedFile.webViewLink || `https://drive.google.com/file/d/${uploadedFile.id}/view`,
    webContentLink: uploadedFile.webContentLink,
  };
}

/**
 * Lists study files from the user's Google Drive AcademiaVault folder.
 */
export async function listFilesFromGoogleDrive(token: string): Promise<
  Array<{
    id: string;
    name: string;
    mimeType: string;
    size: number;
    webViewLink: string;
    webContentLink?: string;
    createdTime?: string;
    description?: string;
    properties?: Record<string, string>;
  }>
> {
  const folderId = await getOrCreateAcademiaFolder(token);
  const query = `'${folderId}' in parents and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&fields=files(id,name,mimeType,size,webViewLink,webContentLink,createdTime,description,properties)&orderBy=createdTime desc&pageSize=50`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to list Google Drive files: ${errorText}`);
  }

  const data = await res.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    size: Number(f.size || 0),
    webViewLink: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
    webContentLink: f.webContentLink,
    createdTime: f.createdTime,
    description: f.description,
    properties: f.properties,
  }));
}

/**
 * Downloads a file binary blob from Google Drive using the OAuth access token.
 */
export async function fetchGoogleDriveFileBlob(token: string, fileId: string): Promise<Blob> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to download file from Google Drive (${res.status}): ${res.statusText}`);
  }

  return await res.blob();
}

/**
 * Deletes a file from Google Drive.
 */
export async function deleteFileFromGoogleDrive(token: string, fileId: string): Promise<boolean> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  return res.ok || res.status === 204;
}

/**
 * Probes Google Drive API and verifies credentials, user account, and quota.
 */
export async function testGoogleDriveConnection(tokenInput?: string): Promise<{
  success: boolean;
  message: string;
  details?: {
    userEmail?: string;
    userName?: string;
    storageUsed?: string;
    storageLimit?: string;
    folderName?: string;
  };
}> {
  const token = tokenInput || cachedAccessToken;

  if (!token) {
    return {
      success: false,
      message: 'No active Google session found. Please click "Sign in with Google" to authorize Google Drive access.',
    };
  }

  try {
    const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user,storageQuota', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      if (res.status === 401) {
        return {
          success: false,
          message: 'Access token expired or unauthorized. Please re-sign in with Google.',
        };
      }
      const errText = await res.text();
      return {
        success: false,
        message: `Google Drive API returned HTTP ${res.status}: ${errText}`,
      };
    }

    const data = await res.json();
    const user = data.user || {};
    const quota = data.storageQuota || {};

    const bytesToGB = (bytes?: string | number) => {
      if (!bytes) return 'Unlimited';
      const num = Number(bytes);
      return `${(num / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    };

    const details = {
      userEmail: user.emailAddress,
      userName: user.displayName,
      storageUsed: bytesToGB(quota.usage),
      storageLimit: bytesToGB(quota.limit),
      folderName: FOLDER_NAME,
    };

    // Also verify or create the folder
    try {
      await getOrCreateAcademiaFolder(token);
    } catch (fErr) {
      console.warn('Folder creation probe note:', fErr);
    }

    return {
      success: true,
      message: `Connected successfully to Google Drive for ${user.displayName || user.emailAddress || 'User'}. Folder ready.`,
      details,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Network error connecting to Google Drive API: ${err?.message || 'Check your internet connection'}`,
    };
  }
}

/**
 * Opens a study material directly: opens Google Drive webViewLink or blob URL in a new window/tab.
 */
export function openMaterialDirectly(material: StudyMaterial, token?: string): void {
  if (material.drive_web_view_link) {
    window.open(material.drive_web_view_link, '_blank', 'noopener,noreferrer');
    return;
  }

  if (material.file_blob_url) {
    window.open(material.file_blob_url, '_blank', 'noopener,noreferrer');
    return;
  }

  if (material.drive_file_id && token) {
    fetchGoogleDriveFileBlob(token, material.drive_file_id)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener,noreferrer');
      })
      .catch((err) => {
        console.error('Failed to open Drive file:', err);
        window.open(`https://drive.google.com/file/d/${material.drive_file_id}/view`, '_blank');
      });
    return;
  }

  if (material.download_url) {
    window.open(material.download_url, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Downloads a study material directly to the user's device.
 */
export async function downloadMaterialDirectly(
  material: StudyMaterial,
  token?: string
): Promise<void> {
  const fileName = material.file_name || `${material.title}.pdf`;

  if (material.file_blob_url) {
    const a = document.createElement('a');
    a.href = material.file_blob_url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  if (material.drive_file_id && token) {
    try {
      const blob = await fetchGoogleDriveFileBlob(token, material.drive_file_id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 15000);
      return;
    } catch (err) {
      console.warn('Direct blob download failed, falling back to web link:', err);
    }
  }

  if (material.drive_download_link || material.drive_web_view_link) {
    window.open(material.drive_download_link || material.drive_web_view_link, '_blank');
    return;
  }

  if (material.download_url) {
    const a = document.createElement('a');
    a.href = material.download_url;
    a.download = fileName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

/**
 * Saves a study material to local registry and optionally synchronizes with Google Drive.
 */
export async function saveMaterialToGoogleDrive(
  material: StudyMaterial,
  _token?: string
): Promise<{ success: boolean; material: StudyMaterial }> {
  try {
    const stored = getLocalDriveMaterials();
    const updated = [material, ...stored.filter((m) => m.id !== material.id)];
    localStorage.setItem(STORAGE_MATERIALS_KEY, JSON.stringify(updated));
    return { success: true, material };
  } catch (err) {
    console.error('Error saving material to registry:', err);
    return { success: false, material };
  }
}

/**
 * Fetches stored Google Drive study materials.
 */
export function getLocalDriveMaterials(): StudyMaterial[] {
  try {
    const raw = localStorage.getItem(STORAGE_MATERIALS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed reading local drive materials:', err);
  }
  return [];
}

/**
 * Removes a material from registry and deletes from Google Drive if drive_file_id exists.
 */
export async function deleteMaterialFromGoogleDrive(
  materialId: string,
  token?: string
): Promise<boolean> {
  const materials = getLocalDriveMaterials();
  const target = materials.find((m) => m.id === materialId);

  if (target?.drive_file_id && token) {
    try {
      await deleteFileFromGoogleDrive(token, target.drive_file_id);
    } catch (err) {
      console.warn('Failed to delete file from Google Drive:', err);
    }
  }

  const filtered = materials.filter((m) => m.id !== materialId);
  localStorage.setItem(STORAGE_MATERIALS_KEY, JSON.stringify(filtered));
  return true;
}
