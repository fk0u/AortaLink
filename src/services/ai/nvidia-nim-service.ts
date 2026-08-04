/**
 * AortaLink — NVIDIA NIM AI Engine Integration
 * Model: z-ai/glm-5.2
 * Base URL: https://integrate.api.nvidia.com/v1
 */

const NVIDIA_NIM_API_KEY = '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';
const NVIDIA_NIM_BASE_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL_ID = 'z-ai/glm-5.2';

export interface NvidiaNimConsultationRequest {
  patientName: string;
  clinicalContextPrompt: string;
  userQuestion?: string;
}

export async function queryNvidiaNimAi(
  request: NvidiaNimConsultationRequest,
  onChunk?: (chunk: string) => void
): Promise<string> {
  const messages = [
    {
      role: 'system',
      content: `Kamu adalah Asisten Medis AI Spesialis Penyakit Dalam (Sp.PD) AortaLink EHR. Berikan jawaban dalam Bahasa Indonesia yang sangat jelas, ramah, berbasis bukti ilmiah, dan mudah dipahami pasien. Gunakan format markdown bersih.`
    },
    {
      role: 'user',
      content: `${request.clinicalContextPrompt}\n\nPertanyaan Pasien: ${request.userQuestion || 'Berikan analisis ringkas dan panduan pencegahan medis.'}`
    }
  ];

  try {
    const response = await fetch(NVIDIA_NIM_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_NIM_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL_ID,
        messages,
        temperature: 0.7,
        top_p: 1,
        max_tokens: 4096,
        seed: 42,
        stream: Boolean(onChunk)
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`NVIDIA NIM API Error (${response.status}): ${errText}`);
    }

    if (onChunk && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split('\n').filter((l) => l.trim().startsWith('data:'));

        for (const line of lines) {
          const jsonStr = line.replace(/^data:\s*/, '').trim();
          if (jsonStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              fullText += content;
              onChunk(content);
            }
          } catch {
            // Ignore partial line parse errors
          }
        }
      }

      return fullText || 'Respons AI diterima.';
    } else {
      const data = await response.json();
      return data.choices?.[0]?.message?.content || 'Tidak ada respons dari NVIDIA NIM AI.';
    }
  } catch (error) {
    console.error('[AortaLink] NVIDIA NIM API Error:', error);
    throw error;
  }
}
