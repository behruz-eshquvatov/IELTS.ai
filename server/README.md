# IELTS Backend (Express + MongoDB)

## Local MongoDB (Compass)
- Connection string: `mongodb://127.0.0.1:27017/english`
- Database name: `english`

## Run
```bash
cd server
npm install
npm run dev
```

## API Base
- `http://localhost:5000/api/v1`

## Quick Start Seed
```bash
POST /api/v1/students/amina-jurayeva/seed
```

This creates demo data for:
- Student profile
- Daily tasks
- Analytics (week/month/lifetime + heatmap)

## Main Endpoints
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/students`
- `GET /api/v1/students/:studentId/profile`
- `PUT /api/v1/students/:studentId/profile`
- `GET /api/v1/students/:studentId/daily-tasks`
- `PUT /api/v1/students/:studentId/daily-tasks`
- `PATCH /api/v1/students/:studentId/daily-tasks/units/:unitId/tasks/:taskId/status`
- `GET /api/v1/students/:studentId/analytics?range=week&part=Listening`
- `PUT /api/v1/students/:studentId/analytics`
