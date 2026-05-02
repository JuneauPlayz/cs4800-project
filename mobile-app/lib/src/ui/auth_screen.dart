import 'package:flutter/material.dart';

import '../core/app_theme.dart';
import '../state/app_controller.dart';

const _avatarSeeds = [
  '',
  'Jasper',
  'Luna',
  'Felix',
  'River',
  'Sage',
  'Quinn',
  'Milo',
  'Ivy',
  'Oscar',
  'Willow',
  'Leo',
  'Aurora',
];

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key, required this.controller});

  final AppController controller;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _register = false;
  String _avatarSeed = _avatarSeeds.first;

  @override
  void initState() {
    super.initState();
    _nameController.addListener(_refreshInitialAvatar);
  }

  void _refreshInitialAvatar() {
    if (_register && _avatarSeed.isEmpty) {
      setState(() {});
    }
  }

  @override
  void dispose() {
    _nameController.removeListener(_refreshInitialAvatar);
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFF8FAFC), Color(0xFFE6FFFB)],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 560),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: AppTheme.slate,
                        borderRadius: BorderRadius.circular(28),
                      ),
                      child: const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _AuthBrand(),
                          SizedBox(height: 20),
                          Text(
                            'Manage balances, group spending, approvals, and AI answers from the same live SplitStack backend.',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              height: 1.45,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 18),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(22),
                        child: Form(
                          key: _formKey,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              SegmentedButton<bool>(
                                segments: const [
                                  ButtonSegment(
                                    value: false,
                                    label: Text('Login'),
                                    icon: Icon(Icons.lock_open_rounded),
                                  ),
                                  ButtonSegment(
                                    value: true,
                                    label: Text('Register'),
                                    icon: Icon(Icons.person_add_alt_1_rounded),
                                  ),
                                ],
                                selected: {_register},
                                onSelectionChanged: (next) {
                                  setState(() => _register = next.first);
                                },
                              ),
                              const SizedBox(height: 20),
                              Text(
                                _register
                                    ? 'Create a new account'
                                    : 'Sign in to SplitStack',
                                style: theme.textTheme.titleLarge,
                              ),
                              const SizedBox(height: 6),
                              Text(
                                'API: ${widget.controller.apiBaseUrl}',
                                style: theme.textTheme.bodySmall,
                              ),
                              const SizedBox(height: 18),
                              if (_register) ...[
                                TextFormField(
                                  controller: _nameController,
                                  decoration: const InputDecoration(
                                    labelText: 'Name',
                                  ),
                                  validator: (value) {
                                    if (!_register) return null;
                                    if ((value ?? '').trim().isEmpty) {
                                      return 'Enter your name';
                                    }
                                    return null;
                                  },
                                ),
                                const SizedBox(height: 14),
                                _AvatarPicker(
                                  initials: _firstInitial(_nameController.text),
                                  selectedSeed: _avatarSeed,
                                  onSelected: (seed) {
                                    setState(() => _avatarSeed = seed);
                                  },
                                ),
                                const SizedBox(height: 14),
                              ],
                              TextFormField(
                                controller: _emailController,
                                keyboardType: TextInputType.emailAddress,
                                decoration: const InputDecoration(
                                  labelText: 'Email',
                                ),
                                validator: (value) {
                                  final email = (value ?? '').trim();
                                  if (email.isEmpty || !email.contains('@')) {
                                    return 'Enter a valid email';
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 14),
                              TextFormField(
                                controller: _passwordController,
                                obscureText: true,
                                decoration: const InputDecoration(
                                  labelText: 'Password',
                                ),
                                validator: (value) {
                                  if ((value ?? '').length < 6) {
                                    return 'Use at least 6 characters';
                                  }
                                  return null;
                                },
                              ),
                              const SizedBox(height: 18),
                              if (widget.controller.errorMessage != null) ...[
                                _InlineMessage(
                                  text: widget.controller.errorMessage!,
                                  color: AppTheme.red,
                                  background: const Color(0xFFFEF2F2),
                                ),
                                const SizedBox(height: 14),
                              ],
                              FilledButton(
                                onPressed: widget.controller.loading
                                    ? null
                                    : _submit,
                                child: widget.controller.loading
                                    ? const SizedBox(
                                        width: 22,
                                        height: 22,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2.2,
                                          valueColor:
                                              AlwaysStoppedAnimation<Color>(
                                                Colors.white,
                                              ),
                                        ),
                                      )
                                    : Text(
                                        _register
                                            ? 'Create account'
                                            : 'Sign in',
                                      ),
                              ),
                              const SizedBox(height: 14),
                              const _InlineMessage(
                                text:
                                    'New here? Register with your real team email, then create or accept a group invite.',
                                color: AppTheme.tealDark,
                                background: Color(0xFFF0FDFA),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    try {
      if (_register) {
        await widget.controller.register(
          name: _nameController.text.trim(),
          email: _emailController.text.trim(),
          password: _passwordController.text,
          avatarEmoji: _avatarSeed,
        );
      } else {
        await widget.controller.login(
          email: _emailController.text.trim(),
          password: _passwordController.text,
        );
      }
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(widget.controller.errorMessage ?? 'Sign in failed'),
        ),
      );
    }
  }
}

