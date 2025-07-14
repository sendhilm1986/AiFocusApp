# Clarity & Peace

![Clarity & Peace Logo](public/logo.png) <!-- Assuming you have a logo.png in your public folder -->

Clarity & Peace is your personal companion for stress management and well-being. This application helps you track your stress levels, provides personalized AI-driven insights, and guides you through calming breathing exercises.

## 🌟 Features

*   **Stress Tracker:** Easily log your daily stress levels (1-5) and add optional notes to understand what contributes to your stress. View your stress history in a list or a comprehensive calendar view.
*   **AI Insights:** Get personalized analysis and actionable recommendations based on your recorded stress patterns. The AI identifies trends and suggests practical advice for stress management.
*   **AI-Guided Breathing Exercises:** Engage in dynamic breathing sessions tailored to your current stress level. The AI voice agent provides real-time guidance, and you can customize background music and voice preferences.
*   **User Profiles:** Manage your personal information, including first name and last name, which the AI uses to personalize your experience.
*   **Authentication:** Secure user authentication powered by Supabase, allowing users to sign up and sign in securely.
*   **Admin Dashboard (for `clarityandpeace@pxdmail.com`):**
    *   **Usage Analytics:** View key metrics like total users, active users, total stress entries, and average stress levels.
    *   **User Management:** See a list of all users, their registration dates, last sign-in, and stress entry counts.
    *   **Music Management:** Upload, activate/deactivate, and delete background music tracks. Configure specific music, volume, and fade settings for each phase of the breathing exercises.
    *   **Diagnostics:** Run system and Text-to-Speech (TTS) diagnostics to ensure all services are running correctly.

## 🚀 Tech Stack

This application is built using a modern and robust set of technologies:

*   **Framework**: [Next.js](https://nextjs.org) (App Router)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **UI Components**: [Shadcn/UI](https://ui.shadcn.com/) - A collection of re-usable UI components built with Radix UI and Tailwind CSS.
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework for rapid UI development.
*   **Icons**: [Lucide React](https://lucide.dev/icons/) - A comprehensive library of simply beautiful SVG icons.
*   **Forms**: [React Hook Form](https://react-hook-form.com/) for managing form state and validation, typically with [Zod](https://zod.dev/) for schema validation.
*   **State Management**: Primarily React Context API and built-in React hooks (`useState`, `useReducer`).
*   **Notifications/Toasts**: [Sonner](https://sonner.emilkowalski.com/) for displaying non-intrusive notifications.
*   **Database & Auth**: [Supabase](https://supabase.com/) - An open-source Firebase alternative providing PostgreSQL database, Authentication, Edge Functions, and Storage.
*   **AI/TTS**: [OpenAI API](https://openai.com/docs/api/) for Text-to-Speech (TTS) and AI guidance generation, integrated via Supabase Edge Functions.
*   **Charts**: [Recharts](https://recharts.org/en-US/) for data visualization (though not extensively used in current views, available).
*   **Animation**: `tailwindcss-animate` and animation capabilities built into Radix UI components.

## 🛠️ Getting Started

First, ensure you have Node.js (v18 or higher) and npm/yarn/pnpm/bun installed.

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd clarity-peace
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    # or
    bun install
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
    *   **Database Schema:** Ensure your Supabase database has the necessary tables (`profiles`, `stress_entries`, `background_music`, `exercise_music_settings`) and RLS policies configured. The application expects these to be in place.
    *   **Edge Functions:** The application relies on several Supabase Edge Functions (`admin-service`, `generate-speech`, `generate-breathing-guidance`, `test-openai-key`). These are automatically deployed when you make changes to the `supabase/functions` directory.

4.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    # or
    bun dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

    You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

## 📚 Learn More

To learn more about Next.js, take a look at the following resources:

*   [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
*   [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## 🚀 Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.