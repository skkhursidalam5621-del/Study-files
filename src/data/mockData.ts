import { Subject, StudyMaterial } from '../types';

// All dummy PDF files, mock data, and sample materials have been removed.
// Users import real resources via direct uploads or Cloud sync, backed by Google Cloud.
export const INITIAL_SUBJECTS: Subject[] = [
  {
    id: 'sub_chem101',
    name: 'Chemistry - Organic & Physical',
    code: 'CHEM-101',
    department: 'Chemical Sciences',
    semester: 1,
    description: 'Core principles of chemical bonding, thermodynamics, reaction kinetics, and organic synthesis mechanisms.',
    colorTheme: 'emerald',
    syllabusOutline: [
      'Unit I: Chemical Thermodynamics & State Functions',
      'Unit II: Reaction Kinetics, Rate Laws & Catalysis',
      'Unit III: Organic Reaction Mechanisms & Stereochemistry',
      'Unit IV: Spectroscopy & Molecular Analytical Techniques',
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: 'sub_phys102',
    name: 'Physics - Classical & Modern Mechanics',
    code: 'PHYS-102',
    department: 'Physical Sciences',
    semester: 1,
    description: 'Newtonian dynamics, oscillations, Maxwell equations, wave-particle duality, and quantum foundations.',
    colorTheme: 'blue',
    syllabusOutline: [
      'Unit I: Classical Mechanics, Kinematics & Angular Momentum',
      'Unit II: Wave Mechanics & Harmonic Oscillations',
      'Unit III: Electromagnetism & Field Theory',
      'Unit IV: Introduction to Quantum States & Modern Physics',
    ],
    created_at: new Date().toISOString(),
  },
  {
    id: 'sub_cs103',
    name: 'Computer Science - Data Structures & Algorithms',
    code: 'CS-103',
    department: 'Computer Science & Engineering',
    semester: 2,
    description: 'Algorithmic efficiency, asymptotic complexity, tree hierarchies, graph traversal, and dynamic programming.',
    colorTheme: 'cyan',
    syllabusOutline: [
      'Unit I: Linear Data Structures, Stacks & Queues',
      'Unit II: Trees, Binary Search Trees & Balanced Heaps',
      'Unit III: Graph Algorithms (BFS, DFS, Dijkstra, MST)',
      'Unit IV: Dynamic Programming & Greedy Paradigms',
    ],
    created_at: new Date().toISOString(),
  },
];

export const INITIAL_MATERIALS: StudyMaterial[] = [];
