# Prana Verify — Container & Cargo Inspection System

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-v5-2D3748?style=flat&logo=prisma)](https://www.prisma.io/)
[![Capacitor](https://img.shields.io/badge/Capacitor-v8-119EFF?style=flat&logo=capacitor)](https://capacitorjs.com/)

**Prana Verify** (`id.my.cekkontainer.app`) is an enterprise-grade Progressive Web Application (PWA) and native mobile application (Android / iOS via Capacitor) built for container logistics, cargo quality control, and pre-shipment phytosanitary verification. 

The system digitizes container inspections in ports, depots, and factories with GPS-verified multi-point photographic evidence, real-time draft persistence, bulk container processing, administrative approval workflows, and automated official verification PDF certificate generation.

---

## Table of Contents
- [1. System Overview & Core Capabilities](#1-system-overview--core-capabilities)
- [2. Tech Stack Matrix](#2-tech-stack-matrix)
- [3. Role & Permissions Matrix](#3-role--permissions-matrix)
- [4. Getting Started & How to Run](#4-getting-started--how-to-run)
  - [Prerequisites](#prerequisites)
  - [Environment Configuration](#environment-configuration)
  - [Database Setup](#database-setup)
  - [Running Development Server](#running-development-server)
  - [Building for Production](#building-for-production)
  - [Android Mobile Build (Capacitor)](#android-mobile-build-capacitor)
- [5. API Endpoints & Response Specifications](#5-api-endpoints--response-specifications)
  - [Response Standards & Rate Limiting](#response-standards--rate-limiting)
  - [Authentication API (`/api/auth`)](#authentication-api-apiauth)
  - [Inspections API (`/api/inspections`)](#inspections-api-apiinspections)
  - [Media Upload API (`/api/upload`)](#media-upload-api-apiupload)
  - [Analytics API (`/api/analytics`)](#analytics-api-apianalytics)
  - [Notifications API (`/api/notifications`)](#notifications-api-apinotifications)
  - [User Management API (`/api/users`)](#user-management-api-apiusers)
- [6. Database Architecture](#6-database-architecture)
- [7. Repository Structure](#7-repository-structure)

---

## 1. System Overview & Core Capabilities

### 📷 Multi-Point Photographic Evidence & Custom Camera
- **6-Point Photo Verification**: Captures container number with open doors, commodity details, packing tags & shipping evidence, ISPM 15 heat-treatment stamps on pallets, stacking uniformity, and slicing/moisture level checks.
- **Dedicated Fullscreen Camera**: Custom camera overlay with landscape orientation lock for wide-angle container captures, multi-camera switching, resolution optimization, and offline stream cleanup.

### 💾 Auto-Save & Reload Draft Recovery
- **Crash & Reload Resilience**: Input fields and uploaded photo URLs are automatically synchronized to client storage on every change, as well as during `beforeunload` and `pagehide` events.
- **Accidental Tab Close Recovery**: If a user reloads, switches apps on iOS/Android, or closes the browser, progress is automatically restored with an alert banner and an optional *"Hapus Draf & Mulai Baru"* reset button.
- **Post-Submission Cleanup**: Local drafts are immediately cleared upon successful server submission.

### 📍 GPS Tracking & Cached Map Rendering
- **Automatic Geolocation**: Accurate GPS coordinate capture via Capacitor Geolocation / HTML5 Geolocation API.
- **Reverse Geocoding**: Real-time address resolution down to street, sub-district, city, and postal code using OpenStreetMap Nominatim.
- **Map Tile Caching**: Static leaflet/OSM tile caching to ensure clean, high-resolution maps inside exported PDFs without CORS or network tile timeouts.

### 📦 Bulk Inspection Processing
- Verificators can submit single inspections or bulk multi-container batches (e.g. 5–50 containers under a single shipper, commodity, location, and packing tag) in a single workflow.

### 📄 Document & PDF Certificate Generation
- **Client-Side Vector PDF Rendering**: High-fidelity verification reports generated directly using `html2canvas-pro` and `jspdf`.
- **Mobile-First Layout**: Balanced 50/50 action buttons (*Cetak* / *Unduh PDF*) and responsive dialog containers with safe-area notch insets.

### 📊 Real-Time Analytics & Audit Notifications
- Turnaround Time (TAT) metrics tracking the duration from inspection creation to admin approval.
- Trend distribution for top shippers, high-frequency commodities, and status breakdowns (`approved`, `pending`, `needs_correction`).
- In-app alert system with automatic pruning of read notifications older than 30 days.

---

## 2. Tech Stack Matrix

| Domain | Technology | Version / Specification | Description |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js | `16.2.11` (App Router) | Server Components, Route Handlers, Turbopack/Webpack |
| **Runtime & Language** | React / TypeScript | React `19.2.0` / TypeScript `5` | Strict typing, zero `any` policy |
| **Styling & Design System** | Tailwind CSS / Shadcn UI | Tailwind `v4.1.9` / Radix UI | Mobile-first responsive layout, dark/light theme |
| **Database & ORM** | PostgreSQL & Prisma ORM | Prisma `5.22.0` | Relational schema with index optimizations |
| **Authentication & Session** | Jose / BcryptJS | Jose `6.1.3` / BcryptJS `3.0.3` | Edge-compatible JWT via `HttpOnly` `Secure` cookies |
| **Mobile & Hybrid App** | Capacitor | `@capacitor/core` `8.4.2` | Native Android/iOS bridges for camera & geolocation |
| **PWA Engine** | Next PWA | `@ducanh2912/next-pwa` `10.2.9` | Offline caching & installable web app manifest |
| **Document Export** | html2canvas-pro / jsPDF | `html2canvas-pro` `2.6.3`, `jspdf` `4.2.1` | Client-side DOM-to-PDF rendering with canvas rasterization |
| **File Storage** | UploadThing | `uploadthing` `7.7.4` | Cloud image storage via base64 API endpoint |
| **Validation** | Zod | Zod `3.25.76` | Server-boundary and client form input validation |

---

## 3. Role & Permissions Matrix

| Capability | Admin | Petugas Verifikasi (Verificator) | Pengguna (User) |
| :--- | :---: | :---: | :---: |
| Buat Inspeksi Tunggal (*Single*) | ✅ | ✅ | ✅ |
| Buat Inspeksi Masal (*Bulk Containers*) | ✅ | ✅ | ❌ |
| Input Tanggal Mundur (*Custom Created Date*) | ✅ | ✅ | ❌ |
| Tinjau & Verifikasi (*Approve / Revision*) | ✅ | ❌ | ❌ |
| Tulis Catatan Perbaikan (*Admin Notes*) | ✅ | ❌ | ❌ |
| Hapus Inspeksi | ✅ | ❌ | ❌ |
| Kirim Ulang Perbaikan (*Needs Correction*) | ✅ | ✅ (Milik Sendiri) | ✅ (Milik Sendiri) |
| Cetak / Unduh Dokumen Verifikasi PDF | ✅ | ✅ | ❌ |
| Cetak Sertifikat Verifikasi Resmi | ✅ | ❌ | ❌ |
| Akses Dashboard Analitik | ✅ | ❌ | ❌ |
| Manajemen Akun Pengguna (*Add/Role/Delete*) | ✅ | ❌ | ❌ |
| Google OAuth Sign-in | ❌ (Credentials) | ❌ (Credentials) | ✅ (Auto-role user) |

> [!NOTE]
> Sistem menerapkan **Single Admin Enforcement**: hanya diperbolehkan tepat 1 akun Admin dalam sistem database untuk mencegah eskalasi hak akses yang tidak sah.

---

## 4. Getting Started & How to Run

### Prerequisites
- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **Package Manager**: `npm` (v10+)
- **Database**: PostgreSQL 14+ (Local or Cloud instance e.g., Neon, Supabase, AWS RDS)
- **Java Development Kit**: JDK 21 (specifically `jbr-21` / Java 21 LTS if building for Android)
- **Android Studio**: Android Studio Ladybug / Meerkat (2024.2+) for native APK development

---

### Environment Configuration

Create a `.env` file in the root directory:

```env
# Database Configuration (PostgreSQL connection string)
DATABASE_URL="postgresql://user:password@localhost:5432/prana_verification?schema=public"

# Authentication & Session Secrets
AUTH_SECRET="your-super-secret-jwt-signing-key-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Cloud Media Storage (UploadThing)
UPLOADTHING_SECRET="sk_live_..."
UPLOADTHING_APP_ID="your_app_id"
UPLOADTHING_TOKEN="eyJhcGlLZXkiOi..."

# Google OAuth 2.0 Credentials (Optional for public sign-in)
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Capacitor Mobile App Bridge URL (Defaults to production domain if omitted)
CAPACITOR_SERVER_URL="https://cek-kontainer.my.id"

# Environment Mode
NODE_ENV="development"
```

---

### Database Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

3. **Push Schema to PostgreSQL**:
   ```bash
   npx prisma db push
   ```

*(Opsional)* Buka Prisma Studio untuk melihat data secara visual:
```bash
npx prisma studio
```

---

### Running Development Server

Jalankan server Next.js lokal:
```bash
npm run dev
```

Buka browser di [http://localhost:3000](http://localhost:3000).

---

### Building for Production

1. **Verifikasi Kualitas Kode**:
   ```bash
   npm run lint
   npx tsc --noEmit
   ```

2. **Kompilasi Build Produksi**:
   ```bash
   npm run build
   ```

3. **Jalankan Server Produksi**:
   ```bash
   npm start
   ```

---

### Android Mobile Build (Capacitor)

Prana Verify dikonfigurasi sebagai aplikasi Android native menggunakan `@capacitor/android`.

1. **Sinkronkan Aset Web ke Native Project**:
   ```bash
   npx cap sync
   ```

2. **Buka di Android Studio**:
   ```bash
   npm run cap:open:android
   ```

3. **Konfigurasi JDK di Android Studio**:
   - Pastikan Gradle JDK mengarah ke **Java 21 (JDK 21)**.
   - Lokasi JBR 21 standar di Windows: `C:\Users\<USER>\.jdks\jbr-21.0.11`.
   - *Peringatan*: Jangan gunakan Java 25 (JBR 25) karena Gradle 8.14 memerlukan bytecode compatibility versi 65 (Java 21).

4. **Kompilasi APK Debug melalui CLI**:
   ```powershell
   cd android
   .\gradlew.bat assembleDebug
   ```
   File APK akan dihasilkan di: `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## 5. API Endpoints & Response Specifications

### Response Standards & Rate Limiting

- **Base URL**: `http://localhost:3000/api` (Local) / `https://cek-kontainer.my.id/api` (Production)
- **Format Payload**: `application/json`
- **Session Authentication**: Dikirimkan via Cookie HttpOnly `session` atau Header `Authorization: Bearer <token>`.
- **Format Respons Standar**:
  ```json
  // Sukses
  {
    "data": { ... },
    "metadata": { ... } // opsional untuk pagination
  }

  // Error
  {
    "error": {
      "message": "Deskripsi kesalahan",
      "code": "BAD_REQUEST",
      "status": 400
    }
  }
  ```
- **Rate Limits**:
  - `auth`: 5 requests / menit
  - `submission`: 10 requests / menit
  - `general`: 60 requests / menit

---

### Authentication API (`/api/auth`)

#### 1. Login User
- **Method & Path**: `POST /api/auth/login`
- **Auth**: Public
- **Request Body**:
  ```json
  {
    "email": "admin@prana.id",
    "password": "SecretPassword123!"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "id": "cuid_abc123",
    "email": "admin@prana.id",
    "name": "Super Admin",
    "role": "admin",
    "avatar": null,
    "googleId": null,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
  }
  ```
  *(Set Cookie `session` secara otomatis).*

#### 2. Get Current Session
- **Method & Path**: `GET /api/auth/me`
- **Auth**: Required (`session` cookie)
- **Response `200 OK`**:
  ```json
  {
    "id": "cuid_abc123",
    "role": "admin",
    "email": "admin@prana.id",
    "name": "Super Admin"
  }
  ```

#### 3. Logout
- **Method & Path**: `POST /api/auth/logout`
- **Auth**: Required
- **Response `200 OK`**:
  ```json
  {
    "ok": true
  }
  ```
  *(Menghapus Cookie `session`).*

---

### Inspections API (`/api/inspections`)

#### 1. List Inspeksi (Paginated & Filtered)
- **Method & Path**: `GET /api/inspections`
- **Auth**: Required
- **Query Parameters**:
  - `page` (number, default: `1`)
  - `limit` (number, default: `20`, max: `100`)
  - `search` (string, pencarian shipper atau no. container)
  - `status` (`pending` | `approved` | `needs_correction`)
  - `commodityType` (string)
  - `createdBy` (string)
  - `dateFrom` (`YYYY-MM-DD`)
  - `dateTo` (`YYYY-MM-DD`)
- **Response `200 OK`**:
  ```json
  {
    "data": [
      {
        "id": 142,
        "shipperName": "PT Sumber Pangan Abadi",
        "commodityType": "Beras Organik",
        "containerNumber": "TGHU1234567",
        "inspectionLocationType": "depo",
        "inspectionLocationName": "Depo SPP",
        "verificationStage": "awal",
        "status": "pending",
        "createdAt": "2026-11-20T08:30:00.000Z",
        "location": {
          "latitude": -7.227392,
          "longitude": 112.724408,
          "address": "Jalan Ikan Mungsing III, Surabaya, Jawa Timur"
        },
        "adminNotes": null,
        "createdBy": "Budi Verifikator"
      }
    ],
    "metadata": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
  ```

#### 2. Buat Inspeksi Tunggal
- **Method & Path**: `POST /api/inspections`
- **Auth**: Required (`user`, `verificator`, `admin`)
- **Request Body**:
  ```json
  {
    "shipperName": "PT Sumber Pangan Abadi",
    "commodityType": "Beras Organik",
    "containerNumber": "TGHU1234567",
    "inspectionLocationType": "depo",
    "inspectionLocationName": "Depo SPP",
    "verificationStage": "awal",
    "notes": "Pintu kiri dibuka, muatan rapi",
    "stackingDescription": "Susunan 4 tier seragam",
    "slicingDescription": "Kadar air 12%",
    "location": {
      "latitude": -7.227392,
      "longitude": 112.724408,
      "address": "Jalan Ikan Mungsing III, Surabaya, Jawa Timur"
    },
    "photos": {
      "containerNumber": "https://utfs.io/f/photo-container.jpg",
      "commodity": "https://utfs.io/f/photo-commodity.jpg",
      "packingTag": "https://utfs.io/f/photo-tag.jpg",
      "ispmStamp": "https://utfs.io/f/photo-ispm.jpg",
      "stacking": "https://utfs.io/f/photo-stacking.jpg",
      "slicing": "https://utfs.io/f/photo-slicing.jpg"
    }
  }
  ```
- **Response `200 OK`**: Mengembalikan record inspeksi yang baru dibuat. Notifikasi `inspection_submitted` otomatis dikirimkan ke Admin.

#### 3. Buat Inspeksi Masal (Bulk Multi-Container)
- **Method & Path**: `POST /api/inspections/bulk`
- **Auth**: Required (`verificator`, `admin`)
- **Request Body**:
  ```json
  {
    "shipperName": "PT Agro Ekspor Nusantara",
    "commodityType": "Kopi Arabika",
    "containerNumbers": ["SEAU1001", "SEAU1002", "SEAU1003"],
    "inspectionLocationType": "pabrik",
    "inspectionLocationName": "Gudang Blitar",
    "verificationStage": "awal",
    "notes": "Batch kontainer kopi 3 unit",
    "location": { "latitude": -8.0983, "longitude": 112.1681 },
    "photos": {
      "commodity": "https://utfs.io/f/commodity.jpg",
      "packingTag": "https://utfs.io/f/tag.jpg",
      "ispmStamp": "https://utfs.io/f/ispm.jpg"
    }
  }
  ```
- **Response `200 OK`**: Array dari objek inspeksi yang dibuat via transaksi database atomik:
  ```json
  [
    { "id": 143, "containerNumber": "SEAU1001", "status": "pending", ... },
    { "id": 144, "containerNumber": "SEAU1002", "status": "pending", ... },
    { "id": 145, "containerNumber": "SEAU1003", "status": "pending", ... }
  ]
  ```

#### 4. Detail Inspeksi
- **Method & Path**: `GET /api/inspections/[id]`
- **Auth**: Required (Admin atau pembuat inspeksi)
- **Response `200 OK`**: Record inspeksi lengkap beserta seluruh galeri `photos` dan metadata lokasi.

#### 5. Tinjauan Admin / Kirim Ulang Perbaikan
- **Method & Path**: `PATCH /api/inspections/[id]`
- **Auth**: Required
- **Skenario A: Admin Menyetujui atau Meminta Perbaikan**:
  ```json
  {
    "status": "approved", // atau "needs_correction"
    "adminNotes": "Stempel ISPM 15 jelas dan sesuai sertifikat."
  }
  ```
- **Skenario B: Verifikator/User Mengirim Ulang Draf Perbaikan** (hanya berlaku jika status saat ini `needs_correction`):
  ```json
  {
    "notes": "Foto kontainer telah diperjelas",
    "photos": {
      "containerNumber": "https://utfs.io/f/photo-revised.jpg"
    }
  }
  ```
- **Response `200 OK`**: Record inspeksi yang telah diperbarui. Notifikasi status (`inspection_approved` atau `correction_requested`) otomatis terkirim.

#### 6. Hapus Inspeksi
- **Method & Path**: `DELETE /api/inspections/[id]`
- **Auth**: Required (Admin only)
- **Response `204 No Content`**

---

### Media Upload API (`/api/upload`)

- **Method & Path**: `POST /api/upload`
- **Auth**: Required
- **Request Body**:
  ```json
  {
    "base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQE...",
    "filename": "tag-inspection-1.jpg"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "data": {
      "url": "https://utfs.io/f/6a8d8e...-tag-inspection-1.jpg",
      "key": "6a8d8e...-tag-inspection-1.jpg"
    }
  }
  ```

---

### Analytics API (`/api/analytics`)

- **Method & Path**: `GET /api/analytics`
- **Auth**: Required (`admin`)
- **Query Parameters**: `commodityType`, `createdBy`, `dateFrom`, `dateTo`
- **Response `200 OK`**:
  ```json
  {
    "metrics": {
      "totalInspections": 128,
      "approvedCount": 110,
      "pendingCount": 12,
      "needsCorrectionCount": 6,
      "approvalRate": 85.9,
      "averageTurnaroundTimeMs": 5400000,
      "averageTurnaroundHours": "1.5"
    },
    "shipperStats": [
      { "name": "PT Samudera Logistik", "total": 45, "approved": 42 }
    ],
    "commodityDistribution": [
      { "name": "Plywood", "count": 60 }
    ],
    "trends": [
      { "date": "2026-11-18", "total": 12, "approved": 10, "pending": 2, "needsCorrection": 0 }
    ]
  }
  ```

---

### Notifications API (`/api/notifications`)

#### 1. Ambil Notifikasi Pengguna
- **Method & Path**: `GET /api/notifications`
- **Auth**: Required
- **Response `200 OK`**:
  ```json
  {
    "notifications": [
      {
        "id": 87,
        "type": "correction_requested",
        "title": "Perbaikan Diperlukan",
        "message": "Admin meminta perbaikan untuk inspeksi TGHU1234567: Foto ISPM buram",
        "read": false,
        "createdAt": "2026-11-20T09:00:00.000Z",
        "inspection": {
          "id": 142,
          "shipperName": "PT Sumber Pangan Abadi",
          "status": "needs_correction"
        }
      }
    ],
    "unreadCount": 1
  }
  ```
  *(Secara otomatis membersihkan notifikasi yang sudah dibaca lebih dari 30 hari di latar belakang).*

#### 2. Tandai Notifikasi Dibaca
- **Method & Path**: `PATCH /api/notifications/[id]`
- **Request Body**: `{"read": true}`
- **Response `200 OK`**: Objek notifikasi terupdate.

#### 3. Tandai Semua Notifikasi Dibaca
- **Method & Path**: `POST /api/notifications/mark-all-read`
- **Response `200 OK`**: `{"success": true, "count": 5}`

---

### User Management API (`/api/users`)

- `GET /api/users` (Admin only) — Mendapatkan seluruh daftar akun pengguna & perannya.
- `POST /api/users` (Admin only) — Membuat akun baru (`admin`, `verificator`, atau `user`).
- `PATCH /api/users/[id]` (Admin only) — Memperbarui role (`role: "verificator"`). Mencegah demote diri sendiri dan menjaga integritas single admin.
- `DELETE /api/users/[id]` (Admin only) — Menghapus akun pengguna selain admin utama.

---

## 6. Database Architecture

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String?
  name      String
  role      String   // "admin" | "verificator" | "user"
  googleId  String?  @unique
  avatar    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Inspection {
  id                     Int            @id @default(autoincrement())
  shipperName            String
  commodityType          String
  notes                  String?
  stackingDescription    String?
  moistureDescription    String?
  createdBy              String
  createdAt              DateTime       @default(now())
  status                 String         @default("pending") // "pending" | "approved" | "needs_correction"
  adminNotes             String?
  location               Json?
  photos                 Json?
  updatedAt              DateTime       @updatedAt
  containerNumber        String?
  inspectionLocationType String?        // "depo" | "pabrik"
  inspectionLocationName String?
  verificationStage      String?        @default("awal") // "awal" | "perpanjangan"
  notifications          Notification[]

  @@index([status])
  @@index([createdBy])
  @@index([createdAt(sort: Desc)])
  @@index([status, createdAt(sort: Desc)])
  @@index([containerNumber])
}

model Notification {
  id           Int         @id @default(autoincrement())
  userId       String
  type         String      // "inspection_submitted" | "inspection_approved" | "correction_requested"
  title        String
  message      String
  read         Boolean     @default(false)
  inspectionId Int?
  inspection   Inspection? @relation(fields: [inspectionId], references: [id], onDelete: Cascade)
  createdAt    DateTime    @default(now())

  @@index([userId])
  @@index([read])
  @@index([userId, read])
  @@index([userId, createdAt(sort: Desc)])
}
```

---

## 7. Repository Structure

```
container-inspection-app/
├── android/                   # Native Android Studio Project (Gradle & Capacitor bridge)
│   ├── app/src/main/          # AndroidManifest, Splash, Icons, Java sources
│   └── build.gradle           # Root Gradle configuration
├── app/                       # Next.js 16 App Router
│   ├── api/                   # REST API Route Handlers
│   │   ├── analytics/         # Turnaround time & KPI metrics
│   │   ├── auth/              # Login, logout, me, signup, google OAuth
│   │   ├── inspections/       # Single, bulk, ID routes
│   │   ├── notifications/     # In-app notifications & mark-read
│   │   ├── upload/            # Base64 to UploadThing cloud upload
│   │   └── users/             # Admin user management
│   ├── dashboard/             # Role-based dashboard router (Admin vs Verificator)
│   ├── login/                 # Authentication page
│   ├── layout.tsx             # Root Layout with Theme & Session Providers
│   └── page.tsx               # Landing & Redirect controller
├── components/                # React 19 UI Components
│   ├── admin-dashboard.tsx    # Admin dashboard: inspection review & analytics
│   ├── bulk-inspection-form.tsx # Batch multi-container submission form
│   ├── CameraCapture.tsx      # Fullscreen landscape camera overlay
│   ├── inspection-form.tsx    # Single container inspection form with auto-save
│   ├── verification-document.tsx # Verification report & PDF renderer
│   ├── ui/                    # Shadcn UI primitives (Dialog, Button, Tabs, etc.)
│   └── user-management.tsx    # Admin user creation & RBAC table
├── docs/                      # Technical specifications & documentation
│   ├── API.md                 # Standalone API specification
│   ├── DATABASE.md            # Database schema & indexing documentation
│   └── PRD.md                 # Product Requirement Document
├── lib/                       # Shared Utilities & Business Logic
│   ├── auth.ts                # Jose JWT signing, session verification & cookies
│   ├── db.ts                  # Global Prisma client instance
│   ├── draft-storage.ts       # Local storage auto-save draft manager
│   ├── rate-limit.ts          # In-memory sliding window rate limiter
│   └── validations.ts         # Zod schemas for boundary validation
├── public/                    # Static assets, PWA icons & manifest.json
├── capacitor.config.ts        # Capacitor mobile runtime settings
├── next.config.mjs            # Next.js & PWA compiler settings
├── package.json               # NPM scripts & dependencies
└── tsconfig.json              # TypeScript strict configuration
```

---

## 8. Lisensi & Hak Cipta
Hak Cipta © 2026 PT Prana / Cek-Kontainer. Seluruh hak dilindungi undang-undang. Dokumentasi ini disusun untuk memfasilitasi pengembangan, deployment, dan pemeliharaan sistem.
