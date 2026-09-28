import React from 'react';
import { Folder, FileText, BookMarked, FlaskConical, Image as ImageIcon, ChevronRight, Plus } from 'lucide-react';
import { Subject, StudyMaterial } from '../types';

interface SubjectFolderListProps {
  subjects: Subject[];
  materials: StudyMaterial[];
  onSelectSubject: (subjectId: string) => void;
  onOpenCreateSubject: () => void;
}

export const SubjectFolderList: React.FC<SubjectFolderListProps> = ({
  subjects,
  materials,
  onSelectSubject,
  onOpenCreateSubject,
}) => {
  return (
    <div className="space-y-6">
      {/* Header with Title and Add Subject CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-100">
            Subject-Wise Resource Directories
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Dedicated folder hierarchies organized by academic paper, syllabus modules, and course materials.
          </p>
        </div>

        <button
          onClick={onOpenCreateSubject}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Subject Folder</span>
        </button>
      </div>

      {/* Grid of Subject Folders or Empty State */}
      {subjects.length === 0 ? (
        <div className="p-12 text-center bg-neutral-900/40 border border-neutral-800 rounded-2xl space-y-3">
          <Folder className="w-12 h-12 text-neutral-600 mx-auto mb-2" />
          <h3 className="text-base font-semibold text-neutral-200">
            No Subject Directories Created Yet
          </h3>
          <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
            Create dedicated subject folders to organize study PDFs, syllabi, practical lab manuals, and schematics by course code and semester.
          </p>
          <div className="pt-2">
            <button
              onClick={onOpenCreateSubject}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Subject Folder</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
          {subjects.map((sub) => {
            const subMaterials = materials.filter((m) => m.subject_id === sub.id);
            const pdfCount = subMaterials.filter((m) => m.type === 'study_pdf').length;
            const syllabusCount = subMaterials.filter((m) => m.type === 'course_syllabus').length;
            const manualCount = subMaterials.filter((m) => m.type === 'practical_manual').length;
            const diagramCount = subMaterials.filter((m) => m.type === 'diagram').length;

            return (
              <div
                key={sub.id}
                onClick={() => onSelectSubject(sub.id)}
                className="group p-4 sm:p-5 bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl transition-all cursor-pointer flex flex-col justify-between shadow-sm hover:shadow-md"
              >
                <div className="space-y-3">
                  {/* Header: Code & Department */}
                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                      <span className="font-mono font-semibold text-indigo-400">{sub.code}</span>
                      <span aria-hidden="true">·</span>
                      <span>Semester {sub.semester}</span>
                    </div>

                    <span className="text-neutral-500">{sub.department}</span>
                  </div>

                  {/* Subject Title */}
                  <h3 className="text-base font-semibold text-neutral-100 group-hover:text-white transition-colors">
                    {sub.name}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                    {sub.description}
                  </p>

                  {/* Syllabus Modules Outline Preview */}
                  {sub.syllabusOutline && sub.syllabusOutline.length > 0 && (
                    <div className="pt-1">
                      <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider block mb-1">
                        Curriculum Units ({sub.syllabusOutline.length})
                      </span>
                      <div className="space-y-1">
                        {sub.syllabusOutline.slice(0, 2).map((unit, idx) => (
                          <div key={idx} className="text-xs text-neutral-400 truncate flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-neutral-600" />
                            <span>{unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sub-Category Counts Summary Bar */}
                <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1" title="Study PDFs">
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      <span className="tabular-nums font-mono">{pdfCount}</span>
                    </span>
                    <span className="flex items-center gap-1" title="Course Syllabi">
                      <BookMarked className="w-3.5 h-3.5 text-amber-400" />
                      <span className="tabular-nums font-mono">{syllabusCount}</span>
                    </span>
                    <span className="flex items-center gap-1" title="Practical Manuals">
                      <FlaskConical className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="tabular-nums font-mono">{manualCount}</span>
                    </span>
                    <span className="flex items-center gap-1" title="Diagrams & Figures">
                      <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                      <span className="tabular-nums font-mono">{diagramCount}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1 font-medium text-indigo-400 group-hover:text-indigo-300 transition-colors">
                    <span>Open Folder</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
