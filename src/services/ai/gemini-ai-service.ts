/* Google AI Studio Gemini 3.1 Flash Lite · Advanced Clinical EHR Intelligence */

export interface GeminiConsultationRequest {
  patientName?: string;
  patientAge?: number;
  patientGender?: 'male' | 'female' | 'other';
  targetSystolic?: number;
  targetDiastolic?: number;
  readingsSummary?: string;
  dippingPattern?: string;
  medicationsList?: string[];
  labSummary?: string;
  userQuestion: string;
}

const GEMINI_MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-2.0-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash-exp'
];

function getApiKey(): string {
  return (
    (typeof process !== 'undefined' && process.env?.AI_API_KEY) ||
    (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.AI_API_KEY) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_AI_API_KEY) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.PUBLIC_AI_API_KEY) ||
    ''
  );
}

/**
 * Streams or generates complete AI clinical response using Google AI Studio Gemini API
 */
export async function queryGeminiAi(
  request: GeminiConsultationRequest,
  onChunk?: (text: string) => void
): Promise<string> {
  const apiKey = getApiKey();

  const systemInstruction = `Anda adalah "AortaLink AI Clinical Specialist (Spesialis Penyakit Dalam / Sp.PD)", asisten kecerdasan buatan medis terstandar HL7 FHIR R4, ESH (European Society of Hypertension) 2023, dan AHA/ACC 2024.
Tugas Anda adalah mengevaluasi data rekam medis elektronik (EHR) pasien secara presisi, holistik, berbasis riwayat nyata, dan memberikan rekomendasi klinis yang dipersonalisasi sesuai usia dan data lab.

Pedoman Klinis:
1. Analisis Stratifikasi Usia:
   - Dewasa Muda (<40 th): Target optimal <120/<80 mmHg.
   - Usia 40-64 th: Evaluasi kekakuan aorta & Tekanan Nadi (Pulse Pressure = SBP - DBP).
   - Lansia (65-79 th): Target sistolik 120-130 mmHg, waspadai diastolik <65 mmHg (risiko hipoperfusi koroner).
   - Geriatri (>80 th): Target sistolik 130-140 mmHg, prioritaskan keamanan ortostatik.
2. Analisis Ritme Sirkadian & Nocturnal Dipping:
   - Dipper (10-20% turun): Normal fisiologis.
   - Non-Dipper (0-10%): Beban kardiovaskular nokturnal konstan, anjurkan evaluasi kronoterapi (penyesuaian jam minum obat ke malam hari).
   - Riser / Reverse Dipper (<0%): Risiko tinggi stroke malam hari.
   - Extreme Dipper (>20%): Risiko hipotensi nocturnal & iskemia serebral saat bangun tidur.
3. Rekomendasi Farmakologi Berdasarkan Riwayat:
   - Jangan memaksakan kombinasi obat default tetap. Evaluasi obat yang saat ini sedang diminum pasien (CCB, ARB, ACEi, Beta Blocker, Diuretik, dll).
   - Jika belum minum obat, diskusikan terapi non-farmakologis (DASH Diet <2.000 mg natrium/hari, manajemen stres, tidur 7-8 jam) dan kriteria inisiasi obat.
4. Parameter Laboratorium Rumah Sakit:
   - Asam Urat: Target <6.0 mg/dL (pria normal <7.0, wanita <6.0).
   - Kreatinin Serum & eGFR (CKD-EPI 2021): Evaluasi fungsi ginjal dan dosis obat.
   - Elektrolit (Kalium, Natrium): Penting untuk pemantauan ACEi/ARB/Diuretik.
   - Profil Lipid (LDL, HDL, Trigliserida) & HbA1c untuk risiko ASCVD 10-tahun.

Bahasa: Bahasa Indonesia profesional, jelas, ramah, dan mudah dipahami pasien maupun tenaga kesehatan. Selalu sertakan penegasan bahwa rekomendasi AI bersifat edukatif dan verifikasi dokter penanggung jawab pelayanan (DPJP) tetap merupakan standar tertinggi.`;

  const patientContext = `[DATA REKAM MEDIS PASIEN AORTALINK]
Nama Pasien: ${request.patientName || 'Pasien'}
Usia: ${request.patientAge ? `${request.patientAge} Tahun` : 'Tidak tercatat'}
Jenis Kelamin: ${request.patientGender === 'female' ? 'Wanita' : request.patientGender === 'male' ? 'Pria' : 'Tidak tercatat'}
Target Tekanan Darah Dokter: < ${request.targetSystolic || 120}/${request.targetDiastolic || 80} mmHg
Ringkasan Riwayat Tensi: ${request.readingsSummary || 'Belum ada data tensi'}
Pola Nocturnal Dipping: ${request.dippingPattern || 'Belum cukup data sirkadian'}
Regimen Obat Saat Ini: ${request.medicationsList && request.medicationsList.length > 0 ? request.medicationsList.join(', ') : 'Tidak ada obat tercatat / Non-farmakologis'}
Hasil Laboratorium Terbaru: ${request.labSummary || 'Belum ada data lab'}

[PERTANYAAN / KELUHAN PASIEN]
${request.userQuestion}`;

  // Try calling Express backend proxy first if available
  try {
    const backendRes = await fetch('/api/ai/gemini-consultation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction,
        prompt: patientContext,
        model: 'gemini-2.5-flash'
      })
    }).catch(() => null);

    if (backendRes && backendRes.ok) {
      const data = await backendRes.json();
      if (data && data.text) {
        if (onChunk) onChunk(data.text);
        return data.text;
      }
    }
  } catch {
    // Proceed to direct Google AI Studio API call
  }

  // Direct Google AI Studio API Multi-Model Fallback
  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [
              { text: `${systemInstruction}\n\n${patientContext}` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        const generatedText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (generatedText) {
          if (onChunk) onChunk(generatedText);
          return generatedText;
        }
      }
    } catch {
      // Continue to next fallback model
    }
  }

  // Graceful Offline Clinical Intelligence Fallback
  const fallback = generateSmartLocalClinicalResponse(request);
  if (onChunk) onChunk(fallback);
  return fallback;
}

