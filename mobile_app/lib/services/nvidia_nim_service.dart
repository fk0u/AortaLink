import 'dart:convert';
import 'package:http/http.dart' as http;

class NvidiaNimService {
  static const String apiKey = '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';
  static const String baseUrl = 'https://integrate.api.nvidia.com/v1/chat/completions';
  static const String modelId = 'z-ai/glm-5.2';

  Future<String> queryClinicalAi({
    required String prompt,
    String? patientName,
  }) async {
    final headers = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $apiKey',
    };

    final body = jsonEncode({
      'model': modelId,
      'messages': [
        {
          'role': 'system',
          'content': 'Kamu adalah Asisten Medis AI Spesialis Penyakit Dalam (Sp.PD) AortaLink Mobile EHR. Berikan jawaban dalam Bahasa Indonesia yang ramah, berbasis bukti ilmiah, dan mudah dipahami pasien.'
        },
        {'role': 'user', 'content': prompt}
      ],
      'temperature': 0.7,
      'top_p': 1,
      'max_tokens': 4096,
      'seed': 42,
    });

    try {
      final response = await http.post(
        Uri.parse(baseUrl),
        headers: headers,
        body: body,
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['choices']?[0]?['message']?['content'] ?? 'Tidak ada respons dari NVIDIA NIM AI.';
      } else {
        return 'Gagal terhubung ke NVIDIA NIM API Status: ${response.statusCode}';
      }
    } catch (e) {
      return 'Error koneksi NVIDIA NIM API: $e';
    }
  }
}
