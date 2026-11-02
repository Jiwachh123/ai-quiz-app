# AI Quiz Master

An AI-powered online quiz application built with **Next.js 15, TypeScript, Tailwind CSS, and Google Gemini**. Generate quizzes, test your knowledge, receive instant explanations, and track your learning progress.

## Features

- **User Authentication:** Separate Student and Teacher roles.
- **AI Quiz Generation:** Generate questions using Google Gemini.
- **Adaptive Difficulty:** Difficulty indicators for quiz questions.
- **Student Dashboard:** View performance and learning analytics.
- **Teacher Dashboard:** Create and manage quizzes.
- **Instant Feedback:** Get answers and explanations immediately.
- **Progress Tracking:** Monitor performance and identify weak topics.
- **Modern UI:** Clean, responsive user interface.

## Tech Stack

| Category | Technology |
|---|---|
| Frontend | Next.js 15, React, TypeScript |
| Styling | Tailwind CSS |
| AI Integration | Google Gemini API |
| Authentication | LocalStorage (demo), bcryptjs |
| Icons | Lucide React |

## Getting Started

### Prerequisites

- Node.js installed
- npm installed
- Google Gemini API key

### 1. Clone the repository

```bash
git clone https://github.com/Jiwachh123/ai-quiz-app.git
cd ai-quiz-app
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure the Gemini API key

Create a `.env.local` file in the project root.

Add your Gemini API key:

```env
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
```

Get your API key from [Google AI Studio](https://aistudio.google.com/apikey).

**Security note:** The `NEXT_PUBLIC_` prefix exposes the key to the browser. This configuration should only be used for experimentation. Before deploying publicly, move Gemini API calls to server-side code and use a server-only environment variable such as `GEMINI_API_KEY`.

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Use

1. Register as a Student or Teacher.
2. Teachers can create quizzes using AI from the Teacher Dashboard.
3. Students can browse available quizzes or generate their own.
4. Take quizzes and receive instant feedback and scores.
5. Track performance and identify weak topics through the dashboard.

## Project Structure

```text
src/
├── app/
│   ├── page.tsx
│   ├── login/
│   ├── register/
│   ├── dashboard/
│   ├── teacher/
│   └── quiz/
│       ├── create/
│       └── [id]/
├── components/
├── lib/
│   ├── auth.ts
│   ├── gemini.ts
│   ├── storage.ts
│   └── utils.ts
└── types/
    └── index.ts
```

## Current Project Status

This project is a working frontend MVP.

- User and quiz data are stored in browser LocalStorage.
- Authentication is implemented for demonstration purposes.
- Adaptive difficulty indicators are available and can be extended with dynamic question generation.

## Future Improvements

- Integrate a real database using Supabase or PostgreSQL.
- Implement secure server-side authentication.
- Add dynamic adaptive question generation.
- Introduce multiplayer and live quizzes.
- Support PDF uploads for quiz generation.
- Export quiz results as PDF reports.

## Author

**Jiwachh Kumar Yadav**

GitHub: [@Jiwachh123](https://github.com/Jiwachh123)

---

Built with ❤️ for educational purposes.