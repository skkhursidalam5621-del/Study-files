export interface StudyAssistantRequest {
  action: 'summary' | 'explain' | 'quiz' | 'chat';
  materialTitle: string;
  materialType: string;
  subjectName: string;
  content: string;
  query?: string;
}

export interface StudyAssistantResponse {
  success: boolean;
  text?: string;
  error?: string;
}

export async function askGeminiStudyAssistant(
  request: StudyAssistantRequest
): Promise<StudyAssistantResponse> {
  try {
    const response = await fetch('/api/gemini/study-assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Server responded with status ${response.status}`,
      };
    }

    return {
      success: true,
      text: data.text,
    };
  } catch (error: any) {
    console.error('askGeminiStudyAssistant client error:', error);
    return {
      success: false,
      error: error?.message || 'Network error reaching Gemini AI service.',
    };
  }
}
