import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  BookMarked,
  FlaskConical,
  Image as ImageIcon,
  Loader2,
  Plus,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  HardDrive,
  Cloud,
} from 'lucide-react';
import { Subject, StudyMaterial, MaterialType } from '../types';
import {
  uploadFileToGoogleDrive,
  saveMaterialToGoogleDrive,
  getAccessToken,
} from '../services/googleDrive';
import { formatFileSize } from '../utils/search';

interface UploadModalProps {
  subjects: Subject[];
  defaultSubjectId?: string;
  onClose: () => void;
  onMaterialCreated: (newMaterial: StudyMaterial) => void;
  onOpenCreateSubject: () => void;
  googleDriveConnected: boolean;
  onOpenGoogleDrive?: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  subjects,
  defaultSubjectId,
  onClose,
  onMaterialCreated,
  onOpenCreateSubject,
  googleDriveConnected,
  onOpenGoogleDrive,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    defaultSubjectId || (subjects[0]?.id ?? '')
  );
  const [materialType, setMaterialType] = useState<MaterialType>('study_pdf');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [semester, setSemester] = useState<number>(1);
  const [topicsInput, setTopicsInput] = useState('');

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-sync semester when subject changes
  const handleSubjectChange = (subId: string) => {
    setSelectedSubjectId(subId);
    const sub = subjects.find((s) => s.id === subId);
    if (sub) {
      setSemester(sub.semester);
    }
  };

  const processSelectedFile = (file: File) => {
    setSelectedFile(file);
    setErrorMsg('');

    // Generate local preview URL
    const objUrl = URL.createObjectURL(file);
    setFilePreviewUrl(objUrl);

    // Auto-detect title if empty
    if (!title.trim()) {
      const cleanName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      setTitle(cleanName);
    }

    // Auto-suggest category based on file name or MIME type
    const lowerName = file.name.toLowerCase();
    if (file.type.startsWith('image/')) {
      setMaterialType('diagram');
    } else if (lowerName.includes('syllabus') || lowerName.includes('curriculum')) {
      setMaterialType('course_syllabus');
    } else if (lowerName.includes('lab') || lowerName.includes('manual') || lowerName.includes('practical') || lowerName.includes('experiment')) {
      setMaterialType('practical_manual');
    } else {
      setMaterialType('study_pdf');
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg('Please select a document or file from your device.');
      return;
    }
    if (!title.trim()) {
      setErrorMsg('Please enter a title for the material.');
      return;
    }
    if (!selectedSubjectId) {
      setErrorMsg('Please select an academic subject folder.');
      return;
    }

    setIsUploading(true);
    setErrorMsg('');
    setUploadProgress('Preparing document...');

    try {
      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase() || 'pdf';
      let filePath = `documents/${Date.now()}_${selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      let downloadUrl: string | undefined = undefined;
      let driveFileId: string | undefined = undefined;
      let driveWebViewLink: string | undefined = undefined;
      let driveDownloadLink: string | undefined = undefined;
      let diagramUrl: string | undefined = undefined;

      if (selectedFile.type.startsWith('image/')) {
        diagramUrl = filePreviewUrl || undefined;
      }

      // If connected to Google Drive, upload directly via OAuth 2.0
      if (googleDriveConnected) {
        setUploadProgress('Uploading document to your Google Drive...');
        const token = await getAccessToken();
        if (token) {
          try {
            const driveRes = await uploadFileToGoogleDrive(token, selectedFile, {
              title: title.trim(),
              mimeType: selectedFile.type,
              description: description.trim(),
              subjectId: selectedSubjectId,
              semester: Number(semester),
              type: materialType,
            });

            if (driveRes && driveRes.id) {
              driveFileId = driveRes.id;
              driveWebViewLink = driveRes.webViewLink;
              driveDownloadLink = driveRes.webContentLink;
              downloadUrl = driveRes.webContentLink || driveRes.webViewLink;
              filePath = `gdrive://${driveRes.id}/${selectedFile.name}`;
            }
          } catch (driveErr: any) {
            console.warn('Google Drive upload warning, continuing with local reference:', driveErr);
          }
        }
      }

      setUploadProgress('Indexing academic metadata...');

      const topics = topicsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const newMaterial: StudyMaterial = {
        id: `mat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        subject_id: selectedSubjectId,
        title: title.trim(),
        type: materialType,
        source_type: driveFileId ? 'google_drive' : 'device_upload',
        file_name: selectedFile.name,
        file_path: filePath,
        file_size: selectedFile.size,
        file_extension: fileExt,
        mime_type: selectedFile.type,
        topics: topics.length > 0 ? topics : [title.toLowerCase()],
        description: description.trim(),
        author_or_instructor: author.trim() || 'Course Instructor',
        semester: Number(semester),
        is_starred: false,
        views_count: 0,
        download_url: downloadUrl || filePreviewUrl || undefined,
        file_blob_url: filePreviewUrl || undefined,
        drive_file_id: driveFileId,
        drive_web_view_link: driveWebViewLink,
        drive_download_link: driveDownloadLink,
        preview_content: {
          diagram_url: diagramUrl,
          sections: [
            {
              title: 'Overview & Document Summary',
              content: description.trim() || `Uploaded academic material: ${selectedFile.name}. Ready for curriculum reference and exam preparation.`,
              key_takeaways: topics.length > 0 ? topics : ['Verified academic study resource'],
            },
          ],
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (googleDriveConnected) {
        setUploadProgress('Saving to Google Drive index...');
        await saveMaterialToGoogleDrive(newMaterial);
      }

      onMaterialCreated(newMaterial);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to upload document.');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-100">Upload Document</h2>
              <p className="text-xs text-neutral-400">
                Directly upload PDFs, Syllabi, Practical Manuals & Images
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-950/40 border border-red-800/80 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Device Document Dropzone */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
              Select Document File <span className="text-red-400">*</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt,.md"
              onChange={handleFileSelect}
              className="hidden"
            />

            {!selectedFile ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-neutral-800 hover:border-indigo-500/60 hover:bg-indigo-950/10 rounded-xl p-6 text-center cursor-pointer transition-all duration-150 group"
              >
                <div className="w-12 h-12 rounded-xl bg-neutral-900 group-hover:bg-indigo-600/20 text-neutral-400 group-hover:text-indigo-400 flex items-center justify-center mx-auto transition-colors">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="mt-2 text-sm font-semibold text-neutral-200">
                  Click to browse or drag and drop document
                </p>
                <p className="text-xs text-neutral-500 mt-1">
                  Supported formats: PDF, Images (PNG, JPG, WEBP), Word Documents, Text Notes (Up to 50MB)
                </p>
              </div>
            ) : (
              <div className="p-3.5 bg-neutral-900/90 border border-neutral-800 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 truncate">
                  <div className="w-10 h-10 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-semibold text-neutral-100 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      {formatFileSize(selectedFile.size)} · {selectedFile.type || 'Document'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setFilePreviewUrl(null);
                    }}
                    className="p-1 text-neutral-400 hover:text-red-400 transition-colors"
                    title="Remove File"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Academic Type Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
              Academic Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { type: 'study_pdf' as MaterialType, label: 'Study PDF', icon: FileText, color: 'text-blue-400' },
                { type: 'course_syllabus' as MaterialType, label: 'Syllabus', icon: BookMarked, color: 'text-amber-400' },
                { type: 'practical_manual' as MaterialType, label: 'Lab Manual', icon: FlaskConical, color: 'text-emerald-400' },
                { type: 'diagram' as MaterialType, label: 'Diagram', icon: ImageIcon, color: 'text-purple-400' },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = materialType === item.type;
                return (
                  <button
                    type="button"
                    key={item.type}
                    onClick={() => setMaterialType(item.type)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'bg-neutral-800 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50'
                        : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-1 ${item.color}`} />
                    <span className="text-xs font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
              Document Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Unit 3: Distributed Systems Architecture"
              className="w-full px-3 py-2 text-xs sm:text-sm bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Subject & Semester Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Subject Folder <span className="text-red-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={onOpenCreateSubject}
                  className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" />
                  <span>New Subject</span>
                </button>
              </div>
              {subjects.length === 0 ? (
                <div className="p-2 text-xs bg-neutral-900 border border-amber-800/60 text-amber-300 rounded-lg">
                  No subjects found. Create a subject folder first.
                </div>
              ) : (
                <select
                  value={selectedSubjectId}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.code}: {sub.name} (Sem {sub.semester})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                Academic Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <option key={sem} value={sem}>
                    Semester {sem}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Author & Topics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                Faculty / Author
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Prof. Alan Turing"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                Key Topics / Keywords
              </label>
              <input
                type="text"
                value={topicsInput}
                onChange={(e) => setTopicsInput(e.target.value)}
                placeholder="e.g. consensus, paxos, replication"
                className="w-full px-3 py-2 text-xs sm:text-sm bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
              Description & Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Summary of chapters covered, syllabus unit references, or lab exam tips..."
              className="w-full px-3 py-2 text-xs sm:text-sm bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Google Drive storage indicator */}
          <div className="p-3 bg-neutral-900/60 border border-neutral-800 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 87.3 78">
                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
                <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
              </svg>
              <span className="text-neutral-300">
                {googleDriveConnected
                  ? 'Saving directly to your personal Google Drive (AcademiaVault folder)'
                  : 'Local device storage (Connect Google Drive for cloud storage)'}
              </span>
            </div>
            {googleDriveConnected ? (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Drive Synced</span>
              </span>
            ) : (
              onOpenGoogleDrive && (
                <button
                  type="button"
                  onClick={onOpenGoogleDrive}
                  className="text-[11px] font-medium text-amber-400 hover:text-amber-300 underline"
                >
                  Connect Drive
                </button>
              )
            )}
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white rounded-lg transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isUploading || !selectedFile}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{uploadProgress || 'Uploading...'}</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Document</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
