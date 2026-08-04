import 'package:flutter/material.dart';
import '../services/nvidia_nim_service.dart';
import 'json_export_import_view.dart';

class AortaLinkHomeView extends StatefulWidget {
  const AortaLinkHomeView({super.key});

  @override
  State<AortaLinkHomeView> createState() => _AortaLinkHomeViewState();
}

class _AortaLinkHomeViewState extends State<AortaLinkHomeView> {
  final NvidiaNimService _aiService = NvidiaNimService();
  
  final TextEditingController _sysController = TextEditingController(text: '120');
  final TextEditingController _diaController = TextEditingController(text: '80');
  final TextEditingController _pulseController = TextEditingController(text: '72');
  final TextEditingController _aiPromptController = TextEditingController();

  bool _isAiLoading = false;
  String _aiResponse = '';
  
  bool _amlodipineTaken = true;
  bool _candesartanTaken = false;
  bool _allopurinolTaken = true;

  void _askAi() async {
    if (_aiPromptController.text.trim().isEmpty) return;
    setState(() {
      _isAiLoading = true;
      _aiResponse = '';
    });

    final prompt = 'Data Tensi Pasien: ${_sysController.text}/${_diaController.text} mmHg, Nadi ${_pulseController.text} BPM.\nPertanyaan: ${_aiPromptController.text}';
    final response = await _aiService.queryClinicalAi(prompt: prompt);

    setState(() {
      _isAiLoading = false;
      _aiResponse = response;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFF0D9488),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.favorite, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 10),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'AortaLink Mobile',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                ),
                Text(
                  'Personal EHR & AI CDSS',
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF0D9488)),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.file_present_rounded, color: Color(0xFF0F172A)),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const JsonExportImportView()),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            
            // Latest Reading Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 4))
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('PENGUKURAN TERAKHIR', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFF64748B), letterSpacing: 1)),
                  const SizedBox(height: 8),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text('${_sysController.text} / ${_diaController.text}', style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                      const SizedBox(width: 8),
                      const Text('mmHg', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF64748B))),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.favorite, size: 16, color: Colors.roseAccent),
                      const SizedBox(width: 4),
                      Text('${_pulseController.text} BPM (Nadi)', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF334155))),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFCCFBF1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Text('Normal (AHA Target)', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF0F766E))),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Combination Therapy Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('REGIMEN OBAT HARI INI (CCB + ARB)', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFF64748B))),
                  const SizedBox(height: 12),
                  CheckboxListTile(
                    value: _amlodipineTaken,
                    title: const Text('Amlodipine 5mg (CCB - Pagi)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
                    subtitle: const Text('Meredam lonjakan tensi saat aktivitas', style: TextStyle(fontSize: 11)),
                    activeColor: const Color(0xFF0D9488),
                    onChanged: (val) => setState(() => _amlodipineTaken = val ?? false),
                  ),
                  CheckboxListTile(
                    value: _candesartanTaken,
                    title: const Text('Candesartan 8mg (ARB - Malam)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
                    subtitle: const Text('Proteksi organ & dipping nocturnal', style: TextStyle(fontSize: 11)),
                    activeColor: const Color(0xFF0D9488),
                    onChanged: (val) => setState(() => _candesartanTaken = val ?? false),
                  ),
                  CheckboxListTile(
                    value: _allopurinolTaken,
                    title: const Text('Allopurinol 100mg (Anti-Gout - Pagi)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800)),
                    subtitle: const Text('Penurun asam urat & proteksi ginjal', style: TextStyle(fontSize: 11)),
                    activeColor: const Color(0xFF0D9488),
                    onChanged: (val) => setState(() => _allopurinolTaken = val ?? false),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // NVIDIA NIM AI Consultation Box
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: const Color(0xFF99F6E4)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(color: const Color(0xFF0D9488), borderRadius: BorderRadius.circular(10)),
                        child: const Icon(Icons.psychology, color: Colors.white, size: 18),
                      ),
                      const SizedBox(width: 8),
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('NVIDIA NIM AI Consultation', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900)),
                          Text('Model: z-ai/glm-5.2 • Specialist Sp.PD', style: TextStyle(fontSize: 10, color: Color(0xFF0D9488))),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _aiPromptController,
                    decoration: InputDecoration(
                      hintText: 'Tanyakan panduan tensi/obat...',
                      hintStyle: const TextStyle(fontSize: 12),
                      filled: true,
                      fillColor: const Color(0xFFF1F5F9),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                      suffixIcon: IconButton(
                        icon: _isAiLoading ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.send, color: Color(0xFF0D9488)),
                        onPressed: _isAiLoading ? null : _askAi,
                      ),
                    ),
                  ),
                  if (_aiResponse.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: const Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFFE2E8F0))),
                      child: Text(_aiResponse, style: const TextStyle(fontSize: 12, height: 1.5, color: Color(0xFF334155))),
                    )
                  ]
                ],
              ),
            )

          ],
        ),
      ),
    );
  }
}
