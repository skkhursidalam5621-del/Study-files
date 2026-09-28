import React from 'react';
import { Search, X, Filter, FileText, BookMarked, FlaskConical, Image as ImageIcon, Sparkles } from 'lucide-react';
import { FilterOptions, MaterialType, Subject } from '../types';

interface SearchBarProps {
  options: FilterOptions;
  onChangeOptions: (updated: Partial<FilterOptions>) => void;
  subjects: Subject[];
  totalResults: number;
  totalMaterials: number;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  options,
  onChangeOptions,
  subjects,
  totalResults,
  totalMaterials,
  searchInputRef,
}) => {
  const typeTabs: Array<{ id: MaterialType | 'all'; label: string; icon: React.ReactNode }> = [
    { id: 'all', label: 'All Resources', icon: <Filter className="w-3.5 h-3.5" /> },
    { id: 'study_pdf', label: 'Study PDFs', icon: <FileText className="w-3.5 h-3.5 text-blue-400" /> },
    { id: 'course_syllabus', label: 'Course Syllabi', icon: <BookMarked className="w-3.5 h-3.5 text-amber-400" /> },
    { id: 'practical_manual', label: 'Practical Manuals', icon: <FlaskConical className="w-3.5 h-3.5 text-emerald-400" /> },
    { id: 'diagram', label: 'Diagrams & Figures', icon: <ImageIcon className="w-3.5 h-3.5 text-purple-400" /> },
  ];

  return (
    <div className="w-full space-y-3">
      {/* Primary Instant Search Box */}
      <div className="relative flex items-center">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          ref={searchInputRef}
          type="text"
          value={options.searchQuery}
          onChange={(e) => onChangeOptions({ searchQuery: e.target.value })}
          placeholder="Instant search by title, topic keywords, subject code (e.g. CS-401), professor, or content..."
          className="w-full pl-10 pr-24 py-2.5 bg-neutral-900/90 dark:bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-inner"
        />
        {options.searchQuery ? (
          <button
            onClick={() => onChangeOptions({ searchQuery: '' })}
            className="absolute inset-y-0 right-14 pr-2 flex items-center text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <span className="text-[11px] font-mono text-neutral-500 bg-neutral-800/80 px-1.5 py-0.5 rounded border border-neutral-700/50">
            instant
          </span>
        </div>
      </div>

      {/* Sub-Category Filter Segmented Controls & Dropdowns */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Horizontal Type Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {typeTabs.map((tab) => {
            const isActive = options.selectedType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onChangeOptions({ selectedType: tab.id })}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-neutral-100 text-neutral-950 dark:bg-white dark:text-black font-semibold shadow-sm'
                    : 'bg-neutral-900/80 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dropdown Filters (Subject, Semester, Sort) */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 text-xs">
          {/* Subject Filter */}
          <select
            value={options.selectedSubjectId}
            onChange={(e) => onChangeOptions({ selectedSubjectId: e.target.value })}
            className="bg-neutral-900 border border-neutral-800 text-neutral-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer max-w-[130px] sm:max-w-none truncate"
          >
            <option value="all">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code}: {s.name}
              </option>
            ))}
          </select>

          {/* Semester Filter */}
          <select
            value={options.selectedSemester}
            onChange={(e) =>
              onChangeOptions({
                selectedSemester: e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10),
              })
            }
            className="bg-neutral-900 border border-neutral-800 text-neutral-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">All Semesters</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
              <option key={sem} value={sem}>
                Semester {sem}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={options.sortBy}
            onChange={(e) => onChangeOptions({ sortBy: e.target.value as any })}
            className="bg-neutral-900 border border-neutral-800 text-neutral-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="recent">Sort: Most Recent</option>
            <option value="views">Sort: Most Viewed</option>
            <option value="title">Sort: Title A-Z</option>
            <option value="size">Sort: File Size</option>
          </select>
        </div>
      </div>

      {/* Result Metrics Bar (Unboxed text with bullet separators) */}
      <div className="flex items-center justify-between text-xs text-neutral-400 pt-1">
        <div className="flex items-center gap-2">
          <span>
            Showing <strong className="text-neutral-200 tabular-nums">{totalResults}</strong> of{' '}
            <span className="tabular-nums">{totalMaterials}</span> resources
          </span>
          {options.searchQuery && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-indigo-400">
                Filter: &quot;{options.searchQuery}&quot;
              </span>
            </>
          )}
        </div>

        {options.searchQuery && (
          <button
            onClick={() => onChangeOptions({ searchQuery: '', selectedType: 'all', selectedSubjectId: 'all' })}
            className="text-neutral-400 hover:text-indigo-400 underline underline-offset-2"
          >
            Reset filters
          </button>
        )}
      </div>
    </div>
  );
};
