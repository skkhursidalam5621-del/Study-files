import React, { useState } from 'react';
import { ChevronLeft, Folder, Plus, FileText, BookMarked, FlaskConical, Image as ImageIcon, Filter, BookOpen } from 'lucide-react';
import { Subject, StudyMaterial, MaterialType } from '../types';
import { MaterialCard } from './MaterialCard';

interface SubjectFolderViewProps {
  subject: Subject;
  materials: StudyMaterial[];
  onBack: () => void;
  onSelectMaterial: (material: StudyMaterial) => void;
  onOpenAssistant: (material: StudyMaterial) => void;
  onToggleStar: (materialId: string, e: React.MouseEvent) => void;
  onDeleteMaterial?: (materialId: string) => void;
  onUploadForSubject: (subjectId: string) => void;
}

export const SubjectFolderView: React.FC<SubjectFolderViewProps> = ({
  subject,
  materials,
  onBack,
  onSelectMaterial,
  onOpenAssistant,
  onToggleStar,
  onDeleteMaterial,
  onUploadForSubject,
}) => {
  const [activeTab, setActiveTab] = useState<MaterialType | 'all' | 'outline'>('all');

  const filteredMaterials = materials.filter((m) => {
    if (activeTab === 'all' || activeTab === 'outline') return true;
    return m.type === activeTab;
  });

  const pdfCount = materials.filter((m) => m.type === 'study_pdf').length;
  const syllabusCount = materials.filter((m) => m.type === 'course_syllabus').length;
  const manualCount = materials.filter((m) => m.type === 'practical_manual').length;
  const diagramCount = materials.filter((m) => m.type === 'diagram').length;

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-neutral-400">
        <button
          onClick={onBack}
          className="flex items-center gap-1 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Subject Folders</span>
        </button>
        <span aria-hidden="true">/</span>
        <span className="text-neutral-200 font-mono">{subject.code}</span>
      </div>

      {/* Subject Header Banner */}
      <div className="p-6 bg-neutral-900/80 border border-neutral-800 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <span className="font-mono font-semibold text-indigo-400">{subject.code}</span>
              <span aria-hidden="true">·</span>
              <span>Semester {subject.semester}</span>
              <span aria-hidden="true">·</span>
              <span>{subject.department}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-100">
              {subject.name}
            </h1>
            <p className="text-sm text-neutral-300 max-w-3xl leading-relaxed">
              {subject.description}
            </p>
          </div>

          <button
            onClick={() => onUploadForSubject(subject.id)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors whitespace-nowrap self-start shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Upload into {subject.code}</span>
          </button>
        </div>

        {/* Sub-Category Navigation Tabs */}
        <div className="pt-2 border-t border-neutral-800/80 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'all'
                ? 'bg-neutral-100 text-neutral-950 dark:bg-white dark:text-black font-semibold'
                : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>All Files ({materials.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('study_pdf')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'study_pdf'
                ? 'bg-neutral-100 text-neutral-950 dark:bg-white dark:text-black font-semibold'
                : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>Study PDFs ({pdfCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('course_syllabus')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'course_syllabus'
                ? 'bg-neutral-100 text-neutral-950 dark:bg-white dark:text-black font-semibold'
                : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
            }`}
          >
            <BookMarked className="w-3.5 h-3.5 text-amber-400" />
            <span>Course Syllabi ({syllabusCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('practical_manual')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'practical_manual'
                ? 'bg-neutral-100 text-neutral-950 dark:bg-white dark:text-black font-semibold'
                : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5 text-emerald-400" />
            <span>Practical Manuals ({manualCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('diagram')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'diagram'
                ? 'bg-neutral-100 text-neutral-950 dark:bg-white dark:text-black font-semibold'
                : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
            <span>Diagrams ({diagramCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('outline')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeTab === 'outline'
                ? 'bg-neutral-100 text-neutral-950 dark:bg-white dark:text-black font-semibold'
                : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>Curriculum Outline</span>
          </button>
        </div>
      </div>

      {/* Outline Tab View */}
      {activeTab === 'outline' ? (
        <div className="p-6 bg-neutral-900/60 border border-neutral-800 rounded-xl space-y-4">
          <h3 className="text-base font-semibold text-neutral-100">
            Curriculum Unit Breakdown & Core Syllabus
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {subject.syllabusOutline.map((unit, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-neutral-950/80 border border-neutral-800/80 rounded-lg flex items-start gap-3"
              >
                <span className="w-6 h-6 rounded-md bg-indigo-950 border border-indigo-800/50 text-indigo-400 font-mono text-xs flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="text-xs text-neutral-300 leading-relaxed font-medium">
                  {unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Materials Grid */
        <div className="space-y-4">
          {filteredMaterials.length === 0 ? (
            <div className="p-12 text-center bg-neutral-900/40 border border-neutral-800 rounded-xl">
              <Folder className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-neutral-300">
                No materials in this sub-category yet
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                Upload study notes, syllabi, practical lab manuals, or schematics for {subject.code}.
              </p>
              <button
                onClick={() => onUploadForSubject(subject.id)}
                className="mt-4 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors"
              >
                Upload Resource
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
              {filteredMaterials.map((mat) => (
                <MaterialCard
                  key={mat.id}
                  material={mat}
                  subject={subject}
                  onSelect={onSelectMaterial}
                  onOpenAssistant={onOpenAssistant}
                  onToggleStar={onToggleStar}
                  onDelete={onDeleteMaterial}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
