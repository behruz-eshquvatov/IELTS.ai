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

## AI Config (Writing Task 2 Analysis)
Set these environment variables in `server/.env`:

```bash
OPENROUTER_API_KEY_V2=your_openrouter_api_key
OPENROUTER_MODEL=openai/gpt-4.1-mini
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
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password/verify`
- `POST /api/v1/auth/reset-password`
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
- `POST /api/v1/students/:studentId/study-activity/visit`
- `POST /api/v1/students/:studentId/study-activity/task-time`
- `GET /api/v1/students/:studentId/study-activity/heatmap`
- `POST /api/v1/students/me/study-activity/visit`
- `POST /api/v1/students/me/study-activity/task-time`
- `GET /api/v1/students/me/study-activity/heatmap`
- `POST /api/v1/writing-task2-opinion/analyses`
- `GET /api/v1/writing-task2-opinion/analyses/:analysisId`

## Study Activity Rules
- Level `1`: task-active study time reached `30+` minutes.
- Level `2`: task-active study time reached `60+` minutes.
- Level `3`: task-active study time reached `120+` minutes.

Heatmap endpoints support `?year=YYYY` (e.g. `?year=2024`) and return:
- `activityData` with intensity values
- `visibilityData` where days outside the selected year are hidden
- `monthTicks`, `startDateKey`, `endDateKey`, and `calendarYear`

Each study activity response includes:
- `todaysStudyTimeMinutes` (number)
- `"today's study time"` (string, minutes label)
