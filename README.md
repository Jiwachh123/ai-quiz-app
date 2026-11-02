# AI Quiz Master

An AI-powered online quiz application built with **Next.js**, **Tailwind CSS**, and **Google Gemini**.

## Features

- User Authentication (Student / Teacher roles)
- AI Question Generation using Google Gemini
- Adaptive difficulty indicators
- Student Dashboard with performance analytics
- Teacher Panel to create & manage quizzes
- Instant feedback + explanations
- Progress tracking & weak topic detection
- Clean modern UI

## Tech Stack

- **Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **AI**: Google Gemini API (`@google/generative-ai`)
- **Auth & Storage**: LocalStorage (demo) + bcryptjs
- **Icons**: Lucide React

## Getting Started

### 1. Install dependencies

```bash
cd ai-quiz-app
npm install
```

### 2. Add Gemini API Key

Create a file `.env.local` in the root:

```env
NEXT_PUBLIC_GEMINI_API_KEY=your_actual_gemini_api_key
```

Get a free key from: [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)

### 3. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## How to Use

1. **Register** as Student or Teacher
2. **Teacher**: Go to Teacher Dashboard → Create Quiz with AI
3. **Student**: Browse available quizzes or generate your own
4. Take quizzes and get instant feedback + score
5. View your progress and weak topics on the dashboard

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── dashboard/page.tsx    # Student dashboard
│   ├── teacher/page.tsx      # Teacher panel
│   └── quiz/
│       ├── create/page.tsx   # AI quiz generator
│       └── [id]/page.tsx    # Take quiz
├── components/
├── lib/
│   ├── auth.ts               # Authentication
│   ├── gemini.ts             # AI question generation
│   ├── storage.ts            # Quiz & attempt storage
│   └── utils.ts
└── types/index.ts
```

## Notes for Presentation

- This is a fully working frontend MVP.
- Data is stored in browser localStorage (perfect for demo & college projects).
- For production you can later add a real database (Supabase / Prisma + PostgreSQL).
- Adaptive difficulty is shown per question and can be extended to dynamically generate next questions.

## Future Improvements

- Real database + server-side auth
- Truly dynamic adaptive question generation during the quiz
- Multiplayer / live quizzes
- PDF upload → quiz generation
- Export results as PDF

---

Built for educational purposes.
