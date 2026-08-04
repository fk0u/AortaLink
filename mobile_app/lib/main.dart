import 'package:flutter/material.dart';
import 'views/home_view.dart';

void main() {
  runApp(const AortaLinkMobileApp());
}

class AortaLinkMobileApp extends StatelessWidget {
  const AortaLinkMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AortaLink Mobile EHR',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        fontFamily: 'Plus Jakarta Sans',
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0D9488),
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
      ),
      home: const AortaLinkHomeView(),
    );
  }
}
