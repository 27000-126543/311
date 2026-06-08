const Database = require('better-sqlite3')
const db = new Database('d:/新项目/311/api/db/bidding.db')
const u = db.prepare("SELECT id, username, credit_score FROM users WHERE username = 'bidder2'").get()
console.log('bidder2:', u)
if (u) {
  db.prepare('UPDATE users SET credit_score = 42 WHERE id = ?').run(u.id)
  console.log('Updated credit_score to 42')
} else {
  console.log('bidder2 not found')
}
db.close()
