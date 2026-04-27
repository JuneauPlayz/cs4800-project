import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', 'splitstack.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function hasColumn(table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((row) => row.name === column);
}

function ensureColumn(table, column, ddl) {
  if (!hasColumn(table, column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

function bootstrap() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      initials TEXT NOT NULL,
      avatar_color TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS groups_table (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      emoji TEXT NOT NULL,
      threshold REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      owner_id TEXT,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS group_members (
      group_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (group_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS group_invites (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      email TEXT NOT NULL,
      invited_name TEXT,
      role TEXT NOT NULL DEFAULT 'Member',
      invited_by TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      responded_at TEXT
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      paid_by TEXT NOT NULL,
      split_method TEXT NOT NULL,
      expense_date TEXT NOT NULL,
      merchant TEXT,
      receipt_url TEXT,
      reason TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expense_splits (
      expense_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      PRIMARY KEY (expense_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      requested_by TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      reason TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vote_decisions (
      vote_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      decision TEXT NOT NULL,
      decided_at TEXT NOT NULL,
      PRIMARY KEY (vote_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      unread INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY,
      email_votes INTEGER NOT NULL DEFAULT 1,
      email_balance INTEGER NOT NULL DEFAULT 1,
      push_settlements INTEGER NOT NULL DEFAULT 1,
      ai_proactive INTEGER NOT NULL DEFAULT 1,
      profile_visibility TEXT NOT NULL DEFAULT 'group_members',
      activity_visibility TEXT NOT NULL DEFAULT 'group_members'
    );

    CREATE TABLE IF NOT EXISTS challenges (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      created_by TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      goal REAL NOT NULL,
      current REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT '$',
      color TEXT NOT NULL,
      start_date TEXT,
      end_date TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS challenge_contributions (
      id TEXT PRIMARY KEY,
      challenge_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS group_invitations (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      invited_by TEXT NOT NULL,
      invited_email TEXT NOT NULL,
      invited_user_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_payout_profiles (
      user_id TEXT PRIMARY KEY,
      zelle_handle TEXT,
      venmo_handle TEXT,
      cash_note TEXT,
      preferred_method TEXT NOT NULL DEFAULT 'cash',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settlements (
      id TEXT PRIMARY KEY,
      payer_id TEXT NOT NULL,
      payee_id TEXT NOT NULL,
      amount REAL NOT NULL,
      method TEXT NOT NULL,
      note TEXT,
      status TEXT NOT NULL DEFAULT 'completed',
      completed_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      completed_at TEXT NOT NULL
    );
  `);

  ensureColumn('groups_table', 'owner_id', 'owner_id TEXT');
  ensureColumn('groups_table', 'description', 'description TEXT');
  ensureColumn('group_members', 'joined_at', 'joined_at TEXT DEFAULT CURRENT_TIMESTAMP');
  ensureColumn('users', 'created_at', 'created_at TEXT DEFAULT CURRENT_TIMESTAMP');
  ensureColumn('users', 'avatar_emoji', 'avatar_emoji TEXT');
  ensureColumn('user_settings', 'profile_visibility', "profile_visibility TEXT NOT NULL DEFAULT 'group_members'");
  ensureColumn('user_settings', 'activity_visibility', "activity_visibility TEXT NOT NULL DEFAULT 'group_members'");
  ensureColumn('user_payout_profiles', 'cash_note', 'cash_note TEXT');
  ensureColumn('user_payout_profiles', 'preferred_method', "preferred_method TEXT NOT NULL DEFAULT 'cash'");
  ensureColumn('user_payout_profiles', 'updated_at', "updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP");
  ensureColumn('settlements', 'status', "status TEXT NOT NULL DEFAULT 'completed'");
  ensureColumn('settlements', 'completed_by', 'completed_by TEXT');
  ensureColumn('settlements', 'completed_at', 'completed_at TEXT');

  const hasUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (hasUsers > 0) return;

  const now = new Date().toISOString();
  const users = [
    ['u1', 'Jordan Lee', 'jordan@splitstack.app', 'demo123', 'JL', '#0D9488', 'Jasper'],
    ['u2', 'Marcus Chen', 'marcus@splitstack.app', 'demo123', 'MC', '#8B5CF6', 'Felix'],
    ['u3', 'Priya Sharma', 'priya@splitstack.app', 'demo123', 'PS', '#F59E0B', 'Luna'],
    ['u4', 'Sam Rivera', 'sam@splitstack.app', 'demo123', 'SR', '#EF4444', 'River']
  ];
  const insertUser = db.prepare('INSERT INTO users (id, name, email, password, initials, avatar_color, avatar_emoji, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  users.forEach((u) => insertUser.run(...u, now));

  const insertSettings = db.prepare(`
    INSERT INTO user_settings (user_id, email_votes, email_balance, push_settlements, ai_proactive, profile_visibility, activity_visibility)
    VALUES (?, 1, 1, 1, 1, 'group_members', 'group_members')
  `);
  users.forEach((u) => insertSettings.run(u[0]));

  const insertPayoutProfile = db.prepare(`
    INSERT INTO user_payout_profiles (user_id, zelle_handle, venmo_handle, cash_note, preferred_method, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  [
    ['u1', 'jordan@splitstack.app', '@jordan-lee', 'Cash works for in-person handoffs.', 'zelle', now],
    ['u2', 'marcus@splitstack.app', '@marcus-chen', 'Cash or bank transfer is fine.', 'venmo', now],
    ['u3', 'priya@splitstack.app', '@priya-s', 'Cash is okay for smaller amounts.', 'venmo', now],
    ['u4', null, '@sam-rivera', 'Cash only after class.', 'cash', now]
  ].forEach((profile) => insertPayoutProfile.run(...profile));

  const insertGroup = db.prepare(`
    INSERT INTO groups_table (id, name, type, emoji, threshold, created_at, owner_id, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  [
    ['g1', 'Wicker Park Apt', 'roommates', '🏠', 500, '2026-04-01T09:00:00Z', 'u1', 'Shared apartment expenses and monthly bills.'],
    ['g2', 'Barcelona Trip', 'trip', '✈️', 200, '2026-03-20T09:00:00Z', 'u1', 'Shared travel costs for our spring trip.']
  ].forEach((g) => insertGroup.run(...g));

  const insertMember = db.prepare('INSERT INTO group_members (group_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)');
  [
    ['g1', 'u1', 'Owner', now], ['g1', 'u2', 'Admin', now], ['g1', 'u3', 'Member', now], ['g1', 'u4', 'Member', now],
    ['g2', 'u1', 'Owner', now], ['g2', 'u2', 'Member', now], ['g2', 'u3', 'Member', now]
  ].forEach((m) => insertMember.run(...m));

  const insertExpense = db.prepare(`
    INSERT INTO expenses (id, group_id, description, amount, category, paid_by, split_method, expense_date, merchant, receipt_url, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertSplit = db.prepare('INSERT INTO expense_splits (expense_id, user_id, amount) VALUES (?, ?, ?)');
  const expenses = [
    ['e1', 'g1', 'Whole Foods Run', 148.5, 'Groceries', 'u1', 'equal', '2026-04-05', 'Whole Foods', null, '2026-04-05T18:20:00Z', ['u1','u2','u3','u4']],
    ['e2', 'g1', 'Electric Bill — April', 112, 'Utilities', 'u2', 'equal', '2026-04-04', 'ComEd', null, '2026-04-04T15:10:00Z', ['u1','u2','u3','u4']],
    ['e3', 'g1', 'Pizza Night', 64.2, 'Dining', 'u3', 'equal', '2026-04-03', 'Lou Malnati\'s', null, '2026-04-03T21:30:00Z', ['u1','u2','u3','u4']],
    ['e4', 'g2', 'Hotel — Night 1', 320, 'Travel', 'u1', 'equal', '2026-03-28', 'Hotel Neri', null, '2026-03-28T12:15:00Z', ['u1','u2','u3']],
    ['e5', 'g2', 'Tapas Dinner', 89.5, 'Dining', 'u2', 'equal', '2026-03-29', 'Cervecería Catalana', null, '2026-03-29T19:45:00Z', ['u1','u2','u3']]
  ];
  expenses.forEach((expense) => {
    const [id, groupId, description, amount, category, paidBy, splitMethod, expenseDate, merchant, receiptUrl, createdAt, members] = expense;
    insertExpense.run(id, groupId, description, amount, category, paidBy, splitMethod, expenseDate, merchant, receiptUrl, createdAt);
    const share = Number((amount / members.length).toFixed(2));
    members.forEach((memberId, index) => {
      const remainderAdjusted = index === members.length - 1 ? Number((amount - share * (members.length - 1)).toFixed(2)) : share;
      insertSplit.run(id, memberId, remainderAdjusted);
    });
  });

  const insertVote = db.prepare('INSERT INTO votes (id, group_id, requested_by, description, amount, category, reason, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  insertVote.run('v1', 'g1', 'u2', 'New Sofa — West Elm', 1200, 'Furniture', 'Our current sofa is falling apart.', 'pending', '2026-04-04T13:00:00Z');
  db.prepare('INSERT INTO vote_decisions (vote_id, user_id, decision, decided_at) VALUES (?, ?, ?, ?)').run('v1', 'u2', 'yes', '2026-04-04T13:01:00Z');

  const insertNotification = db.prepare('INSERT INTO notifications (id, user_id, type, title, body, unread, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  [
    ['n1', 'u1', 'vote', 'New vote request', 'Marcus proposed a new sofa purchase for $1,200 in Wicker Park Apt.', 1, '2026-04-04T13:05:00Z'],
    ['n2', 'u1', 'balance', 'Balance updated', 'Your balances were recalculated after the Whole Foods expense.', 1, '2026-04-05T18:25:00Z'],
    ['n3', 'u2', 'invite', 'You joined Barcelona Trip', 'You are already part of the Barcelona Trip group.', 0, '2026-03-20T10:00:00Z']
  ].forEach((n) => insertNotification.run(...n));

  const insertChallenge = db.prepare(`
    INSERT INTO challenges (id, group_id, created_by, name, description, goal, current, unit, color, start_date, end_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  [
    ['c1', 'g1', 'u1', 'April Grocery Goal', 'Keep groceries under $400 this month.', 400, 180, '$', '#0D9488', '2026-04-01', '2026-04-30', now],
    ['c2', 'g2', 'u1', 'Trip Food Budget', 'Stay under our shared dining budget.', 250, 95, '$', '#F59E0B', '2026-03-20', '2026-04-05', now]
  ].forEach((c) => insertChallenge.run(...c));

  const insertContribution = db.prepare('INSERT INTO challenge_contributions (id, challenge_id, user_id, amount, created_at) VALUES (?, ?, ?, ?, ?)');
  [
    ['cc1', 'c1', 'u1', 80, now],
    ['cc2', 'c1', 'u2', 100, now],
    ['cc3', 'c2', 'u2', 95, now]
  ].forEach((row) => insertContribution.run(...row));
}

bootstrap();

// Migrations for existing databases
const existingCols = db.pragma('table_info(expenses)').map((c) => c.name);
if (!existingCols.includes('reason')) {
  db.exec('ALTER TABLE expenses ADD COLUMN reason TEXT');
}
if (!existingCols.includes('vote_id')) {
  db.exec('ALTER TABLE expenses ADD COLUMN vote_id TEXT');
}

const settlementCols = db.pragma('table_info(settlements)').map((c) => c.name);
if (settlementCols.length && !settlementCols.includes('status')) {
  db.exec("ALTER TABLE settlements ADD COLUMN status TEXT NOT NULL DEFAULT 'completed'");
}
if (settlementCols.length && !settlementCols.includes('completed_by')) {
  db.exec('ALTER TABLE settlements ADD COLUMN completed_by TEXT');
  db.exec('UPDATE settlements SET completed_by = payer_id WHERE completed_by IS NULL');
}
if (settlementCols.length && !settlementCols.includes('completed_at')) {
  db.exec('ALTER TABLE settlements ADD COLUMN completed_at TEXT');
  db.exec('UPDATE settlements SET completed_at = created_at WHERE completed_at IS NULL');
}

export default db;
