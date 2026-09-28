import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BookOpen } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { MaterialCard } from './components/MaterialCard';
import { SubjectFolderList } from './components/SubjectFolderList';
import { SubjectFolderView } from './components/SubjectFolderView';
import { MaterialViewerModal } from './components/MaterialViewerModal';
import { UploadModal } from './components/UploadModal';
import { SubjectModal } from './components/SubjectModal';
import { GoogleDriveModal } from './components/GoogleDriveModal';
import { SubmissionDashboard } from './components/SubmissionDashboard';
import { MobileNav } from './components/MobileNav';

import { Subject, StudyMaterial, FilterOptions, ThemeMode } from './types';
import { INITIAL_SUBJECTS, INITIAL_MATERIALS } from './data/mockData';
import { filterAndSearchMaterials } from './utils/search';
import {
  getStoredGoogleDriveConfig,
  getAccessToken,
  initAuth,
  listFilesFromGoogleDrive,
  deleteMaterialFromGoogleDrive,
  openMaterialDirectly,
} from './services/googleDrive';

const LOCAL_STORAGE_SUBJECTS = 'acad_subjects_cache_v2';
const LOCAL_STORAGE_MATERIALS = 'acad_materials_cache_v2';
const LOCAL_STORAGE_THEME = 'acad_theme_preference';

// Ensure any old legacy mock IDs are completely purged
const LEGACY_MOCK_IDS = new Set([
  'sub_cs401', 'sub_bio202', 'sub_chem301', 'sub_cs202',
  'mat_cs401_nn', 'mat_cs401_syl', 'mat_bio202_prac', 'mat_chem301_syl',
  'mat_chem301_diag', 'mat_cs202_prac',
]);

const isLegacyMock = (id: string) => {
  return LEGACY_MOCK_IDS.has(id) || id.startsWith('mat_cs401') || id.startsWith('mat_bio202') || id.startsWith('mat_chem301') || id.startsWith('mat_cs202');
};

