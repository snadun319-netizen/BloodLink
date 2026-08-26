# BloodLink - Smart Blood Donation Coordination System

[![React Native](https://img.shields.io/badge/React_Native-0.74+-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![PostGIS](https://img.shields.io/badge/PostGIS-Spatial_DB-008080?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgis.net/)
[![Firebase FCM](https://img.shields.io/badge/Firebase_FCM-Push_Alerts-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)

**BloodLink** is a smart, centralized blood donation management and donor coordination system designed to bridge the communication gap between healthcare institutions (hospitals and blood banks) and eligible blood donors in Sri Lanka.

> **Academic Context**: SE5104 Mini Project | Group 7 | Department of Software Engineering, Faculty of Computing, Sabaragamuwa University of Sri Lanka.

---

## Key Features

### 1. Donor Mobile Application (React Native + TypeScript)
* **Donor Profiles & Registration**: Register with personal details and blood group verification.
* **Document Verification**: Upload medical/official documents to verify blood group authenticity.
* **Availability Toggle**: Donors can toggle their availability status (`Available` / `Unavailable`).
* **Blood Request Feed**: View real-time blood requirements posted by nearby hospitals.
* **Donation History & Eligibility Tracking**: Automatically tracks past donations and calculates the next eligible donation date (e.g. 3-month medical interval).
* **Push Notifications**: Receive instant emergency push alerts when matching blood is urgently needed nearby.

### 2. Hospital & Blood Bank Web Dashboard (React + TypeScript)
* **Blood Stock Inventory**: Monitor and manage stock levels per blood group with clear status indicators (`Normal`, `Low`, `Critical`).
* **Request Creation**: Post targeted blood requests categorized by priority (`Normal`, `Urgent`, `Emergency`).
* **Donor Response Tracking**: Track real-time donor responses (Accept/Decline) to active requests.

### 3. Smart Donor Matching Engine (Node.js + PostGIS)
* **Multi-Criteria Filtering**: Matches donors based on **Verified Blood Group**, **Eligibility Interval**, and **Availability**.
* **Geospatial Proximity Radius**: Uses PostGIS spatial queries (`ST_DWithin`) to find donors within a target radius from the requesting institution.
* **Targeted Dispatch**: Delivers push notifications via Firebase Cloud Messaging (FCM) *only* to eligible, nearby donors, avoiding notification fatigue.

### 4. Administration, Verification & Security
* **Institution Approval**: Verification workflow for participating hospitals, blood banks, and staff accounts.
* **Document Review**: Admin interface to inspect and verify uploaded donor blood group proof.
* **Role-Based Access Control (RBAC)**: Strict permission boundaries for Donors, Hospital Staff, and Administrators.
* **Privacy & Security**: Built in compliance with Sri Lanka's Personal Data Protection Act (PDPA) No. 9 of 2022. Server-side spatial matching ensures raw donor location coordinates are never publicly exposed.

---

## System Architecture

```
                                  +------------------------------+
                                  |     BloodLink System         |
                                  +--------------+---------------+
                                                 |
         +---------------------------------------+---------------------------------------+
         |                                       |                                       |
         v                                       v                                       v
+---------------------------------+  +-----------------------------------+  +----------------------------------+
|      Donor Mobile App           |  |    Hospital & Admin Dashboard     |  |       Backend REST API           |
|    (React Native + Expo)        |  |        (React + TypeScript)       |  |   (Node.js + Express + TS)       |
+---------------------------------+  +-----------------------------------+  +----------------+-----------------+
                                                                                             |
                                           +-------------------------------------------------+-------------------------------------------------+
                                           |                                                 |                                                 |
                                           v                                                 v                                                 v
                               +-----------------------+                         +-----------------------+                         +-----------------------+
                               | PostgreSQL + PostGIS  |                         | Firebase FCM Service  |                         | Google Maps Platform  |
                               | (Geospatial Database) |                         |  (Push Notifications) |                         |  (Location Services)  |
                               +-----------------------+                         +-----------------------+                         +-----------------------+
```

---

## Project Modules & Ownership

The project is structured into four core engineering modules:

| Module | Core Component | Scope & Responsibilities |
| :--- | :--- | :--- |
| **Module 1** | **Donor Mobile Application & Donor Coordination UI** | Mobile app development in React Native + TypeScript, donor registration, availability toggles, request viewing, donation history, mobile integration, and UI testing. |
| **Module 2** | **Hospital/Blood-Bank Dashboard & Blood Request Workflow** | Web dashboard development in React + TypeScript, stock-status interface, request creation workflows, hospital management interfaces. |
| **Module 3** | **Donor Matching & Notification Engine** | Backend service development in Node.js + Express, PostGIS geospatial matching algorithms, eligibility interval calculations, FCM push notifications. |
| **Module 4** | **Administration, Verification & Security Module** | Administrative verification of institutions and staff, donor document review workflow, Role-Based Access Control (RBAC), audit logging, security compliance. |

---

## Repository Structure

```
BloodLink/
├── mobile-app/       // React Native + TypeScript donor application (Expo)
│   ├── src/          // Screens, components, navigation, services
│   ├── assets/       // Icons, images, fonts
│   └── tests/        // Mobile unit and component tests
├── web-dashboard/    // React + TypeScript institution/admin dashboard
│   ├── src/          // Pages, components, state management, services
│   ├── public/       // Static web assets
│   └── tests/        // Web unit and integration tests
├── backend/          // Node.js + Express + TypeScript REST API
│   ├── src/
│   │   ├── controllers/ // API route request handlers
│   │   ├── services/    // Matching, notification & verification logic
│   │   ├── models/      // Database models / ORM entities
│   │   ├── middleware/  // JWT auth, RBAC, input validation
│   │   └── routes/      // API endpoint routing definitions
│   └── tests/        // API & integration unit tests
├── database/         // PostgreSQL schema, PostGIS migrations, seed data
│   ├── migrations/   // Database migration scripts
│   └── seed/         // Seed data for local development
├── docs/             // Complete project documentation & contributing guidelines
│   ├── PROJECT_OVERVIEW.md // Exhaustive technical proposal summary & reference
│   └── CONTRIBUTING.md   // Git branching workflow & contribution rules
└── .github/          // PR templates, issue templates, CI/CD workflows
```

---

## Getting Started

### Prerequisites
* **Node.js**: `v20.x` or higher *(Tested on v24.x)*
* **npm**: `v10.x` or higher
* **PostgreSQL** (with **PostGIS** extension enabled)
* **Expo Go App** (installed on mobile device for testing `mobile-app`)

### 1. Repository Setup & Branching
Ensure you follow your team's branching policy in [CONTRIBUTING.md](file:///d:/Programming/Github/BloodLink/BloodLink/docs/CONTRIBUTING.md):
```bash
# Clone the repository
git clone https://github.com/snadun319-netizen/BloodLink.git
cd BloodLink

# Checkout the develop branch and create your feature branch
git checkout develop
git checkout -b feature/your-feature-name
```

### 2. Running the Donor Mobile App
```bash
cd mobile-app
npm install
npx expo start
```
*Scan the generated QR code using the **Expo Go** application on your mobile device.*

### 3. Running the Backend REST API
```bash
cd backend
npm install
cp .env.example .env
# Configure your PostgreSQL connection strings in .env
npm run dev
```

### 4. Running the Web Dashboard
```bash
cd web-dashboard
npm install
npm run dev
```

---

## Documentation

* **[Comprehensive Technical Project Overview](file:///d:/Programming/Github/BloodLink/BloodLink/docs/PROJECT_OVERVIEW.md)** — Exhaustive documentation covering problem statement, gap analysis, functional/non-functional requirements, database ER diagram, security & PDPA compliance, and testing plan.
* **[Contribution Guidelines](file:///d:/Programming/Github/BloodLink/BloodLink/docs/CONTRIBUTING.md)** — Branching rules, PR guidelines, and commit standards.

---

## Security & Privacy Statement

BloodLink processes personal information, including blood groups and location data, subject to **Sri Lanka's Personal Data Protection Act (PDPA) No. 9 of 2022**. 
* Donor location coordinates are used exclusively server-side for radius matching and are **never exposed to other users or public APIs**.
* Verification documents are protected behind authenticated access endpoints.
* No API keys, credentials, or private verification documents should ever be committed to git.
