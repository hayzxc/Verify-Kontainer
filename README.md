# Prana Container Inspection System

A modern, responsive, progressive web application (PWA) built with Next.js App Router, Prisma ORM, PostgreSQL, and Google OAuth 2.0.

## Features

- **3-Tier Role Permissions**:
  - **Admin**: Single-administrator account for photo verification review, "Benar" vs revision comments, user management, and official PDF certificate export.
  - **Petugas Verifikasi (Verificator)**: Internal staff accounts for submitting inspections and exporting multi-container verification documents.
  - **Pengguna (User)**: Public user registration via Google OAuth 2.0 or credentials for container inspection entries and submission tracking.
- **Google OAuth 2.0 Authentication**: One-click Google sign-in with automatic assignment of standard user role.
- **Photo Evidence Verification**: 6-point container photo documentation (Packing Tag, Serial Plate, Cargo, ISPM Stamp, Stacking, Slicing).
- **GPS Location Tracking**: Real-time geolocation capture with reverse geocoding via OpenStreetMap.
- **Full Responsive Design**: Optimized layouts for mobile viewports (360px - 430px) and desktop web views.
- **PWA & Offline Support**: Progressive Web App capabilities with offline asset caching.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database & ORM**: PostgreSQL & Prisma ORM v5
- **Authentication**: Jose JWT Tokens (HttpOnly cookies) & Google OAuth 2.0
- **Styling**: Tailwind CSS & Shadcn UI Components
- **File Storage**: UploadThing

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your database URL and Google OAuth credentials:
```bash
cp .env.example .env
```

### 3. Generate Prisma Client & Push Database Schema
```bash
npx prisma generate
npx prisma db push
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build & Production

```bash
npm run build
npm start
```