class _AvatarPicker extends StatelessWidget {
  const _AvatarPicker({
    required this.initials,
    required this.selectedSeed,
    required this.onSelected,
  });

  final String initials;
  final String selectedSeed;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Choose your avatar',
          style: Theme.of(context).textTheme.bodySmall,
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 64,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: _avatarSeeds.length,
            separatorBuilder: (context, index) => const SizedBox(width: 10),
            itemBuilder: (context, index) {
              final seed = _avatarSeeds[index];
              final selected = seed == selectedSeed;
              return Tooltip(
                message: seed.isEmpty ? 'Initial' : seed,
                child: InkWell(
                  borderRadius: BorderRadius.circular(999),
                  onTap: () => onSelected(seed),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 140),
                    width: 58,
                    height: 58,
                    padding: const EdgeInsets.all(3),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: selected ? AppTheme.teal : AppTheme.border,
                        width: selected ? 3 : 1,
                      ),
                    ),
                    child: ClipOval(
                      child: seed.isEmpty
                          ? _InitialAvatarPreview(initials: initials)
                          : Image.network(
                              diceBearUrl(seed),
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) =>
                                  ColoredBox(
                                    color: AppTheme.teal.withValues(
                                      alpha: 0.12,
                                    ),
                                    child: Center(
                                      child: Text(
                                        seed[0],
                                        style: const TextStyle(
                                          color: AppTheme.teal,
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                    ),
                                  ),
                            ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

class _InitialAvatarPreview extends StatelessWidget {
  const _InitialAvatarPreview({required this.initials});

  final String initials;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: AppTheme.teal.withValues(alpha: 0.12),
      child: Center(
        child: Text(
          initials,
          style: const TextStyle(
            color: AppTheme.teal,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}

String _firstInitial(String name) {
  final trimmed = name.trim();
  if (trimmed.isEmpty) return '?';
  return trimmed.substring(0, 1).toUpperCase();
}

String diceBearUrl(String seed) {
  return 'https://api.dicebear.com/9.x/avataaars/png?seed=${Uri.encodeComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf';
}

class _AuthBrand extends StatelessWidget {
  const _AuthBrand();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 54,
          height: 54,
          decoration: BoxDecoration(
            color: AppTheme.teal,
            borderRadius: BorderRadius.circular(16),
          ),
          child: const Icon(
            Icons.layers_rounded,
            color: Colors.white,
            size: 28,
          ),
        ),
        const SizedBox(width: 14),
        const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'SplitStack',
              style: TextStyle(
                color: Colors.white,
                fontSize: 26,
                fontWeight: FontWeight.w800,
              ),
            ),
            SizedBox(height: 4),
            Text(
              'Shared expenses for real groups',
              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
            ),
          ],
        ),
      ],
    );
  }
}

class _InlineMessage extends StatelessWidget {
  const _InlineMessage({
    required this.text,
    required this.color,
    required this.background,
  });

  final String text;
  final Color color;
  final Color background;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Text(
        text,
        style: TextStyle(color: color, fontWeight: FontWeight.w600),
      ),
    );
  }
}
