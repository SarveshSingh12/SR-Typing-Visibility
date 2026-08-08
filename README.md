# SR Typing Online Ready
PostgreSQL + Render-ready Node/Express package.

## Local
npm install
npm start

## Online
Push to GitHub, create a PostgreSQL database, create a Node web service, then set:
DATABASE_URL
JWT_SECRET
ADMIN_PASSWORD

Build: npm install
Start: npm start

The database tables and starter passages/exams are created automatically.
Admin email: admin@srtyping.local
Admin password: value of ADMIN_PASSWORD (use a strong production password).

Exam rules: English 5 minutes/150+ words/30 WPM/90% accuracy; Hindi 5 minutes/125+ words/25 WPM/90% accuracy.
