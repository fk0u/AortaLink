import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class JsonExportImportView extends StatefulWidget {
  const JsonExportImportView({super.key});

  @override
  State<JsonExportImportView> createState() => _JsonExportImportViewState();
}

class _JsonExportImportViewState extends State<JsonExportImportView> {
  final TextEditingController _jsonInputController = TextEditingController();
  String _statusMessage = '';

  void _exportJson() async {
    final payload = {
      'version': '2.0.0',
      'exportedAt': DateTime.now().toIso8601String(),
      'platform': 'AortaLink Flutter Mobile',
      'readings': [
        {'systolic': 120, 'diastolic': 80, 'pulse': 72, 'timestamp': DateTime.now().toIso8601String()}
      ]
    };

    final jsonStr = jsonEncode(payload);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('aortalink_mobile_json_backup', jsonStr);

    setState(() {
      _jsonInputController.text = jsonStr;
      _statusMessage = 'Ekspor JSON berhasil disimpan ke memori internal!';
    });
  }

  void _importJson() async {
    if (_jsonInputController.text.trim().isEmpty) return;
    try {
      final parsed = jsonDecode(_jsonInputController.text);
      if (parsed is Map) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('aortalink_mobile_json_backup', jsonEncode(parsed));
        setState(() {
          _statusMessage = 'Impor JSON Berhasil! Data EHR terpulihkan.';
        });
      }
    } catch (e) {
      setState(() {
        _statusMessage = 'Error: Format JSON tidak valid.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Ekspor / Impor JSON', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            ElevatedButton.icon(
              onPressed: _exportJson,
              icon: const Icon(Icons.download),
              label: const Text('Ekspor JSON Backup'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0D9488),
                minimumSize: const Size.fromHeight(48),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
            ),
            const SizedBox(height: 16),
            Expanded(
              child: TextField(
                controller: _jsonInputController,
                maxLines: null,
                expands: true,
                decoration: InputDecoration(
                  hintText: 'Tempelkan payload JSON di sini untuk pemulihan...',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                  filled: true,
                  fillColor: Colors.white,
                ),
              ),
            ),
            const SizedBox(height: 12),
            ElevatedButton.icon(
              onPressed: _importJson,
              icon: const Icon(Icons.upload),
              label: const Text('Impor &amp; Pulihkan JSON'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0284C7),
                minimumSize: const Size.fromHeight(48),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
            ),
            if (_statusMessage.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(_statusMessage, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0D9488))),
            ]
          ],
        ),
      ),
    );
  }
}
