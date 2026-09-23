import sqlite3

c = sqlite3.connect('kinguardian.db')
c.row_factory = sqlite3.Row
print("conversation c30641ff... owner:")
for r in c.execute("SELECT id, family_id, subject_id FROM conversations WHERE id LIKE 'c30641ff%'"):
    print("  ", dict(r))
print("\nfamily ec6f70f6 (target) conversations:")
for r in c.execute("SELECT id, family_id FROM conversations WHERE family_id = 'ec6f70f6-3cba-4945-9922-227634a9edcf'".replace('-', '') if False else "SELECT id, family_id FROM conversations"):
    pass
# family_id stored as 32-char hex (no dashes)
for r in c.execute("SELECT id, family_id FROM conversations"):
    print("  ", dict(r))
c.close()
