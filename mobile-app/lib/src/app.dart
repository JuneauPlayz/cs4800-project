import 'package:flutter/material.dart';

import 'core/app_theme.dart';
import 'data/api_client.dart';
import 'data/session_store.dart';
import 'state/app_controller.dart';
import 'ui/auth_screen.dart';
import 'ui/home_shell.dart';

class SplitStackApp extends StatefulWidget {
  const SplitStackApp({super.key});

  @override
  State<SplitStackApp> createState() => _SplitStackAppState();
}

class _SplitStackAppState extends State<SplitStackApp> {
  late final AppController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AppController(
      apiClient: ApiClient(),
      sessionStore: SessionStore(),
    )..initialize();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        return MaterialApp(
          title: 'SplitStack',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.light(),
          home: _buildHome(),
        );
      },
    );
  }

  Widget _buildHome() {
    if (_controller.initializing) {
      return const _SplashScreen();
    }
    if (!_controller.isAuthenticated) {
      return AuthScreen(controller: _controller);
    }
    return HomeShell(controller: _controller);
  }
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF0F172A), Color(0xFF0D9488)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: const Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _BrandMark(size: 76),
              SizedBox(height: 18),
              Text(
                'SplitStack',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.5,
                ),
              ),
              SizedBox(height: 12),
              SizedBox(
                width: 28,
                height: 28,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BrandMark extends StatelessWidget {
  const _BrandMark({required this.size});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.14),
        borderRadius: BorderRadius.circular(size * 0.28),
        border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
      ),
      child: const Icon(Icons.layers_rounded, color: Colors.white, size: 34),
    );
  }
}
