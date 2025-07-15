# Clarity & Peace

Clarity & Peace is your personal companion for stress management and well-being. This application helps you track your stress levels, provides personalized AI-driven insights, and guides you through calming breathing exercises.

## 🌊 Application Flow & Features

The application provides a seamless journey for users to manage their well-being:

1.  **Authentication:** Users start by signing up or signing in on the **Login Page**. The system uses Supabase for secure authentication.
2.  **Dashboard:** After logging in, users land on the **Dashboard**, which serves as a central hub with quick links to all major features.
3.  **Stress Tracking:** Users navigate to the **Stress Tracker** to log their current stress level (from 1 to 5) and add optional notes. This is the primary way users input data into the system.
4.  **Guided Exercises:** If a user records a high stress level, they are prompted to begin an **AI-Guided Breathing Exercise**. These sessions are dynamically tailored to the user's reported stress, featuring a calming voice, personalized guidance, and configurable background music.
5.  **Review & Reflect:** Users can review their past entries in the **History** tab or on the **Calendar View**, which provides a color-coded overview of their stress patterns over time.
6.  **AI Insights:** On the **AI Insights** page, users can generate a detailed analysis of their stress data. The AI provides personalized recommendations, identifies patterns, and offers encouragement.
7.  **Profile Management:** The **Profile Page** allows users to update their name (used for personalizing the AI's guidance) and change their password.
8.  **Admin Panel:** A secure **Admin Dashboard** is available exclusively for the admin user (`clarityandpeace@pxdmail.com`) to monitor app usage, manage users, configure exercise music, and run system diagnostics.

## 📄 Pages & Components Breakdown

### Core User Pages

*   **`src/app/login/page.tsx` (Login Page):**
    *   Handles user sign-in and sign-up.
    *   Presents feature highlights to new users.
    *   Redirects authenticated users to the dashboard.

*   **`src/app/page.tsx` (Dashboard):**
    *   The main landing page after login.
    *   Provides quick navigation cards to key features: Stress Tracker, AI Insights, and Breathing Exercises.

*   **`src/app/stress-tracker/page.tsx` (Stress Tracker):**
    *   Features a tabbed interface for "Track Stress", "History", and "Calendar View".
    *   **Track Stress:** Allows users to select a stress level (1-5) and add optional notes. On submission, it can trigger a voice message and redirect to a breathing exercise.
    *   **History:** Shows a list of recent stress entries and key stats.
    *   **Calendar View:** Renders the `StressCalendar` component for a visual overview.

*   **`src/app/ai-insights/page.tsx` (AI Insights):**
    *   Displays key statistics derived from the user's stress entries.
    *   Features a button to trigger an AI analysis via the `analyze-stress` Edge Function.
    *   Renders the AI-generated insights and recommendations using `ReactMarkdown`.

*   **`src/app/breathing-exercise/page.tsx` (Breathing Exercise):**
    *   Presents exercise options if no stress level is provided via the URL.
    *   Renders the `BreathingExerciseAssistant` component to run the guided session.

*   **`src/app/profile/page.tsx` (Profile Page):**
    *   Allows users to update their first and last name.
    *   Provides a form to change their password.

### Key Components

*   **`src/components/breathing-exercise-assistant.tsx`:**
    *   The core of the guided exercise feature.
    *   Dynamically configures exercise stages and durations based on the input `stressLevel`.
    *   Uses `openaiVoiceService` to generate guidance text and convert it to speech.
    *   Manages audio playback for both voice and background music, including fade-in/fade-out effects.
    *   Allows users to configure voice and volume settings.

*   **`src/components/stress-calendar.tsx`:**
    *   Visualizes stress entries on a monthly calendar.
    *   Days are color-coded based on the average stress level.
    *   Clicking a day shows detailed entries for that date.

*   **`src/components/session-context-provider.tsx`:**
    *   Manages the global authentication state using React Context.
    *   Handles automatic redirects between the login page and the main app based on auth status.

### Admin Panel

*   **`src/app/admin/page.tsx` & `src/components/admin/admin-dashboard.tsx`:**
    *   A secure dashboard restricted to the admin user.
    *   **Analytics Tab:** Shows high-level usage statistics.
    *   **User Management Tab:** Lists all registered users and their activity details.
    *   **Music Management Tab:** Renders the `MusicManagement` component.
    *   **Debug Tab:** Provides tools for system and TTS diagnostics.

*   **`src/components/admin/music-management.tsx`:**
    *   Allows the admin to upload, manage, and delete background music tracks.
    *   Provides an interface to assign specific music, volumes, and fade durations to each phase of the breathing exercises.

### Services & Edge Functions

*   **`src/lib/openai-voice-service.ts`:** A client-side service that abstracts calls to Supabase Edge Functions for generating speech and guidance text.
*   **`supabase/functions/`:**
    *   **`generate-speech`:** Generates an MP3 audio stream from text using the OpenAI API.
    *   **`generate-breathing-guidance`:** Generates personalized, calming text for the breathing exercises.
    *   **`analyze-stress`:** Generates a summary and recommendations based on a user's stress history.
    *   **`admin-service`:** A secure function for admin actions, using the service role key to bypass RLS for fetching all user data and analytics.

## 🚀 Tech Stack

This application is built using a modern and robust set of technologies:

*   **Framework**: [Next.js](https://nextjs.org) (App Router)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **UI Components**: [Shadcn/UI](https://ui.shadcn.com/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **Icons**: [Lucide React](https://lucide.dev/icons/)
*   **Forms**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
*   **State Management**: React Context API & `useState` / `useReducer`
*   **Notifications**: [Sonner](https://sonner.emilkowalski.com/)
*   **Backend**: [Supabase](https://supabase.com/) (PostgreSQL, Auth, Edge Functions, Storage)
*   **AI/TTS**: [OpenAI API](https://openai.com/docs/api/)

## 🛠️ Getting Started

First, ensure you have Node.js (v18 or higher) and a package manager (npm, yarn, pnpm, or bun) installed.

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd <repository-name>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up Supabase:**
    *   Create a new project on [Supabase](https://supabase.com/).
    *   Go to Project Settings -> API and copy your `Project URL` and `anon public` key.
    *   Create a `.env.local` file in the root of your project and add the following:
        ```
        NEXT_PUBLIC_SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
        NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
        ```
    *   **For AI Features & Admin Dashboard:** You need to set up an OpenAI API key and Supabase Service Role Key as secrets in your Supabase project.
        *   Go to your Supabase project dashboard -> Edge Functions -> Manage Secrets.
        *   Add a new secret named `OPENAI_API_KEY` with your OpenAI API key.
        *   Add a new secret named `SUPABASE_SERVICE_ROLE_KEY` with your Supabase Service Role Key (found under Project Settings -> API -> Project API keys).
    *   **Database Schema:** Ensure your Supabase database has the necessary tables (`profiles`, `stress_entries`, `background_music`, `exercise_music_settings`) and RLS policies configured.
    *   **Edge Functions:** The application relies on several Supabase Edge Functions. These are automatically deployed when you make changes to the `supabase/functions` directory.

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🚀 Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.