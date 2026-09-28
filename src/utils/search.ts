import { StudyMaterial, Subject, FilterOptions } from '../types';

export interface SearchResult {
  material: StudyMaterial;
  subject?: Subject;
  relevanceScore: number;
  matchedFields: string[];
}

export function filterAndSearchMaterials(
  materials: StudyMaterial[],
  subjects: Subject[],
  options: FilterOptions
): SearchResult[] {
  const subjectMap = new Map<string, Subject>();
  subjects.forEach(s => subjectMap.set(s.id, s));

  const query = options.searchQuery.trim().toLowerCase();
  const queryTokens = query.split(/\s+/).filter(Boolean);

  const results: SearchResult[] = [];

  for (const material of materials) {
    const subject = subjectMap.get(material.subject_id);

    // 1. Facet Filtering
    if (options.selectedSubjectId !== 'all' && material.subject_id !== options.selectedSubjectId) {
      continue;
    }

    if (options.selectedType !== 'all' && material.type !== options.selectedType) {
      continue;
    }

    if (options.selectedSemester !== 'all' && material.semester !== options.selectedSemester) {
      continue;
    }

    if (options.onlyStarred && !material.is_starred) {
      continue;
    }

    // 2. Query Matching & Scoring
    let score = 0;
    const matchedFields: string[] = [];

    if (queryTokens.length === 0) {
      // No query: baseline score with recency/views weighting
      score = 10 + (material.is_starred ? 5 : 0) + Math.min(material.views_count / 100, 5);
      results.push({ material, subject, relevanceScore: score, matchedFields });
      continue;
    }

    const titleLower = material.title.toLowerCase();
    const fileNameLower = material.file_name.toLowerCase();
    const descLower = (material.description || '').toLowerCase();
    const authorLower = (material.author_or_instructor || '').toLowerCase();
    const subjectNameLower = (subject?.name || '').toLowerCase();
    const subjectCodeLower = (subject?.code || '').toLowerCase();
    const topicsLower = material.topics.map(t => t.toLowerCase());
    const typeLabel = getTypeSearchKeywords(material.type);

    let allTokensMatched = true;

    for (const token of queryTokens) {
      let tokenMatched = false;

      // Exact title match
      if (titleLower.includes(token)) {
        score += titleLower.startsWith(token) ? 60 : 30;
        tokenMatched = true;
        if (!matchedFields.includes('Title')) matchedFields.push('Title');
      }

      // Topics keywords
      const topicHit = topicsLower.some(t => t.includes(token));
      if (topicHit) {
        score += 40;
        tokenMatched = true;
        if (!matchedFields.includes('Topic')) matchedFields.push('Topic');
      }

      // Subject code (e.g. cs401, cs-401, bio)
      const cleanToken = token.replace(/[^a-z0-9]/g, '');
      const cleanCode = subjectCodeLower.replace(/[^a-z0-9]/g, '');
      if (cleanCode.includes(cleanToken) || subjectCodeLower.includes(token)) {
        score += 50;
        tokenMatched = true;
        if (!matchedFields.includes('Subject Code')) matchedFields.push('Subject Code');
      }

      // Subject name
      if (subjectNameLower.includes(token)) {
        score += 25;
        tokenMatched = true;
        if (!matchedFields.includes('Subject')) matchedFields.push('Subject');
      }

      // File name / extension
      if (fileNameLower.includes(token)) {
        score += 20;
        tokenMatched = true;
        if (!matchedFields.includes('File Name')) matchedFields.push('File Name');
      }

      // Material type alias (e.g. 'pdf', 'notes', 'syllabus', 'manual', 'diagram')
      if (typeLabel.some(kw => kw.includes(token))) {
        score += 35;
        tokenMatched = true;
        if (!matchedFields.includes('Category')) matchedFields.push('Category');
      }

      // Author or instructor
      if (authorLower.includes(token)) {
        score += 15;
        tokenMatched = true;
        if (!matchedFields.includes('Instructor')) matchedFields.push('Instructor');
      }

      // Description text
      if (descLower.includes(token)) {
        score += 10;
        tokenMatched = true;
        if (!matchedFields.includes('Description')) matchedFields.push('Description');
      }

      // Deep preview sections
      if (material.preview_content?.sections) {
        for (const sec of material.preview_content.sections) {
          if (sec.title.toLowerCase().includes(token) || sec.content.toLowerCase().includes(token)) {
            score += 15;
            tokenMatched = true;
            if (!matchedFields.includes('Content')) matchedFields.push('Content');
            break;
          }
        }
      }

      if (!tokenMatched) {
        allTokensMatched = false;
        break;
      }
    }

    if (allTokensMatched && score > 0) {
      if (material.is_starred) score += 5;
      results.push({ material, subject, relevanceScore: score, matchedFields });
    }
  }

  // 3. Sorting
  results.sort((a, b) => {
    if (options.sortBy === 'recent') {
      return new Date(b.material.created_at).getTime() - new Date(a.material.created_at).getTime();
    }
    if (options.sortBy === 'title') {
      return a.material.title.localeCompare(b.material.title);
    }
    if (options.sortBy === 'views') {
      return b.material.views_count - a.material.views_count;
    }
    if (options.sortBy === 'size') {
      return b.material.file_size - a.material.file_size;
    }
    // Default: relevance score first
    return b.relevanceScore - a.relevanceScore;
  });

  return results;
}

function getTypeSearchKeywords(type: string): string[] {
  switch (type) {
    case 'study_pdf':
      return ['pdf', 'notes', 'lecture', 'slides', 'study', 'textbook', 'chapter', 'theory'];
    case 'course_syllabus':
      return ['syllabus', 'syllabi', 'curriculum', 'course', 'outline', 'modules', 'credits'];
    case 'practical_manual':
      return ['practical', 'manual', 'lab', 'experiment', 'procedure', 'viva', 'apparatus'];
    case 'diagram':
      return ['diagram', 'figure', 'image', 'schematic', 'blueprint', 'chart', 'illustration'];
    default:
      return [];
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}
