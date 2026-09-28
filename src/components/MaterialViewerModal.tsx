import React, { useState } from 'react';
import {
  X,
  Star,
  Download,
  Sparkles,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Contrast,
  Send,
  Loader2,
  FileText,
  BookMarked,
  FlaskConical,
  Image as ImageIcon,
  CheckCircle2,
  HelpCircle,
  Share2,
  ExternalLink,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { StudyMaterial, Subject } from '../types';
import { askGeminiStudyAssistant } from '../services/gemini';
import { formatFileSize, formatDate } from '../utils/search';
import {
  openMaterialDirectly,
  downloadMaterialDirectly,
} from '../services/googleDrive';

interface MaterialViewerModalProps {
  material: StudyMaterial;
  subject?: Subject;
  onClose: () => void;
  onToggleStar: (id: string, e: React.MouseEvent) => void;
  onDeleteMaterial?: (id: string) => void;
  initialOpenAssistant?: boolean;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  actionType?: string;
}

export const MaterialViewerModal: React.FC<MaterialViewerModalProps> = ({
  material,
  subject,
  onClose,
  onToggleStar,
  onDeleteMaterial,
  initialOpenAssistant = false,
}) => {
  const [showAssistant, setShowAssistant] = useState(initialOpenAssistant);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [invertContrast, setInvertContrast] = useState(false);
  const [selectedExperimentIdx, setSelectedExperimentIdx] = useState(0);

  // Gemini Study Assistant state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const getCombinedTextContext = (): string => {
    let text = `${material.title}\n${material.description}\n`;
    if (material.preview_content?.sections) {
      material.preview_content.sections.forEach((sec) => {
        text += `\n## ${sec.title}\n${sec.content}\n`;
        if (sec.key_takeaways) {
          text += `Key points: ${sec.key_takeaways.join('; ')}\n`;
        }
      });
    }
    if (material.preview_content?.experiments) {
      material.preview_content.experiments.forEach((exp) => {
        text += `\nExperiment ${exp.exp_number}: ${exp.title}\nAim: ${exp.aim}\nTheory: ${exp.theory}\nProcedure: ${exp.procedure.join(' ')}\nPrecautions: ${exp.precautions.join(' ')}\n`;
      });
    }
    if (material.preview_content?.syllabus_modules) {
      material.preview_content.syllabus_modules.forEach((mod) => {
        text += `\nModule ${mod.module_number}: ${mod.title} (${mod.hours}h)\nTopics: ${mod.topics.join(', ')}\nTextbooks: ${mod.textbooks.join(', ')}\n`;
      });
    }
    return text;
  };

  const handleAssistantAction = async (action: 'summary' | 'explain' | 'quiz' | 'chat', customQuery?: string) => {
    const query = customQuery || userQuery;
    if (action === 'chat' && !query.trim()) return;

    setIsLoadingAi(true);
    setActiveAction(action);

    if (action === 'chat') {
      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        sender: 'user',
        content: query,
      };
      setMessages((prev) => [...prev, userMsg]);
      setUserQuery('');
    }

    try {
      const context = getCombinedTextContext();
      const res = await askGeminiStudyAssistant({
        action,
        materialTitle: material.title,
        materialType: material.type,
        subjectName: subject?.name || 'General Course',
        content: context,
        query: action === 'chat' ? query : undefined,
      });

      if (res.success && res.text) {
        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          content: res.text,
          actionType: action,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        const errorMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          content: `⚠️ ${res.error || 'Failed to generate assistance. Please try again.'}`,
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'assistant',
          content: `⚠️ Error: ${err?.message || 'Network error'}`,
        },
      ]);
    } finally {
      setIsLoadingAi(false);
      setActiveAction(null);
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const activeDocUrl =
    material.drive_web_view_link ||
    material.drive_download_link ||
    material.file_blob_url ||
    material.download_url;

  const isPdf =
    material.file_extension?.toLowerCase() === 'pdf' ||
    material.mime_type === 'application/pdf' ||
    material.type === 'study_pdf';

  const handleDownload = () => {
    downloadMaterialDirectly(material);
  };

  const handleOpenFullscreen = () => {
    openMaterialDirectly(material);
  };

  const handleDeleteSelf = async () => {
    if (!onDeleteMaterial) return;
    setIsDeleting(true);
    try {
      await onDeleteMaterial(material.id);
      onClose();
    } catch (err) {
      console.error('Delete material error:', err);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden">
      <div className="relative w-full max-w-6xl h-[92vh] flex flex-col bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="px-5 py-3.5 border-b border-neutral-800 flex items-center justify-between gap-4 bg-neutral-900/90 shrink-0">
          <div className="flex items-center gap-3 truncate">
            {material.type === 'study_pdf' && <FileText className="w-5 h-5 text-blue-400 shrink-0" />}
            {material.type === 'course_syllabus' && <BookMarked className="w-5 h-5 text-amber-400 shrink-0" />}
            {material.type === 'practical_manual' && <FlaskConical className="w-5 h-5 text-emerald-400 shrink-0" />}
            {material.type === 'diagram' && <ImageIcon className="w-5 h-5 text-purple-400 shrink-0" />}

            <div className="truncate">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-neutral-100 truncate">
                  {material.title}
                </h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-neutral-300 bg-neutral-800 border border-neutral-700 px-1.5 py-0.5 rounded shrink-0 uppercase">
                  {material.file_extension}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-400 truncate mt-0.5">
                <span className="font-mono text-indigo-400 font-semibold">{subject?.code}</span>
                <span aria-hidden="true">·</span>
                <span>{subject?.name}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {formatFileSize(material.file_size)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Open Fullscreen / Separate Tab */}
            {activeDocUrl && (
              <button
                onClick={handleOpenFullscreen}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-800 bg-neutral-800/80 text-neutral-300 hover:text-white hover:bg-neutral-700 text-xs font-medium transition-colors"
                title="Open file in a new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Tab</span>
              </button>
            )}

            {/* Toggle Gemini Study Assistant Drawer */}
            <button
              onClick={() => setShowAssistant(!showAssistant)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                showAssistant
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                  : 'bg-neutral-800 text-indigo-300 border-neutral-700 hover:bg-neutral-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Gemini Study AI</span>
            </button>

            {/* Favorite Star */}
            <button
              onClick={(e) => onToggleStar(material.id, e)}
              className={`p-2 rounded-lg border border-neutral-800 hover:bg-neutral-800 transition-colors ${
                material.is_starred ? 'text-amber-400' : 'text-neutral-400 hover:text-white'
              }`}
              title="Toggle Favorite"
            >
              <Star className={`w-4 h-4 ${material.is_starred ? 'fill-amber-400' : ''}`} />
            </button>

            {/* Download */}
            <button
              onClick={handleDownload}
              className="p-2 rounded-lg border border-neutral-800 bg-neutral-800/80 text-neutral-300 hover:text-white hover:bg-neutral-700 transition-colors"
              title="Download Material"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Delete (Trash icon) Option */}
            {onDeleteMaterial && (
              <button
                onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                className={`p-2 rounded-lg border transition-colors ${
                  showDeleteConfirm
                    ? 'border-red-600 bg-red-950/70 text-red-300'
                    : 'border-neutral-800 bg-neutral-800/80 text-neutral-400 hover:text-red-400 hover:bg-neutral-700'
                }`}
                title="Delete Material"
                aria-label="Delete Material"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg border border-neutral-800 bg-neutral-800/80 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
              title="Close Viewer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Delete Confirmation Alert Banner */}
        {showDeleteConfirm && (
          <div className="px-5 py-3 bg-red-950/80 border-b border-red-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-red-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>
                Permanently delete <strong>"{material.title}"</strong> from Google Drive and storage?
              </span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSelf}
                disabled={isDeleting}
                className="flex items-center gap-1.5 px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors disabled:opacity-50"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Delete</span>
              </button>
            </div>
          </div>
        )}

        {/* Content Body: Split Layout */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Main Viewer Pane */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* DIRECT MOBILE/DEVICE PDF VIEWER LAUNCHER */}
            {isPdf ? (
              <div className="space-y-4">
                <div className="p-8 sm:p-10 rounded-2xl bg-neutral-900/80 border border-neutral-800 text-center space-y-4 shadow-sm">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-neutral-100">{material.title}</h3>
                    <p className="text-xs text-neutral-400 font-mono">
                      {material.file_name} · {formatFileSize(material.file_size)}
                    </p>
                  </div>
                  <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
                    This document opens directly in your mobile device's default file viewer or browser for seamless, full-screen reading without in-app embedding.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      onClick={handleOpenFullscreen}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Open in Default File Viewer</span>
                    </button>
                    {material.drive_web_view_link && (
                      <a
                        href={material.drive_web_view_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors"
                      >
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 87.3 78">
                          <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                          <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
                          <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                          <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                          <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                          <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                        </svg>
                        <span>Open in Google Drive</span>
                      </a>
                    )}
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-medium transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download File</span>
                    </button>
                  </div>
                </div>

                {/* Accompanying Overview & Study Notes */}
                {material.description && (
                  <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl space-y-1.5">
                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      Study Overview & Notes
                    </span>
                    <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                      {material.description}
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            {/* 1. DIAGRAM VIEWER */}
            {material.type === 'diagram' && (
              <div className="space-y-4">
                {/* Diagram Toolbar */}
                <div className="flex items-center justify-between bg-neutral-900/90 border border-neutral-800 px-4 py-2 rounded-xl text-xs">
                  <div className="flex items-center gap-2 text-neutral-400">
                    <span className="font-medium text-neutral-200">High-Res Schematic Viewer</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums font-mono">{Math.round(zoomLevel * 100)}%</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                      className="p-1.5 rounded hover:bg-neutral-800 text-neutral-300"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
                      className="p-1.5 rounded hover:bg-neutral-800 text-neutral-300"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setZoomLevel(1)}
                      className="p-1.5 rounded hover:bg-neutral-800 text-neutral-300"
                      title="Reset Zoom"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <div className="h-4 w-px bg-neutral-800 mx-1" />
                    <button
                      onClick={() => setInvertContrast(!invertContrast)}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                        invertContrast
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'hover:bg-neutral-800 text-neutral-300'
                      }`}
                      title="Invert Contrast (AMOLED reading mode)"
                    >
                      <Contrast className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">AMOLED Invert</span>
                    </button>
                  </div>
                </div>

                {/* Diagram Canvas */}
                <div className="relative w-full rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 flex items-center justify-center min-h-[380px] p-2">
                  {material.preview_content?.diagram_url ? (
                    <div
                      className="transition-transform duration-150 ease-out max-w-full"
                      style={{
                        transform: `scale(${zoomLevel})`,
                        filter: invertContrast ? 'invert(1) hue-rotate(180deg)' : 'none',
                      }}
                    >
                      <img
                        src={material.preview_content.diagram_url}
                        alt={material.title}
                        referrerPolicy="no-referrer"
                        className="max-h-[500px] w-auto object-contain rounded-lg shadow-lg"
                      />
                    </div>
                  ) : (
                    <div className="text-center p-8 text-neutral-500">
                      <ImageIcon className="w-12 h-12 mx-auto mb-2 text-neutral-600" />
                      <span>Schematic visualization container</span>
                    </div>
                  )}
                </div>

                {/* Diagram Caption */}
                {material.preview_content?.diagram_caption && (
                  <p className="text-xs text-neutral-400 italic bg-neutral-900/50 p-3 rounded-lg border border-neutral-800/80">
                    {material.preview_content.diagram_caption}
                  </p>
                )}

                {/* Diagram Key Architectural Hotspots */}
                {material.preview_content?.diagram_labels && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                      Annotated Components & Sub-modules
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {material.preview_content.diagram_labels.map((lbl, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-lg space-y-1"
                        >
                          <span className="text-xs font-semibold text-indigo-400 font-mono">
                            {lbl.label}
                          </span>
                          <p className="text-xs text-neutral-300 leading-relaxed">
                            {lbl.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. PRACTICAL MANUAL VIEWER */}
            {material.type === 'practical_manual' && material.preview_content?.experiments && (
              <div className="space-y-5">
                {/* Experiment Tab Selector */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {material.preview_content.experiments.map((exp, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedExperimentIdx(idx)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                        selectedExperimentIdx === idx
                          ? 'bg-emerald-600 text-white font-semibold'
                          : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                      }`}
                    >
                      Exp {exp.exp_number}: {exp.title.slice(0, 24)}...
                    </button>
                  ))}
                </div>

                {/* Selected Experiment Structured View */}
                {(() => {
                  const exp = material.preview_content.experiments[selectedExperimentIdx];
                  if (!exp) return null;
                  return (
                    <div className="p-6 bg-neutral-900/70 border border-neutral-800 rounded-xl space-y-5">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-1">
                          <span>Experiment #{exp.exp_number}</span>
                          <span aria-hidden="true">·</span>
                          <span>Practical Standard Protocol</span>
                        </div>
                        <h3 className="text-lg font-bold text-neutral-100">{exp.title}</h3>
                      </div>

                      {/* Aim */}
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                          Aim of Experiment
                        </span>
                        <p className="text-xs sm:text-sm text-neutral-200 bg-neutral-950 p-3 rounded-lg border border-neutral-800/80 leading-relaxed">
                          {exp.aim}
                        </p>
                      </div>

                      {/* Apparatus Checklist */}
                      <div className="space-y-1.5">
                        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                          Apparatus & Chemicals Required
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {exp.apparatus.map((app, i) => (
                            <span
                              key={i}
                              className="text-xs px-2.5 py-1 bg-neutral-950 text-neutral-300 rounded-md border border-neutral-800 flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{app}</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Principle & Theory */}
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                          Theoretical Principle
                        </span>
                        <p className="text-xs sm:text-sm text-neutral-300 bg-neutral-950/70 p-3.5 rounded-lg border border-neutral-800 leading-relaxed">
                          {exp.theory}
                        </p>
                      </div>

                      {/* Step by step procedure */}
                      <div className="space-y-2">
                        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                          Step-by-Step Laboratory Procedure
                        </span>
                        <ol className="space-y-2">
                          {exp.procedure.map((step, sIdx) => (
                            <li
                              key={sIdx}
                              className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-lg flex items-start gap-3 text-xs sm:text-sm text-neutral-200"
                            >
                              <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 font-mono text-xs flex items-center justify-center shrink-0 mt-0.5">
                                {sIdx + 1}
                              </span>
                              <span className="leading-relaxed">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>

                      {/* Precautions */}
                      {exp.precautions && exp.precautions.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                            Safety Protocols & Precautions
                          </span>
                          <ul className="space-y-1">
                            {exp.precautions.map((p, pIdx) => (
                              <li
                                key={pIdx}
                                className="text-xs text-neutral-300 flex items-start gap-2"
                              >
                                <span className="text-amber-400">•</span>
                                <span>{p}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* 3. COURSE SYLLABUS VIEWER */}
            {material.type === 'course_syllabus' && material.preview_content?.syllabus_modules && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                  <h3 className="text-base font-semibold text-neutral-100">
                    Accredited Course Curriculum & Module Schedules
                  </h3>
                  <span className="text-xs font-mono text-amber-400">
                    {material.preview_content.syllabus_modules.reduce((a, b) => a + b.hours, 0)} Total Hours
                  </span>
                </div>

                <div className="space-y-4">
                  {material.preview_content.syllabus_modules.map((mod) => (
                    <div
                      key={mod.module_number}
                      className="p-5 bg-neutral-900/70 border border-neutral-800 rounded-xl space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-semibold text-amber-400">
                          Module {mod.module_number}
                        </span>
                        <span className="text-neutral-400 font-mono">{mod.hours} Lecture Hours</span>
                      </div>
                      <h4 className="text-base font-semibold text-neutral-100">{mod.title}</h4>

                      <div className="space-y-1">
                        <span className="text-xs font-medium text-neutral-400">Key Syllabus Topics:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {mod.topics.map((t, ti) => (
                            <span
                              key={ti}
                              className="text-xs px-2.5 py-1 bg-neutral-950 text-neutral-300 rounded border border-neutral-800"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      {mod.textbooks && mod.textbooks.length > 0 && (
                        <div className="pt-2 text-xs text-neutral-400">
                          <span className="font-medium text-neutral-300">Prescribed Reading: </span>
                          <span>{mod.textbooks.join('; ')}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. STUDY PDF & GENERIC SECTIONS VIEWER */}
            {material.preview_content?.sections && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800 text-xs text-neutral-400">
                  <span>Document Chapters & Core Principles</span>
                  {material.preview_content.pages && (
                    <span className="font-mono text-neutral-300">
                      {material.preview_content.pages} Pages in PDF
                    </span>
                  )}
                </div>

                {material.preview_content.sections.map((sec, idx) => (
                  <div
                    key={idx}
                    className="p-5 bg-neutral-900/60 border border-neutral-800 rounded-xl space-y-3"
                  >
                    <h3 className="text-base font-semibold text-neutral-100">{sec.title}</h3>
                    <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-normal">
                      {sec.content}
                    </p>

                    {sec.key_takeaways && (
                      <div className="pt-2 border-t border-neutral-800/80 space-y-1.5">
                        <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
                          Key Exam Takeaways:
                        </span>
                        <ul className="space-y-1">
                          {sec.key_takeaways.map((point, pi) => (
                            <li
                              key={pi}
                              className="text-xs text-neutral-300 flex items-start gap-2"
                            >
                              <span className="text-indigo-400">•</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Gemini AI Study Assistant Side Drawer */}
          {showAssistant && (
            <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-neutral-800 bg-neutral-950 flex flex-col h-80 lg:h-full shrink-0">
              {/* Assistant Header */}
              <div className="px-4 py-3 border-b border-neutral-800 bg-neutral-900/90 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-indigo-600/30 flex items-center justify-center text-indigo-400">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-neutral-100">Gemini Study Assistant</h3>
                    <p className="text-[11px] text-neutral-400">Grounded in this material</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowAssistant(false)}
                  className="text-neutral-500 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 1-Click Action Buttons */}
              <div className="p-3 border-b border-neutral-800/80 bg-neutral-900/40 grid grid-cols-3 gap-1.5 text-[11px]">
                <button
                  onClick={() => handleAssistantAction('summary')}
                  disabled={isLoadingAi}
                  className="px-2 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-medium text-center transition-colors truncate disabled:opacity-50"
                  title="3-Point Executive Summary"
                >
                  Summary
                </button>
                <button
                  onClick={() => handleAssistantAction('explain')}
                  disabled={isLoadingAi}
                  className="px-2 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-medium text-center transition-colors truncate disabled:opacity-50"
                  title="Explain Concepts Simply"
                >
                  Explain
                </button>
                <button
                  onClick={() => handleAssistantAction('quiz')}
                  disabled={isLoadingAi}
                  className="px-2 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-medium text-center transition-colors truncate disabled:opacity-50"
                  title="Generate Practice Exam Quiz"
                >
                  Quiz (3 MCQs)
                </button>
              </div>

              {/* Chat Conversation Scroll Area */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500 space-y-2">
                    <Sparkles className="w-8 h-8 mx-auto text-indigo-400/60" />
                    <p className="text-xs text-neutral-400">
                      Ask any question or click a study shortcut above for instant AI tutoring.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-xl text-xs space-y-1 ${
                        msg.sender === 'user'
                          ? 'bg-indigo-950/60 border border-indigo-800/60 text-indigo-100 ml-4'
                          : 'bg-neutral-900 border border-neutral-800 text-neutral-200 mr-2 leading-relaxed'
                      }`}
                    >
                      <div className="font-semibold text-[11px] text-neutral-400">
                        {msg.sender === 'user' ? 'You' : 'Gemini AI Tutor'}
                      </div>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  ))
                )}

                {isLoadingAi && (
                  <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-neutral-400 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                    <span>Gemini is generating response...</span>
                  </div>
                )}
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 border-t border-neutral-800 bg-neutral-900/80">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAssistantAction('chat');
                  }}
                  className="relative flex items-center"
                >
                  <input
                    type="text"
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    placeholder="Ask Gemini about this topic..."
                    className="w-full pl-3 pr-10 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={!userQuery.trim() || isLoadingAi}
                    className="absolute right-1.5 p-1.5 text-neutral-400 hover:text-white disabled:opacity-40"
                  >
                    <Send className="w-3.5 h-3.5 text-indigo-400" />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
