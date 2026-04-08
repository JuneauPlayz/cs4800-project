import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', 'splitstack.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

function bootstrap() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      initials TEXT NOT NULL,
      avatar_color TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS groups_table (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      emoji TEXT NOT NULL,
      threshold REAL NOT NULL,
      blockchain_enabled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS group_members (
      group_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      PRIMARY KEY (group_id, user_id)
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
      blockchain_enabled INTEGER NOT NULL DEFAULT 0,
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

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      emoji TEXT NOT NULL,
      cost REAL NOT NULL,
      can_share INTEGER NOT NULL DEFAULT 0,
      monthly_savings_text TEXT
    );

    CREATE TABLE IF NOT EXISTS subscription_members (
      subscription_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      PRIMARY KEY (subscription_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS challenges (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      goal REAL NOT NULL,
      current REAL NOT NULL,
      unit TEXT NOT NULL,
      color TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS badges (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      earned INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
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
      ai_proactive INTEGER NOT NULL DEFAULT 1
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
  `);

  const hasUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (hasUsers > 0) return;

  const insertUser = db.prepare(`INSERT INTO users (id, name, email, password, initials, avatar_color) VALUES (?, ?, ?, ?, ?, ?)`);
  const users = [
    ['u1', 'Jordan Lee', 'jordan@splitstack.app', 'demo123', 'JL', '#0D9488'],
    ['u2', 'Marcus Chen', 'marcus@splitstack.app', 'demo123', 'MC', '#8B5CF6'],
    ['u3', 'Priya Sharma', 'priya@splitstack.app', 'demo123', 'PS', '#F59E0B'],
    ['u4', 'Sam Rivera', 'sam@splitstack.app', 'demo123', 'SR', '#EF4444']
  ];
  users.forEach((user) => insertUser.run(...user));

  const insertGroup = db.prepare(`INSERT INTO groups_table (id, name, type, emoji, threshold, blockchain_enabled, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  [
    ['g1', 'Wicker Park Apt', 'roommates', '🏠', 500, 1, '2025-10-01'],
    ['g2', 'Barcelona Trip', 'trip', '✈️', 200, 0, '2025-11-15']
  ].forEach((group) => insertGroup.run(...group));

  const insertMember = db.prepare(`INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)`);
  [
    ['g1', 'u1', 'Owner'], ['g1', 'u2', 'Admin'], ['g1', 'u3', 'Member'], ['g1', 'u4', 'Member'],
    ['g2', 'u1', 'Owner'], ['g2', 'u2', 'Member'], ['g2', 'u3', 'Member']
  ].forEach((row) => insertMember.run(...row));

  const insertExpense = db.prepare(`
    INSERT INTO expenses (id, group_id, description, amount, category, paid_by, split_method, expense_date, blockchain_enabled, merchant, receipt_url, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertSplit = db.prepare(`INSERT INTO expense_splits (expense_id, user_id, amount) VALUES (?, ?, ?)`);

  const expenses = [
    ['e1', 'g1', 'Whole Foods Run', 148.5, 'Groceries', 'u1', 'equal', '2026-04-05', 1, 'Whole Foods', null, '2026-04-05T18:20:00Z', ['u1','u2','u3','u4']],
    ['e2', 'g1', 'Electric Bill — April', 112, 'Utilities', 'u2', 'equal', '2026-04-04', 1, 'ComEd', null, '2026-04-04T15:10:00Z', ['u1','u2','u3','u4']],
    ['e3', 'g1', 'Pizza Night', 64.2, 'Dining', 'u3', 'equal', '2026-04-03', 0, 'Lou Malnati\'s', null, '2026-04-03T21:30:00Z', ['u1','u2','u3','u4']],
    ['e4', 'g1', 'Netflix Subscription', 22.99, 'Streaming', 'u1', 'equal', '2026-04-01', 0, 'Netflix', null, '2026-04-01T11:00:00Z', ['u1','u2','u3','u4']],
    ['e5', 'g2', 'Hotel — Night 1', 320, 'Travel', 'u1', 'equal', '2026-03-28', 0, 'Hotel Neri', null, '2026-03-28T12:15:00Z', ['u1','u2','u3']],
    ['e6', 'g2', 'Tapas Dinner', 89.5, 'Dining', 'u2', 'equal', '2026-03-29', 0, 'Cervecería Catalana', null, '2026-03-29T19:45:00Z', ['u1','u2','u3']],
    ['e7', 'g1', 'Rent — April', 3200, 'Rent', 'u1', 'equal', '2026-04-01', 1, 'Wicker Park Lofts', null, '2026-04-01T09:00:00Z', ['u1','u2','u3','u4']],
    ['e8', 'g1', 'Cleaning Supplies', 38.75, 'Household', 'u4', 'equal', '2026-03-30', 0, 'Target', null, '2026-03-30T16:10:00Z', ['u1','u2','u3','u4']]
  ];

  expenses.forEach((expense) => {
    const [id, groupId, description, amount, category, paidBy, splitMethod, expenseDate, blockchainEnabled, merchant, receiptUrl, createdAt, members] = expense;
    insertExpense.run(id, groupId, description, amount, category, paidBy, splitMethod, expenseDate, blockchainEnabled, merchant, receiptUrl, createdAt);
    const share = Number((amount / members.length).toFixed(2));
    members.forEach((memberId, index) => {
      const remainderAdjusted = index === members.length - 1
        ? Number((amount - share * (members.length - 1)).toFixed(2))
        : share;
      insertSplit.run(id, memberId, remainderAdjusted);
    });
  });

  const insertVote = db.prepare(`INSERT INTO votes (id, group_id, requested_by, description, amount, category, reason, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  [
    ['v1', 'g1', 'u2', 'New Sofa — West Elm', 1200, 'Furniture', 'Our current sofa is falling apart. This one fits the living room perfectly.', 'pending', '2026-04-04T13:00:00Z'],
    ['v2', 'g1', 'u1', 'Standing Desk', 450, 'Furniture', 'Would help productivity for those working from home.', 'approved', '2025-12-08T09:00:00Z'],
    ['v3', 'g1', 'u4', 'PS5 for Living Room', 499, 'Electronics', 'Could be shared by everyone for entertainment.', 'declined', '2025-11-25T17:30:00Z']
  ].forEach((vote) => insertVote.run(...vote));

  const insertDecision = db.prepare(`INSERT INTO vote_decisions (vote_id, user_id, decision, decided_at) VALUES (?, ?, ?, ?)`);
  [
    ['v1', 'u2', 'yes', '2026-04-04T13:01:00Z'],
    ['v2', 'u1', 'yes', '2025-12-08T09:05:00Z'], ['v2', 'u2', 'yes', '2025-12-08T09:07:00Z'], ['v2', 'u3', 'yes', '2025-12-08T09:09:00Z'], ['v2', 'u4', 'no', '2025-12-08T09:11:00Z'],
    ['v3', 'u1', 'no', '2025-11-25T18:00:00Z'], ['v3', 'u2', 'no', '2025-11-25T18:10:00Z'], ['v3', 'u3', 'no', '2025-11-25T18:14:00Z'], ['v3', 'u4', 'yes', '2025-11-25T18:20:00Z']
  ].forEach((row) => insertDecision.run(...row));

  const insertSubscription = db.prepare(`INSERT INTO subscriptions (id, name, emoji, cost, can_share, monthly_savings_text) VALUES (?, ?, ?, ?, ?, ?)`);
  const insertSubscriptionMember = db.prepare(`INSERT INTO subscription_members (subscription_id, user_id) VALUES (?, ?)`);
  [
    ['s1', 'Netflix', '📺', 15.99, 1, '3 members pay separately. Share 1 account → save $31.98/mo', ['u1','u2','u3']],
    ['s2', 'Spotify', '🎵', 10.99, 1, '2 members pay separately. Family plan costs $16.99 → save $4.99/mo', ['u1','u3']],
    ['s3', 'Amazon Prime', '📦', 14.99, 1, '2 members pay separately. Share 1 household account → save $14.99/mo', ['u2','u4']],
    ['s4', 'Hulu', '📺', 17.99, 0, null, ['u1']],
    ['s5', 'Adobe CC', '🎨', 54.99, 0, null, ['u3']],
    ['s6', 'ChatGPT Plus', '🤖', 20, 0, null, ['u1','u2']]
  ].forEach(([id, name, emoji, cost, canShare, text, members]) => {
    insertSubscription.run(id, name, emoji, cost, canShare, text);
    members.forEach((userId) => insertSubscriptionMember.run(id, userId));
  });

  const insertChallenge = db.prepare(`INSERT INTO challenges (id, name, description, goal, current, unit, color) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  [
    ['c1', 'Grocery Budget', 'Keep groceries under $400 this month', 400, 280, '$', '#0D9488'],
    ['c2', 'Dining Limit', 'Eat out fewer than 5 times this week', 5, 3, '', '#F59E0B'],
    ['c3', 'Utility Target', 'Keep utilities under $200 this month', 200, 156, '$', '#8B5CF6']
  ].forEach((row) => insertChallenge.run(...row));

  const insertBadge = db.prepare(`INSERT INTO badges (id, name, earned) VALUES (?, ?, ?)`);
  [
    ['b1', '🎉 First Split', 1], ['b2', '👥 Group Builder', 1], ['b3', '🔥 Streak 14', 1], ['b4', '⚖️ Fair Settler', 1],
    ['b5', '🥷 Budget Ninja', 1], ['b6', '🤖 AI Explorer', 1], ['b7', '🏛️ Vote Champion', 1], ['b8', '💰 Big Saver', 0], ['b9', '🔗 Chain Pioneer', 0]
  ].forEach((row) => insertBadge.run(...row));

  const insertNotification = db.prepare(`INSERT INTO notifications (id, type, title, body, unread, created_at) VALUES (?, ?, ?, ?, ?, ?)`);
  [
    ['n1', 'vote', 'New vote request', 'Marcus proposed a new sofa purchase for $1,200.', 1, '2026-04-04T13:05:00Z'],
    ['n2', 'balance', 'Balance updated', 'Jordan is currently owed $2,446.89 across active groups.', 1, '2026-04-05T18:25:00Z'],
    ['n3', 'settlement', 'Settlement ready', 'Stripe/Plaid settlement flow is ready for the Barcelona Trip group.', 0, '2026-04-02T09:15:00Z']
  ].forEach((row) => insertNotification.run(...row));

  db.prepare(`INSERT INTO user_settings (user_id, email_votes, email_balance, push_settlements, ai_proactive) VALUES (?, ?, ?, ?, ?)`)
    .run('u1', 1, 1, 1, 1);
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

export default db;
