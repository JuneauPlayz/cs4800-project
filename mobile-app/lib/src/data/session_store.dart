import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SessionStore {
  static const _tokenKey = 'splitstack_token';
  static const _darkModeKey = 'splitstack_dark_mode';

  SessionStore({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  Future<String?> readToken() async {
    return _storage.read(key: _tokenKey);
  }

  Future<void> writeToken(String token) async {
    await _storage.write(key: _tokenKey, value: token);
  }

  Future<bool> readDarkMode() async {
    return (await _storage.read(key: _darkModeKey)) == 'true';
  }

  Future<void> writeDarkMode(bool value) async {
    await _storage.write(key: _darkModeKey, value: value.toString());
  }

  Future<void> clear() async {
    await _storage.delete(key: _tokenKey);
  }
}