export default function App() {
  // 1. Theme State (AMOLED Dark Mode by default)
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_THEME);
    return saved === 'light' ? 'light' : 'amoled';
  });

  // Apply theme class to HTML root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'amoled') {
      root.classList.add('dark', 'theme-amoled');
      root.classList.remove('theme-light');
      document.body.style.backgroundColor = '#000000';
    } else {
      root.classList.remove('dark', 'theme-amoled');
      root.classList.add('theme-light');
      document.body.style.backgroundColor = '#f8fafc';
    }
    localStorage.setItem(LOCAL_STORAGE_THEME, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'amoled' ? 'light' : 'amoled'));
  };

  // 2. Data State (Subjects & Study Materials)
  const [subjects, setSubjects] = useState<Subject[]>(() => {
    // Purge any old cache key that contained dummy data
    try {
      const oldCached = localStorage.getItem('acad_subjects_cache');
      if (oldCached) {
        localStorage.removeItem('acad_subjects_cache');
      }
    } catch {}

    const cached = localStorage.getItem(LOCAL_STORAGE_SUBJECTS);
    if (cached) {
      try {
        const parsed: Subject[] = JSON.parse(cached);
        const valid = parsed.filter((s) => !isLegacyMock(s.id));
        return valid.length > 0 ? valid : INITIAL_SUBJECTS;
      } catch {
        return INITIAL_SUBJECTS;
      }
    }
    return INITIAL_SUBJECTS;
  });

  const [materials, setMaterials] = useState<StudyMaterial[]>(() => {
    // Purge any old cache key that contained dummy data
    try {
      const oldCached = localStorage.getItem('acad_materials_cache');
      if (oldCached) {
        localStorage.removeItem('acad_materials_cache');
      }
    } catch {}

    const cached = localStorage.getItem(LOCAL_STORAGE_MATERIALS);
    if (cached) {
      try {
        const parsed: StudyMaterial[] = JSON.parse(cached);
        return parsed.filter((m) => !isLegacyMock(m.id));
      } catch {
        return INITIAL_MATERIALS;
      }
    }
    return INITIAL_MATERIALS;
  });

  // Persist local cache
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_SUBJECTS, JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_MATERIALS, JSON.stringify(materials));
  }, [materials]);

  // 3. Google Drive Storage & OAuth 2.0 State
  const [googleDriveConfig, setGoogleDriveConfig] = useState(getStoredGoogleDriveConfig);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  const refreshGoogleDriveConfig = () => {
    const updated = getStoredGoogleDriveConfig();
    setGoogleDriveConfig(updated);
  };

  // Auth state listener on app load
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, _token) => {
        setGoogleDriveConfig((prev) => ({
          ...prev,
          isConnected: true,
          userEmail: user.email || prev.userEmail,
          userName: user.displayName || prev.userName,
          userPhoto: user.photoURL || prev.userPhoto,
        }));
      },
      () => {
        // Not authenticated
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Synchronize files with Google Drive AcademiaVault folder
  const handleSyncWithGoogleDrive = async () => {
    const token = await getAccessToken();
    if (!token) {
      setShowGoogleDriveModal(true);
      return;
    }

    setIsSyncing(true);
    setSyncStatusMsg('Connecting to Google Drive and scanning files...');

    try {
      const driveFiles = await listFilesFromGoogleDrive(token);
      if (driveFiles && driveFiles.length > 0) {
        setMaterials((prev) => {
          const existingDriveIds = new Set(prev.map((m) => m.drive_file_id).filter(Boolean));
          const newFromDrive: StudyMaterial[] = [];

          for (const f of driveFiles) {
            if (!existingDriveIds.has(f.id)) {
              const fileExt = f.name.split('.').pop()?.toLowerCase() || 'pdf';
              const subjectId = f.properties?.subjectId || subjects[0]?.id || 'sub_general';
              const isImg = f.mimeType?.startsWith('image/');

              newFromDrive.push({
                id: `mat_drive_${f.id}`,
                subject_id: subjectId,
                title: f.name.replace(/\.[^/.]+$/, ''),
                type: (f.properties?.materialType as any) || (isImg ? 'diagram' : 'study_pdf'),
                source_type: 'google_drive',
                file_name: f.name,
                file_path: `gdrive://${f.id}/${f.name}`,
                file_size: f.size || 1024,
                file_extension: fileExt,
                mime_type: f.mimeType,
                topics: [f.name.toLowerCase()],
                description: f.description || `Retrieved from Google Drive (${f.name})`,
                author_or_instructor: googleDriveConfig.userName || 'Google Drive',
                semester: 1,
                is_starred: false,
                views_count: 0,
                download_url: f.webContentLink || f.webViewLink,
                drive_file_id: f.id,
                drive_web_view_link: f.webViewLink,
                drive_download_link: f.webContentLink,
                preview_content: {
                  diagram_url: isImg ? f.webViewLink : undefined,
                  sections: [
                    {
                      title: 'Overview',
                      content: `Document: ${f.name}. Retrieved directly from your Google Drive AcademiaVault storage folder.`,
                      key_takeaways: ['Stored in Google Drive'],
                    },
                  ],
                },
                created_at: f.createdTime || new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });
            }
          }

          return [...newFromDrive, ...prev];
        });

        setSyncStatusMsg(`Synchronized with Google Drive (${driveFiles.length} file(s) indexed)!`);
      } else {
        setSyncStatusMsg('Google Drive folder is connected and ready. No existing files found.');
      }
      setTimeout(() => setSyncStatusMsg(null), 3500);
    } catch (err: any) {
      setSyncStatusMsg(`Drive Sync Notice: ${err?.message || 'Check connection'}`);
      setTimeout(() => setSyncStatusMsg(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  // 4. Navigation & Views
  const [activeView, setActiveView] = useState<'materials' | 'subjects' | 'starred' | 'submit'>('materials');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  // 5. Search & Filters
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    searchQuery: '',
    selectedSubjectId: 'all',
    selectedType: 'all',
    selectedSemester: 'all',
    onlyStarred: false,
    sortBy: 'recent',
  });

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const handleFocusSearch = () => {
    setActiveView('materials');
    setSelectedSubjectId(null);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  };

  // Global keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        handleFocusSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleUpdateFilterOptions = (updated: Partial<FilterOptions>) => {
    setFilterOptions((prev) => ({ ...prev, ...updated }));
  };

  // Computed Search Results
  const effectiveFilterOptions: FilterOptions = useMemo(() => {
    return {
      ...filterOptions,
      onlyStarred: activeView === 'starred' ? true : filterOptions.onlyStarred,
    };
  }, [filterOptions, activeView]);

  const searchResults = useMemo(() => {
    return filterAndSearchMaterials(materials, subjects, effectiveFilterOptions);
  }, [materials, subjects, effectiveFilterOptions]);

  // 6. Modals
  const [selectedMaterial, setSelectedMaterial] = useState<StudyMaterial | null>(null);
  const [initialOpenAssistant, setInitialOpenAssistant] = useState(false);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadSubjectId, setUploadSubjectId] = useState<string | undefined>(undefined);

  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showGoogleDriveModal, setShowGoogleDriveModal] = useState(false);

  // Star Toggle Handler
  const handleToggleStar = (materialId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMaterials((prev) =>
      prev.map((m) => (m.id === materialId ? { ...m, is_starred: !m.is_starred } : m))
    );
  };

  // Open Material Directly in mobile device default viewer / browser
  const handleOpenMaterial = (material: StudyMaterial) => {
    // Increment view count
    setMaterials((prev) =>
      prev.map((m) => (m.id === material.id ? { ...m, views_count: m.views_count + 1 } : m))
    );
    // Direct open in default viewer / browser without internal embedding
    openMaterialDirectly(material);
  };

  const handleOpenWithAssistant = (material: StudyMaterial) => {
    setSelectedMaterial(material);
    setInitialOpenAssistant(true);
  };

  const handleUploadCreated = (newMaterial: StudyMaterial) => {
    setMaterials((prev) => [newMaterial, ...prev]);
  };

  const handleMaterialDeleted = async (materialId: string) => {
    const targetMat = materials.find((m) => m.id === materialId);
    setMaterials((prev) => prev.filter((m) => m.id !== materialId));
    if (selectedMaterial?.id === materialId) {
      setSelectedMaterial(null);
    }
    const token = await getAccessToken();
    await deleteMaterialFromGoogleDrive(materialId, token || undefined);
    setSyncStatusMsg(`Deleted "${targetMat?.title || 'Material'}"`);
    setTimeout(() => setSyncStatusMsg(null), 3000);
  };

  const handleSubjectCreated = (newSubject: Subject) => {
    setSubjects((prev) => [...prev, newSubject]);
  };

  // Selected Subject details for single folder drilldown
  const activeSubject = useMemo(() => {
    if (!selectedSubjectId) return null;
    return subjects.find((s) => s.id === selectedSubjectId) || null;
  }, [selectedSubjectId, subjects]);

  const activeSubjectMaterials = useMemo(() => {
    if (!selectedSubjectId) return [];
    return materials.filter((m) => m.subject_id === selectedSubjectId);
  }, [selectedSubjectId, materials]);

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        theme === 'amoled'
          ? 'bg-black text-neutral-100'
          : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Top Bar Contract (Wordmark, Nav links, Primary Actions) */}
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        activeView={activeView}
        onSelectView={(view) => {
          setActiveView(view);
          setSelectedSubjectId(null);
        }}
        onOpenUpload={() => {
          setUploadSubjectId(undefined);
          setShowUploadModal(true);
        }}
        onOpenGoogleDrive={() => setShowGoogleDriveModal(true)}
        googleDriveConnected={googleDriveConfig.isConnected}
        userEmail={googleDriveConfig.userEmail}
        onFocusSearch={handleFocusSearch}
      />

      {/* Sync Status Banner */}
      {syncStatusMsg && (
        <div className="bg-indigo-950/80 border-b border-indigo-800/80 py-2 px-4 text-center text-xs text-indigo-200">
          <span>{syncStatusMsg}</span>
        </div>
      )}

      {/* Main Container Layout */}
      <main className="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6 sm:py-8 pb-24 md:pb-10">
        {/* VIEW 1: Single Subject Folder View */}
        {selectedSubjectId && activeSubject ? (
          <SubjectFolderView
            subject={activeSubject}
            materials={activeSubjectMaterials}
            onBack={() => setSelectedSubjectId(null)}
            onSelectMaterial={handleOpenMaterial}
            onOpenAssistant={handleOpenWithAssistant}
            onToggleStar={handleToggleStar}
            onDeleteMaterial={handleMaterialDeleted}
            onUploadForSubject={(subId) => {
              setUploadSubjectId(subId);
              setShowUploadModal(true);
            }}
          />
        ) : activeView === 'subjects' ? (
          /* VIEW 2: Subject Folders Directory */
          <SubjectFolderList
            subjects={subjects}
            materials={materials}
            onSelectSubject={(subId) => setSelectedSubjectId(subId)}
            onOpenCreateSubject={() => setShowSubjectModal(true)}
          />
        ) : activeView === 'submit' ? (
          /* VIEW 3: Clean Manual Submission & Google Drive Sync Dashboard */
          <SubmissionDashboard
            subjects={subjects}
            materials={materials}
            onMaterialCreated={handleUploadCreated}
            onMaterialDeleted={handleMaterialDeleted}
            onOpenCreateSubject={() => setShowSubjectModal(true)}
            onOpenViewer={handleOpenMaterial}
            onOpenGoogleDriveConfig={() => setShowGoogleDriveModal(true)}
            googleDriveConnected={googleDriveConfig.isConnected}
          />
        ) : (
          /* VIEW 4: All Materials / Starred View with Smart Search */
          <div className="space-y-6">
            {/* Search and Facet Filtering Deck */}
            <SearchBar
              options={effectiveFilterOptions}
              onChangeOptions={handleUpdateFilterOptions}
              subjects={subjects}
              totalResults={searchResults.length}
              totalMaterials={materials.length}
              searchInputRef={searchInputRef}
            />

            {/* Empty Search State */}
            {searchResults.length === 0 ? (
              <div className="p-12 text-center bg-neutral-900/40 border border-neutral-800 rounded-2xl space-y-4">
                <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
                  <BookOpen className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-neutral-200">
                    {materials.length === 0 ? 'No Study Materials In Vault Yet' : 'No materials matched your search criteria'}
                  </h3>
                  <p className="text-xs text-neutral-400 max-w-md mx-auto mt-1 leading-relaxed">
                    {materials.length === 0
                      ? 'Upload your first PDF document, course syllabus, practical lab manual, or diagram directly from your device and store it in your Google Drive.'
                      : 'Try adjusting your keywords, subject filters, or clearing the sub-category filter.'}
                  </p>
                </div>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  {materials.length === 0 ? (
                    <>
                      <button
                        onClick={() => setActiveView('submit')}
                        className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors shadow-sm"
                      >
                        Open Upload Dashboard
                      </button>
                      <button
                        onClick={() => setShowSubjectModal(true)}
                        className="px-4 py-2 text-xs font-semibold text-neutral-300 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-colors"
                      >
                        Create Subject Folder
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() =>
                        setFilterOptions({
                          searchQuery: '',
                          selectedSubjectId: 'all',
                          selectedType: 'all',
                          selectedSemester: 'all',
                          onlyStarred: false,
                          sortBy: 'recent',
                        })
                      }
                      className="px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors"
                    >
                      Clear All Filters
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Grid of Academic Material Cards */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
                {searchResults.map((res) => (
                  <MaterialCard
                    key={res.material.id}
                    material={res.material}
                    subject={res.subject}
                    onSelect={handleOpenMaterial}
                    onOpenAssistant={handleOpenWithAssistant}
                    onToggleStar={handleToggleStar}
                    onDelete={handleMaterialDeleted}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mobile Bottom Thumb Navigation */}
      <MobileNav
        activeView={activeView}
        onSelectView={(view) => {
          setActiveView(view);
          setSelectedSubjectId(null);
        }}
        onOpenUpload={() => {
          setUploadSubjectId(undefined);
          setShowUploadModal(true);
        }}
        onFocusSearch={handleFocusSearch}
      />

      {/* Modal 1: Comprehensive Material Viewer & Gemini Study Assistant */}
      {selectedMaterial && (
        <MaterialViewerModal
          material={selectedMaterial}
          subject={subjects.find((s) => s.id === selectedMaterial.subject_id)}
          onClose={() => setSelectedMaterial(null)}
          onToggleStar={handleToggleStar}
          onDeleteMaterial={handleMaterialDeleted}
          initialOpenAssistant={initialOpenAssistant}
        />
      )}

      {/* Modal 2: Upload Material Modal */}
      {showUploadModal && (
        <UploadModal
          subjects={subjects}
          defaultSubjectId={uploadSubjectId}
          onClose={() => setShowUploadModal(false)}
          onMaterialCreated={handleUploadCreated}
          onOpenCreateSubject={() => {
            setShowUploadModal(false);
            setShowSubjectModal(true);
          }}
          googleDriveConnected={googleDriveConfig.isConnected}
          onOpenGoogleDrive={() => {
            setShowUploadModal(false);
            setShowGoogleDriveModal(true);
          }}
        />
      )}

      {/* Modal 3: Create Subject Folder Modal */}
      {showSubjectModal && (
        <SubjectModal
          onClose={() => setShowSubjectModal(false)}
          onSubjectCreated={handleSubjectCreated}
          googleDriveConnected={googleDriveConfig.isConnected}
        />
      )}

      {/* Modal 4: Google Drive Storage & OAuth 2.0 Connection Manager */}
      {showGoogleDriveModal && (
        <GoogleDriveModal
          onClose={() => setShowGoogleDriveModal(false)}
          onConfigUpdated={refreshGoogleDriveConfig}
          onSyncWithDrive={handleSyncWithGoogleDrive}
          isSyncing={isSyncing}
        />
      )}

      {/* Vercel Web Analytics */}
      <Analytics />
    </div>
  );
}
