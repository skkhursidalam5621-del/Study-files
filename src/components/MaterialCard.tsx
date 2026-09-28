import React, { useState } from 'react';
import {
  FileText,
  BookMarked,
  FlaskConical,
  Image as ImageIcon,
  Star,
  Sparkles,
  ArrowUpRight,
  HardDrive,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { StudyMaterial, Subject } from '../types';
import { formatFileSize, formatDate } from '../utils/search';
import { openMaterialDirectly } from '../services/googleDrive';

interface MaterialCardProps {
  material: StudyMaterial;
  subject?: Subject;
  onSelect: (material: StudyMaterial) => void;
  onOpenAssistant: (material: StudyMaterial) => void;
  onToggleStar: (materialId: string, e: React.MouseEvent) => void;
  onDelete?: (materialId: string, e: React.MouseEvent) => void;
}

export const MaterialCard: React.FC<MaterialCardProps> = ({
  material,
  subject,
  onSelect,
  onOpenAssistant,
  onToggleStar,
  onDelete,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenDoc = (e: React.MouseEvent) => {
    e.stopPropagation();
    openMaterialDirectly(material);
  };

  const handleTriggerDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete(true);
  };

  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(material.id, e);
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete(false);
  };

  const getTypeMeta = (type: string) => {
    switch (type) {
      case 'study_pdf':
        return {
          label: 'Study PDF',
          icon: <FileText className="w-4 h-4 text-blue-400 shrink-0" />,
        };
      case 'course_syllabus':
        return {
          label: 'Course Syllabus',
          icon: <BookMarked className="w-4 h-4 text-amber-400 shrink-0" />,
        };
      case 'practical_manual':
        return {
          label: 'Practical Manual',
          icon: <FlaskConical className="w-4 h-4 text-emerald-400 shrink-0" />,
        };
      case 'diagram':
        return {
          label: 'Scientific Diagram',
          icon: <ImageIcon className="w-4 h-4 text-purple-400 shrink-0" />,
        };
      default:
        return {
          label: 'Document',
          icon: <FileText className="w-4 h-4 text-neutral-400 shrink-0" />,
        };
    }
  };

  const typeMeta = getTypeMeta(material.type);
  const isDriveSynced =
    material.source_type === 'google_drive' ||
    Boolean(material.drive_file_id);

  return (
    <div
      onClick={() => onSelect(material)}
      className="group relative flex flex-col justify-between p-4 sm:p-5 bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl transition-all duration-150 cursor-pointer shadow-sm hover:shadow-md"
    >
      <div className="space-y-3">
        {/* Unboxed Header Metadata */}
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-2 truncate">
            {typeMeta.icon}
            <span className="font-medium text-neutral-300">{typeMeta.label}</span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span className="font-mono text-neutral-400">{subject?.code || `Sem ${material.semester}`}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {isDriveSynced && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-300 bg-emerald-950/60 border border-emerald-900/50 px-1.5 py-0.5 rounded" title="Stored in Google Drive">
                <HardDrive className="w-3 h-3 text-emerald-400" />
                <span>Drive</span>
              </span>
            )}

            {/* Quick Open Directly in Default Viewer / Browser */}
            <button
              onClick={handleOpenDoc}
              className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              title="Open directly in default device viewer"
              aria-label="Open directly in default device viewer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            {/* Star Favorite Button */}
            <button
              onClick={(e) => onToggleStar(material.id, e)}
              className={`p-1 rounded hover:bg-neutral-800 transition-colors ${
                material.is_starred ? 'text-amber-400' : 'text-neutral-500 hover:text-neutral-300'
              }`}
              title={material.is_starred ? 'Remove from starred' : 'Add to starred'}
              aria-label="Toggle star"
            >
              <Star className={`w-4 h-4 ${material.is_starred ? 'fill-amber-400' : ''}`} />
            </button>

            {/* Delete / Trash Button with Inline Confirmation */}
            {onDelete && (
              confirmDelete ? (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 bg-red-950/90 border border-red-800/90 rounded px-1.5 py-0.5 text-[10px] font-semibold text-red-200"
                >
                  <span className="text-red-300">Delete?</span>
                  <button
                    onClick={handleConfirmDelete}
                    disabled={isDeleting}
                    className="hover:text-white underline font-bold px-1"
                  >
                    {isDeleting ? '...' : 'Yes'}
                  </button>
                  <span className="text-neutral-600">·</span>
                  <button
                    onClick={handleCancelDelete}
                    className="text-neutral-400 hover:text-neutral-200 px-0.5"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleTriggerDelete}
                  className="p-1 rounded text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-colors"
                  title="Delete study material"
                  aria-label="Delete study material"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )
            )}
          </div>
        </div>

        {/* Primary Title with hover underline */}
        <div>
          <h3 className="text-base font-semibold text-neutral-100 group-hover:text-indigo-300 transition-colors line-clamp-2">
            {material.title}
          </h3>
          {material.description && (
            <p className="mt-1.5 text-xs text-neutral-400 line-clamp-2 leading-relaxed">
              {material.description}
            </p>
          )}
        </div>

        {/* Thumbnail Preview for Diagrams */}
        {material.type === 'diagram' && material.preview_content?.diagram_url && (
          <div className="relative w-full h-32 rounded-lg overflow-hidden bg-neutral-950 border border-neutral-800/80">
            <img
              src={material.preview_content.diagram_url}
              alt={material.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2.5">
              <span className="text-[11px] text-neutral-300 truncate">
                Interactive schematic & labels
              </span>
            </div>
          </div>
        )}

        {/* Practical Experiment count or PDF Pages info */}
        {material.type === 'practical_manual' && material.preview_content?.experiments && (
          <div className="text-xs text-neutral-400 bg-neutral-950/60 p-2.5 rounded-lg border border-neutral-800/60">
            <span className="text-emerald-400 font-medium font-mono">
              {material.preview_content.experiments.length} Experiments
            </span>
            <span className="text-neutral-500 ml-1.5">
              · Aim, Apparatus, Procedure & Precautions
            </span>
          </div>
        )}

        {material.type === 'course_syllabus' && material.preview_content?.syllabus_modules && (
          <div className="text-xs text-neutral-400 bg-neutral-950/60 p-2.5 rounded-lg border border-neutral-800/60">
            <span className="text-amber-400 font-medium font-mono">
              {material.preview_content.syllabus_modules.length} Core Modules
            </span>
            <span className="text-neutral-500 ml-1.5">
              · Lecture schedules & Textbooks
            </span>
          </div>
        )}

        {/* Topics unboxed tags list */}
        {material.topics && material.topics.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-neutral-400">
            {material.topics.slice(0, 3).map((topic, i) => (
              <span key={i} className="text-neutral-400">
                #{topic}
              </span>
            ))}
            {material.topics.length > 3 && (
              <span className="text-neutral-500">+{material.topics.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* Card Footer Details */}
      <div className="mt-4 pt-3 border-t border-neutral-800/70 flex items-center justify-between text-xs text-neutral-500">
        <div className="flex items-center gap-2 tabular-nums">
          <span>{formatFileSize(material.file_size)}</span>
          <span aria-hidden="true">·</span>
          <span>{formatDate(material.created_at)}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick AI Assistant Trigger */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenAssistant(material);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-800/40 transition-colors"
            title="Open Gemini Study Assistant"
          >
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span className="text-[11px] font-medium">Study AI</span>
          </button>

          <span className="p-1 text-neutral-400 group-hover:text-white transition-colors">
            <ArrowUpRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
};
