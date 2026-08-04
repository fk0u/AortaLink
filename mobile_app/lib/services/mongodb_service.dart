import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class MongoDbAtlasMobileService {
  static const String publicKey = 'wfokmvwy';
  static const String privateKey = '729507c9-3cb2-430d-8c51-a20878616549';
  static const String baseUrl = 'https://cloud.mongodb.com/api/atlas/v1.0';

  Future<bool> syncLocalPayloadToCloud(Map<String, dynamic> fhirPayload) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('aortalink_mongodb_atlas_last_sync', DateTime.now().toIso8601String());
      await prefs.setString('aortalink_mongodb_atlas_cache', jsonEncode(fhirPayload));
      return true;
    } catch (e) {
      return false;
    }
  }

  Future<String?> getLastSyncTimestamp() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('aortalink_mongodb_atlas_last_sync');
  }
}
