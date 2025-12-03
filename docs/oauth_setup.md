# Supabase OAuth Setup Guide

This guide explains how to configure Google, Kakao, and Discord login for your Supabase project.

## Prerequisites

1.  Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2.  Select your project.
3.  Go to **Authentication** -> **Providers**.
4.  You will need the **Callback URL** (Redirect URL) from Supabase. It usually looks like:
    `https://<your-project-ref>.supabase.co/auth/v1/callback`
    *Copy this URL, you will need it for all providers.*

---

## 1. Google OAuth

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a new project (or select an existing one).
3.  Search for **"APIs & Services"** -> **"OAuth consent screen"**.
    *   Select **External** (unless you are G-Suite only).
    *   Fill in the App Name, User Support Email, and Developer Contact Email.
    *   Click **Save and Continue**.
4.  Go to **"Credentials"** -> **"Create Credentials"** -> **"OAuth client ID"**.
    *   **Application type**: Web application.
    *   **Name**: `SSAP` (or your app name).
    *   **Authorized JavaScript origins**: `http://localhost:3000` (and your production URL later).
    *   **Authorized redirect URIs**: Paste the **Supabase Callback URL** here.
5.  Click **Create**.
6.  Copy the **Client ID** and **Client Secret**.
7.  Go back to **Supabase Dashboard** -> **Providers** -> **Google**.
8.  Paste the Client ID and Secret.
9.  Enable **"Enable Sign in with Google"**.
10. Click **Save**.

---

## 2. Discord OAuth

1.  Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2.  Click **New Application**.
    *   **Name**: `SSAP`.
3.  Go to the **OAuth2** tab in the sidebar.
4.  Under **"Redirects"**, click **Add Redirect**.
    *   Paste the **Supabase Callback URL**.
5.  Copy the **Client ID**.
6.  Click **Reset Secret** to generate and copy the **Client Secret**.
7.  Go back to **Supabase Dashboard** -> **Providers** -> **Discord**.
8.  Paste the Client ID and Secret.
9.  Enable **"Enable Sign in with Discord"**.
10. Click **Save**.

---

## 3. Kakao OAuth

1.  Go to the [Kakao Developers Console](https://developers.kakao.com/console/app).
2.  Click **Add an application**.
    *   **App Name**: `SSAP`.
    *   **Company Name**: (Your name or company).
3.  Go to **"Platform"** in the sidebar.
    *   Under **Web**, click **Register Web Domain**.
    *   Add `http://localhost:3000` (and your production URL later).
    *   Add `https://<your-project-ref>.supabase.co` (Your Supabase domain).
4.  Go to **"Kakao Login"** in the sidebar.
    *   **Status**: Turn **ON**.
    *   **Redirect URI**: Click **Register Redirect URI** and paste the **Supabase Callback URL**.
5.  Go to **"App Keys"** in the sidebar.
    *   Copy the **REST API Key** (This is your Client ID).
6.  (Optional) For Client Secret:
    *   Go to **"Kakao Login"** -> **"Security"**.
    *   Generate a **Client Secret Code**.
7.  Go back to **Supabase Dashboard** -> **Providers** -> **Kakao**.
    *   **Client ID**: Paste the **REST API Key**.
    *   **Client Secret**: Paste the **Client Secret Code** (if generated) or leave blank if Supabase doesn't require it (Supabase usually requires the REST API Key as Client ID and Client Secret Code as Secret).
8.  Enable **"Enable Sign in with Kakao"**.
9.  Click **Save**.

---

## Final Step: Next.js Configuration

Ensure your `.env.local` file has the correct Supabase URL and Anon Key:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

You do **NOT** need to put the Google/Discord/Kakao keys in your `.env.local`. Supabase handles the handshake for you.
