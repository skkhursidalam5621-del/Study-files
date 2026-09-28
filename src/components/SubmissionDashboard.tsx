import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Upload,
  Cloud,
  FileText,
  BookMarked,
  FlaskConical,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Plus,
  Loader2,
  Trash2,
  Eye,
  RefreshCw,
  FolderPlus,
  ArrowRight,
  HardDrive,
  FileCheck,
  Search,
  Download,
  Files,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Subject, StudyMaterial, MaterialType } from '../types';
import {
  uploadFileToGoogleDrive,
  saveMaterialToGoogleDrive,
  openMaterialDirectly,
  downloadMaterialDirectly,
  getStoredGoogleDriveConfig,
  getAccessToken,
} from '../services/googleDrive';
import { formatFileSize, formatDate } from '../utils/search';

interface SubmissionDashboardProps {
  subjects: Subject[];
  materials: StudyMaterial[];
  onMaterialCreated: (newMaterial: StudyMaterial) => void;
  onMaterialDeleted: (id: string) => void;
  onOpenCreateSubject: () => void;
  onOpenViewer: (material: StudyMaterial) => void;
  onOpenGoogleDriveConfig: () => void;
  googleDriveConnected: boolean;
}

export const SubmissionDashboard: React.FC<SubmissionDashboardProps> = ({
  subjects,
  materials,
  onMaterialCreated,
  onMaterialDeleted,
  onOpenCreateSubject,
  onOpenViewer,
  onOpenGoogleDriveConfig,
  googleDriveConnected,
}) => {
  // Upload mode: 'single' | 'batch'
  const [uploadMode, setUploadMode] = useState<'single' | 'batch'>('single');

  // Single file state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Batch files state
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const batchInputRef = useRef<HTMLInputElement | null>(null);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  // Form Fields
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [materialType, setMaterialType] = useState<MaterialType>('study_pdf');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [semester, setSemester] = useState<number>(1);
  const [topicsInput, setTopicsInput] = useState('');

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Repository search & filter
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Update semester when subject changes
  useEffect(() => {
    if (selectedSubjectId) {
      const sub = subjects.find((s) => s.id === selectedSubjectId);
      if (sub) {
        setSemester(sub.semester);
      }
    } else if (subjects.length > 0) {
      setSelectedSubjectId(subjects[0].id);
      setSemester(subjects[0].semester);
    }
  }, [selectedSubjectId, subjects]);

  // Clean title formatter
  const formatFileNameToTitle = (filename: string): string => {
    return filename
      .replace(/\.[^/.]+$/, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // Auto-detect material category
  const detectCategory = (file: File): MaterialType => {
    const lowerName = file.name.toLowerCase();
    if (file.type.startsWith('image/')) return 'diagram';
    if (lowerName.includes('syllabus') || lowerName.includes('curriculum')) return 'course_syllabus';
    if (lowerName.includes('lab') || lowerName.includes('manual') || lowerName.includes('practical') || lowerName.includes('exp')) return 'practical_manual';
    return 'study_pdf';
  };

  const handleSingleFileSelect = (file: File) => {
    setSelectedFile(file);
    setSubmissionError(null);
    setSubmissionSuccess(null);

    const objUrl = URL.createObjectURL(file);
    setFilePreviewUrl(objUrl);

    if (!title.trim()) {
      setTitle(formatFileNameToTitle(file.name));
    }
    setMaterialType(detectCategory(file));
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (uploadMode === 'single') {
        handleSingleFileSelect(e.dataTransfer.files[0]);
      } else {
        const filesArray = Array.from(e.dataTransfer.files);
        setBatchFiles((prev) => [...prev, ...filesArray]);
      }
    }
  };

  // Submit Single Document
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setSubmissionError('Please select a file to upload.');
      return;
    }
    if (!title.trim()) {
      setSubmissionError('Please enter a document title.');
      return;
    }
    if (!selectedSubjectId) {
      setSubmissionError('Please select an academic subject folder.');
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);
    setSubmissionSuccess(null);
    setSubmissionProgress('Preparing document...');

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

      // Google Drive OAuth 2.0 Upload
      if (googleDriveConnected) {
        setSubmissionProgress('Uploading document directly to your Google Drive...');
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
            console.warn('Drive upload error:', driveErr);
          }
        }
      }

      setSubmissionProgress('Saving academic record...');

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
              title: 'Overview & Summary',
              content: description.trim() || `Study resource: ${selectedFile.name}. Uploaded for academic review and exam preparation.`,
              key_takeaways: topics.length > 0 ? topics : ['Standard curriculum study material'],
            },
          ],
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (googleDriveConnected) {
        await saveMaterialToGoogleDrive(newMaterial);
      }

      onMaterialCreated(newMaterial);
      setSubmissionSuccess(`Successfully uploaded "${newMaterial.title}" directly to ${driveFileId ? 'your personal Google Drive' : 'local workspace'}!`);

      // Reset form
      setSelectedFile(null);
      setFilePreviewUrl(null);
      setTitle('');
      setDescription('');
      setTopicsInput('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setSubmissionError(err?.message || 'Failed to upload document.');
    } finally {
      setIsSubmitting(false);
      setSubmissionProgress(null);
    }
  };

  // Submit Batch Documents
  const handleBatchSubmit = async () => {
    if (batchFiles.length === 0) {
      setSubmissionError('Please add one or more files for batch upload.');
      return;
    }
    if (!selectedSubjectId) {
      setSubmissionError('Please select a target subject folder.');
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);
    setSubmissionSuccess(null);
    setBatchProgress({ current: 0, total: batchFiles.length });

    let successCount = 0;

    for (let i = 0; i < batchFiles.length; i++) {
      const file = batchFiles[i];
      setBatchProgress({ current: i + 1, total: batchFiles.length });
      setSubmissionProgress(`Processing file ${i + 1} of ${batchFiles.length}: ${file.name}`);

      try {
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf';
        const fileType = detectCategory(file);
        let filePath = `documents/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        let downloadUrl: string | undefined = undefined;
        let driveFileId: string | undefined = undefined;
        let driveWebViewLink: string | undefined = undefined;
        let driveDownloadLink: string | undefined = undefined;
        let diagramUrl: string | undefined = undefined;

        if (googleDriveConnected) {
          const token = await getAccessToken();
          if (token) {
            try {
              const driveRes = await uploadFileToGoogleDrive(token, file, {
                title: formatFileNameToTitle(file.name),
                mimeType: file.type,
                description: `Batch uploaded study document: ${file.name}`,
                subjectId: selectedSubjectId,
                semester: Number(semester),
                type: fileType,
              });

              if (driveRes && driveRes.id) {
                driveFileId = driveRes.id;
                driveWebViewLink = driveRes.webViewLink;
                driveDownloadLink = driveRes.webContentLink;
                downloadUrl = driveRes.webContentLink || driveRes.webViewLink;
                filePath = `gdrive://${driveRes.id}/${file.name}`;
              }
            } catch (dErr) {
              console.warn('Batch drive upload item error:', dErr);
            }
          }
        }

        const cleanTitle = formatFileNameToTitle(file.name);

        const newMaterial: StudyMaterial = {
          id: `mat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          subject_id: selectedSubjectId,
          title: cleanTitle,
          type: fileType,
          source_type: driveFileId ? 'google_drive' : 'device_upload',
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_extension: fileExt,
          mime_type: file.type,
          topics: [cleanTitle.toLowerCase()],
          description: `Direct document upload for ${cleanTitle}.`,
          author_or_instructor: author.trim() || 'Course Instructor',
          semester: Number(semester),
          is_starred: false,
          views_count: 0,
          download_url: downloadUrl,
          drive_file_id: driveFileId,
          drive_web_view_link: driveWebViewLink,
          drive_download_link: driveDownloadLink,
          preview_content: {
            diagram_url: diagramUrl,
            sections: [
              {
                title: 'Overview',
                content: `Document: ${file.name}. Uploaded via batch document system.`,
                key_takeaways: ['Batch imported resource'],
              },
            ],
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (googleDriveConnected) {
          await saveMaterialToGoogleDrive(newMaterial);
        }

        onMaterialCreated(newMaterial);
        successCount++;
      } catch (err) {
        console.error('Batch upload error on item:', file.name, err);
      }
    }

    setIsSubmitting(false);
    setSubmissionProgress(null);
    setBatchProgress(null);
    setBatchFiles([]);
    setSubmissionSuccess(`Successfully uploaded ${successCount} documents to the vault!`);
  };

  // Delete Action
  const executeDelete = async (mat: StudyMaterial) => {
    setDeletingId(mat.id);
    setPendingDeleteId(null);
    setSubmissionError(null);
    try {
      await onMaterialDeleted(mat.id);
      setSubmissionSuccess(`Deleted "${mat.title}" from storage and database.`);
      setTimeout(() => setSubmissionSuccess(null), 3000);
    } catch (err: any) {
      setSubmissionError(`Could not delete material: ${err?.message || 'Deletion error'}`);
    } finally {
      setDeletingId(null);
    }
  };

  // Filtered materials in repository table
  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchQuery =
        !searchFilter ||
        m.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
        m.file_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        m.author_or_instructor.toLowerCase().includes(searchFilter.toLowerCase());

      const matchCat = categoryFilter === 'all' || m.type === categoryFilter;

      return matchQuery && matchCat;
    });
  }, [materials, searchFilter, categoryFilter]);

  // Aggregate stats
  const totalStorageBytes = useMemo(() => {
    return materials.reduce((acc, curr) => acc + (curr.file_size || 0), 0);
  }, [materials]);

  return (
    <div className="space-y-8 w-full mx-auto pb-12">
      {/* Top Banner & Google Drive Connection Status */}
      <div className="relative overflow-hidden rounded-2xl bg-neutral-900 border border-neutral-800 p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 87.3 78">
                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
                <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
              </svg>
              <span>Google Drive OAuth 2.0 Personal Storage</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-100 tracking-tight">
              Document Upload & Storage System
            </h1>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Upload PDF files, high-resolution diagrams, course syllabi, and practical lab manuals directly from your computer or phone. Files are stored securely in your personal Google Drive and instantly indexed for curriculum review.
            </p>
          </div>

          {/* Quick Metrics & Google Drive Status */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="p-3.5 bg-neutral-950/70 border border-neutral-800 rounded-xl min-w-[120px]">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
                Total Files
              </span>
              <span className="text-xl font-bold text-neutral-100 tabular-nums">
                {materials.length}
              </span>
            </div>

            <div className="p-3.5 bg-neutral-950/70 border border-neutral-800 rounded-xl min-w-[120px]">
              <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block">
                Storage Used
              </span>
              <span className="text-xl font-bold text-neutral-100 tabular-nums">
                {formatFileSize(totalStorageBytes)}
              </span>
            </div>

            <button
              onClick={onOpenGoogleDriveConfig}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-xs font-semibold transition-all ${
                googleDriveConnected
                  ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/40'
                  : 'bg-amber-950/20 border-amber-800/60 text-amber-300 hover:bg-amber-900/30'
              }`}
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 87.3 78">
                <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
                <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
              </svg>
              <div className="text-left">
                <span className="block font-bold">
                  {googleDriveConnected ? 'Google Drive Connected' : 'Connect Google Drive'}
                </span>
                <span className="text-[10px] text-neutral-400 font-normal">
                  {googleDriveConnected
                    ? `${getStoredGoogleDriveConfig().userEmail || 'Personal Drive Storage'}`
                    : 'Click to configure OAuth 2.0'}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Main Upload Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Direct Upload Form (7 cols) */}
        <div className="lg:col-span-7 bg-neutral-900/70 border border-neutral-800 rounded-2xl p-6 sm:p-7 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-neutral-100">Upload New Material</h2>
                <p className="text-xs text-neutral-400">Directly from your device storage</p>
              </div>
            </div>

            {/* Single vs Batch Switcher */}
            <div className="flex items-center bg-neutral-950 border border-neutral-800 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setUploadMode('single')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  uploadMode === 'single'
                    ? 'bg-neutral-800 text-white font-semibold shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Single Document</span>
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('batch')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                  uploadMode === 'batch'
                    ? 'bg-neutral-800 text-white font-semibold shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Files className="w-3.5 h-3.5" />
                <span>Batch Upload</span>
              </button>
            </div>
          </div>

          {/* Feedback messages */}
          {submissionSuccess && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/80 text-xs text-emerald-200 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block">{submissionSuccess}</span>
                <p className="text-neutral-400 text-[11px]">
                  Document is indexed and ready for curriculum study or Gemini AI Assistant analysis.
                </p>
              </div>
            </div>
          )}

          {submissionError && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-950/40 border border-red-800/80 text-xs text-red-200 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{submissionError}</span>
            </div>
          )}

          {/* SINGLE FILE UPLOAD MODE */}
          {uploadMode === 'single' ? (
            <form onSubmit={handleSingleSubmit} className="space-y-5">
              {/* Drag and drop file zone */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                  Select Document File <span className="text-red-400">*</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt,.md"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleSingleFileSelect(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                {!selectedFile ? (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-neutral-800 hover:border-indigo-500/60 hover:bg-indigo-950/10 rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-neutral-900 group-hover:bg-indigo-600/20 text-neutral-400 group-hover:text-indigo-400 flex items-center justify-center mx-auto transition-colors">
                      <Upload className="w-7 h-7" />
                    </div>
                    <p className="mt-3 text-sm font-bold text-neutral-200">
                      Click to browse or drop file from your computer
                    </p>
                    <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                      Supports PDFs, images (PNG, JPG, WEBP), Word documents, syllabi, & practical manuals.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-2xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 truncate">
                      <div className="w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0">
                        {selectedFile.type.startsWith('image/') ? (
                          <ImageIcon className="w-6 h-6" />
                        ) : (
                          <FileCheck className="w-6 h-6" />
                        )}
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-semibold text-neutral-100 truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          {formatFileSize(selectedFile.size)} · {selectedFile.type || 'Document'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setFilePreviewUrl(null);
                        }}
                        className="p-1.5 text-neutral-400 hover:text-red-400 transition-colors"
                        title="Remove File"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Academic Category Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                  Academic Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { type: 'study_pdf' as MaterialType, label: 'Study PDF', desc: 'Lecture Notes', icon: FileText, color: 'text-blue-400' },
                    { type: 'course_syllabus' as MaterialType, label: 'Syllabus', desc: 'Modules & Units', icon: BookMarked, color: 'text-amber-400' },
                    { type: 'practical_manual' as MaterialType, label: 'Lab Manual', desc: 'Experiments', icon: FlaskConical, color: 'text-emerald-400' },
                    { type: 'diagram' as MaterialType, label: 'Diagram', desc: 'High-Res Image', icon: ImageIcon, color: 'text-purple-400' },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = materialType === item.type;
                    return (
                      <button
                        type="button"
                        key={item.type}
                        onClick={() => setMaterialType(item.type)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'bg-neutral-800 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50'
                            : 'bg-neutral-950/60 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                        }`}
                      >
                        <Icon className={`w-5 h-5 mb-1.5 ${item.color}`} />
                        <span className="text-xs font-semibold block">{item.label}</span>
                        <span className="text-[10px] text-neutral-500 block">{item.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title Field */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                  Document Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Unit 4: Neural Networks & Backpropagation"
                  className="w-full px-3.5 py-2.5 text-sm bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Subject & Semester */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                      Target Subject Folder <span className="text-red-400">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={onOpenCreateSubject}
                      className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>+ New Folder</span>
                    </button>
                  </div>
                  {subjects.length === 0 ? (
                    <div className="p-2.5 text-xs bg-neutral-950 border border-amber-800/60 text-amber-300 rounded-xl">
                      No subject folders yet. Please click &ldquo;+ New Folder&rdquo; above.
                    </div>
                  ) : (
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => setSelectedSubjectId(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Academic Semester
                  </label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-sm bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Instructor / Author
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="e.g. Dr. Jane Smith"
                    className="w-full px-3.5 py-2.5 text-sm bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Topic Keywords
                  </label>
                  <input
                    type="text"
                    value={topicsInput}
                    onChange={(e) => setTopicsInput(e.target.value)}
                    placeholder="e.g. backpropagation, gradient descent, tensors"
                    className="w-full px-3.5 py-2.5 text-sm bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Notes / Description */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                  Study Notes & Overview
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Key concepts covered in this document, exam review points, or lab guidelines..."
                  className="w-full px-3.5 py-2.5 text-sm bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedFile}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{submissionProgress || 'Uploading Document...'}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Save & Upload Document</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* BATCH MULTI-FILE UPLOAD MODE */
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                  Select Multiple Files <span className="text-red-400">*</span>
                </label>
                <input
                  ref={batchInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt"
                  onChange={(e) => {
                    if (e.target.files) {
                      setBatchFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                    }
                  }}
                  className="hidden"
                />

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  onClick={() => batchInputRef.current?.click()}
                  className="border-2 border-dashed border-neutral-800 hover:border-indigo-500/60 hover:bg-indigo-950/10 rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-neutral-900 group-hover:bg-indigo-600/20 text-neutral-400 group-hover:text-indigo-400 flex items-center justify-center mx-auto transition-colors">
                    <Files className="w-7 h-7" />
                  </div>
                  <p className="mt-3 text-sm font-bold text-neutral-200">
                    Click to select multiple files or drag them here
                  </p>
                  <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                    Upload entire course modules, lecture slides, and laboratory handouts in one go.
                  </p>
                </div>
              </div>

              {/* Target Subject Selector for Batch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Target Subject Folder <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  >
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.code}: {sub.name} (Sem {sub.semester})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                    Default Instructor / Author
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="e.g. Department Faculty"
                    className="w-full px-3.5 py-2.5 text-sm bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Selected Files Queue */}
              {batchFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <span className="font-semibold uppercase tracking-wider">
                      Selected Files ({batchFiles.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setBatchFiles([])}
                      className="text-red-400 hover:text-red-300 font-medium"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {batchFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <FileCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                          <span className="text-neutral-200 truncate font-medium">{file.name}</span>
                          <span className="text-neutral-500 tabular-nums">
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setBatchFiles((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-neutral-500 hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Batch Submit CTA */}
              <button
                type="button"
                onClick={handleBatchSubmit}
                disabled={isSubmitting || batchFiles.length === 0}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      {batchProgress
                        ? `Uploading ${batchProgress.current}/${batchProgress.total}...`
                        : 'Batch Processing...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Upload {batchFiles.length} Documents</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Live Document Preview & Guidelines (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Document Preview Card */}
          <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-wider flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-400" />
              <span>Live File Preview</span>
            </h3>

            {selectedFile ? (
              <div className="space-y-4">
                {selectedFile.type.startsWith('image/') && filePreviewUrl ? (
                  <div className="w-full h-48 rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 relative">
                    <img
                      src={filePreviewUrl}
                      alt={selectedFile.name}
                      className="w-full h-full object-contain p-2"
                    />
                  </div>
                ) : (
                  <div className="w-full h-48 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col items-center justify-center p-4 text-center">
                    <FileText className="w-12 h-12 text-indigo-400 mb-2" />
                    <span className="text-xs font-semibold text-neutral-200">
                      {selectedFile.name}
                    </span>
                    <span className="text-[11px] text-neutral-500 mt-1">
                      {formatFileSize(selectedFile.size)} · Ready to upload
                    </span>
                  </div>
                )}

                <div className="p-3.5 bg-neutral-950 border border-neutral-800/80 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">File Type:</span>
                    <span className="font-mono text-neutral-300">
                      {selectedFile.type || selectedFile.name.split('.').pop()?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Target Category:</span>
                    <span className="font-semibold text-indigo-400 capitalize">
                      {materialType.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Storage Target:</span>
                    <span className="text-neutral-300 font-medium">
                      {googleDriveConnected
                        ? `Google Drive (AcademiaVault folder)`
                        : 'Local Device Cache'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 px-4 border border-dashed border-neutral-800 rounded-xl space-y-2 text-neutral-500 text-xs">
                <FileText className="w-8 h-8 mx-auto text-neutral-600" />
                <p>Select or drag a file to inspect its metadata and preview.</p>
              </div>
            )}
          </div>

          {/* Quick Storage Architecture Tips */}
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 space-y-3.5 text-xs text-neutral-400">
            <h4 className="font-bold text-neutral-200 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Direct Upload Highlights</span>
            </h4>
            <ul className="space-y-2.5">
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">1.</span>
                <span>
                  <strong>Native PDF & Image Viewer:</strong> Uploaded materials open directly in your device's native file reader with zero in-app embedding delays.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">2.</span>
                <span>
                  <strong>Google Cloud Storage (GCS):</strong> Files are stored directly in high-durability Google Cloud Storage buckets with instant public URLs.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">3.</span>
                <span>
                  <strong>Integrated Gemini Study AI:</strong> Every uploaded document is instantly eligible for generating study summaries, exam quizzes, and concept deep-dives.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Uploaded Documents Repository Table */}
      <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-6 sm:p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
          <div>
            <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Uploaded Documents Repository</span>
            </h2>
            <p className="text-xs text-neutral-400">
              Manage all study materials, download documents, or view them in the reader
            </p>
          </div>

          {/* Filter and Search Bar */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search repository..."
                className="pl-8 pr-3 py-1.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-300 focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="study_pdf">Study PDFs</option>
              <option value="course_syllabus">Course Syllabi</option>
              <option value="practical_manual">Lab Manuals</option>
              <option value="diagram">Diagrams</option>
            </select>
          </div>
        </div>

        {/* Repository Table / List */}
        {filteredMaterials.length === 0 ? (
          <div className="text-center py-12 px-4 border border-neutral-800 rounded-xl space-y-2">
            <FileText className="w-10 h-10 mx-auto text-neutral-600" />
            <p className="text-sm font-semibold text-neutral-300">No documents found</p>
            <p className="text-xs text-neutral-500">
              Upload your first document above to populate the academic repository.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950/60 border-b border-neutral-800 text-neutral-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Document</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Subject & Sem</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {filteredMaterials.map((mat) => {
                  const sub = subjects.find((s) => s.id === mat.subject_id);
                  const isDeleting = deletingId === mat.id;

                  return (
                    <tr
                      key={mat.id}
                      className="hover:bg-neutral-950/40 transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <div
                          onClick={() => openMaterialDirectly(mat)}
                          className="flex items-center gap-3 cursor-pointer group/doc"
                          title="Click to open directly in default device viewer"
                        >
                          <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0 group-hover/doc:bg-indigo-950/60 transition-colors">
                            {mat.type === 'study_pdf' && <FileText className="w-4 h-4 text-blue-400" />}
                            {mat.type === 'course_syllabus' && <BookMarked className="w-4 h-4 text-amber-400" />}
                            {mat.type === 'practical_manual' && <FlaskConical className="w-4 h-4 text-emerald-400" />}
                            {mat.type === 'diagram' && <ImageIcon className="w-4 h-4 text-purple-400" />}
                          </div>
                          <div className="truncate max-w-xs">
                            <span className="font-semibold text-neutral-200 block truncate group-hover/doc:text-indigo-300 transition-colors">
                              {mat.title}
                            </span>
                            <span className="text-[11px] text-neutral-500 block truncate font-mono">
                              {mat.file_name}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-neutral-800 text-neutral-300">
                          {mat.type.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-neutral-300 font-medium block">
                          {sub?.code || 'Course'}
                        </span>
                        <span className="text-[11px] text-neutral-500">
                          Semester {mat.semester}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-neutral-400 tabular-nums">
                        {formatFileSize(mat.file_size)}
                      </td>

                      <td className="py-3 px-4 text-neutral-500 tabular-nums">
                        {formatDate(mat.created_at)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Open Directly in Default Device File Viewer / Browser */}
                          <button
                            onClick={() => openMaterialDirectly(mat)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                            title="Open in default file viewer"
                            aria-label="Open in default file viewer"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>

                          {/* Download */}
                          <button
                            onClick={() => downloadMaterialDirectly(mat)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                            title="Download file"
                            aria-label="Download file"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* Delete with Inline Confirm */}
                          {pendingDeleteId === mat.id ? (
                            <div className="inline-flex items-center gap-1 bg-red-950 border border-red-800 rounded px-1.5 py-0.5 text-[10px] text-red-200">
                              <span>Delete?</span>
                              <button
                                onClick={() => executeDelete(mat)}
                                disabled={isDeleting}
                                className="font-bold underline hover:text-white px-0.5"
                              >
                                {isDeleting ? '...' : 'Yes'}
                              </button>
                              <span className="text-neutral-600">·</span>
                              <button
                                onClick={() => setPendingDeleteId(null)}
                                className="hover:text-neutral-200 px-0.5 text-neutral-400"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setPendingDeleteId(mat.id)}
                              disabled={isDeleting}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition-colors disabled:opacity-50"
                              title="Delete Material"
                            >
                              {isDeleting ? (
                                <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
