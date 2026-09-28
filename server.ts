import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getPort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const parsed = parseInt(process.argv[portArgIndex + 1], 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (process.env.DEFAULT_APP_PORT) {
    const parsed = parseInt(process.env.DEFAULT_APP_PORT, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (process.env.PORT) {
    const parsed = parseInt(process.env.PORT, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 3000;
}

const app = express();
const PORT = getPort();

app.use(express.json({ limit: '25mb' }));

// Initialize Gemini SDK with User-Agent header as required
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Gemini Study Assistant Endpoint
app.post('/api/gemini/study-assistant', async (req, res) => {
  try {
    const { action, materialTitle, materialType, subjectName, content, query } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server environment. Please configure it in Settings > Secrets.',
      });
    }

    const typeLabel =
      materialType === 'study_pdf'
        ? 'Study Notes / Lecture PDF'
        : materialType === 'course_syllabus'
        ? 'Official Course Curriculum & Syllabus'
        : materialType === 'practical_manual'
        ? 'Laboratory Practical Manual'
        : 'Scientific Diagram & Technical Schematic';

    let userPrompt = '';
    const systemInstruction = `You are AcademiaVault AI, an academic tutor and study assistant. You specialize in college, university, and graduate curricula. Provide clear, precise, and highly educational answers. Use clean formatting with markdown headings, concise bullet points, and highlight critical formulas or terminology where appropriate.`;

    if (action === 'summary') {
      userPrompt = `Please generate an academic executive summary for this study resource:

Subject: ${subjectName || 'General Academic'}
Material Title: ${materialTitle || 'Study Document'}
Material Type: ${typeLabel}

Resource Content / Context:
"""
${content || 'No text content provided.'}
"""

Structure your response with:
1. Core Thesis / Purpose (2-3 concise sentences)
2. High-Yield Concepts & Formulas (bulleted with bold terms)
3. Exam Focus Points (what professors frequently test on)`;
    } else if (action === 'explain') {
      userPrompt = `Please explain the key scientific or algorithmic principles in this study resource using intuitive analogies and step-by-step reasoning:

Subject: ${subjectName}
Material Title: ${materialTitle}
Material Type: ${typeLabel}

Resource Context:
"""
${content}
"""

${query ? `Student's Specific Area to Clarify: "${query}"` : 'Break down the most challenging concepts into intuitive, easy-to-digest steps with an intuitive real-world analogy.'}`;
    } else if (action === 'quiz') {
      userPrompt = `Create a high-yield practice quiz based on this study resource:

Subject: ${subjectName}
Title: ${materialTitle}

Resource Content:
"""
${content}
"""

Generate 3 challenging multiple-choice practice questions suitable for midterm/final exam prep.
For each question, format as:
- **Question [Number]**: [Clear prompt]
  - A) [Option A]
  - B) [Option B]
  - C) [Option C]
  - D) [Option D]
- **Correct Answer**: [Letter and summary]
- **Explanation**: [1-2 sentences explaining why it is correct and why other choices are distractors]`;
    } else {
      // General Question / Chat
      userPrompt = `Academic Context:
Subject: ${subjectName}
Document: ${materialTitle} (${typeLabel})

Content:
"""
${content}
"""

Student's Question:
"${query || 'Summarize this document'}"

Provide an accurate, educational, and thorough explanation based on the material.`;
    }

    let response;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature: 0.6,
        },
      });
    } catch (primaryError: any) {
      console.warn('Primary model gemini-3.8-flash encountered error, attempting fallback to gemini-3.1-flash-lite:', primaryError?.message);
      // Fallback to flash-lite if 503 or transient spike
      response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature: 0.6,
        },
      });
    }

    return res.json({
      text: response.text || 'No response generated from the model.',
    });
  } catch (error: any) {
    console.error('Server error in /api/gemini/study-assistant:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to communicate with Gemini API.',
    });
  }
});

// Storage file cache
const academicFileStore = new Map<string, { buffer: Buffer; contentType: string; fileName: string }>();

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    googleDriveConfigured: true,
    timestamp: new Date().toISOString(),
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // In dev mode: mount Vite middlewares
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In prod: serve built files
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AcademiaVault Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