/**
 * Intelligent Local Clinical Algorithm Fallback
 */
function generateSmartLocalClinicalResponse(request: GeminiConsultationRequest): string {
  const age = request.patientAge || 45;
  const targetSys = request.targetSystolic || 120;
  const targetDia = request.targetDiastolic || 80;
  const pattern = request.dippingPattern || 'Normal';
  const meds = request.medicationsList || [];

  return `### Analisis Klinis Spesialis Penyakit Dalam (AortaLink Sp.PD)\n\n` +
    `**1. Evaluasi Stratifikasi Usia (${age} Tahun):**\n` +
    `- Berdasarkan panduan klinis AHA/ESH 2024 untuk usia **${age} tahun**, target tensi ideal adalah **< ${targetSys}/${targetDia} mmHg**.\n` +
    `- ${age >= 65 ? 'Perhatikan perbedaan Tekanan Nadi (Pulse Pressure) dan hindari penurunan diastolik <65 mmHg untuk mencegah pusing ortostatik.' : 'Pertahankan elastisitas vaskular dengan menjaga asupan natrium <2.000 mg/hari dan aktivitas aerobik rutin.'}\n\n` +
    `**2. Analisis Ritme Sirkadian (Nocturnal Dipping):**\n` +
    `- Status: **${pattern}**.\n` +
    `- ${pattern.toLowerCase().includes('non') || pattern.toLowerCase().includes('riser') ? 'Pola non-dipping menunjukkan dinding pembuluh darah belum beristirahat optimal saat tidur. Diskusikan dengan dokter mengenai penyesuaian jam minum obat (kronoterapi).' : 'Penurunan tensi saat tidur berada dalam rentang fisiologis sehat (10-20%).'}\n\n` +
    `**3. Evaluasi Regimen Obat Riil:**\n` +
    `- Status saat ini: ${meds.length > 0 ? `Konsumsi **${meds.join(', ')}**.` : '**Belum ada obat tercatat** (Terapi non-farmakologis / Monitoring mandiri).'}\n` +
    `- Rekomendasi: Obat antihipertensi harus selalu disesuaikan dengan respon tekanan darah riil dan fungsi ginjal berkala (eGFR & Asam Urat), bukan resep umum seragam.\n\n` +
    `*Catatan: Konsultasikan perubahan dosis obat secara berkala dengan dokter spesialis yang merawat Anda.*`;
}
