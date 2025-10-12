# GAUR Enhanced Police Cyber Patrolling System

## Project Overview

This is a full-stack application designed for law enforcement agencies to perform cyber patrolling and fraud detection. The project consists of a Python backend, a Next.js frontend, and a PostgreSQL database. The system is optimized for M2 MacBook with 8GB RAM and utilizes various AI/ML models for fraud detection.

**Key Technologies:**

*   **Backend:**
    *   **Framework:** FastAPI
    *   **Database:** PostgreSQL, SQLAlchemy, Alembic
    *   **AI/ML:** PyTorch, Transformers, Sentence-Transformers, OpenAI (for GPT-4 Vision), OpenCV, EasyOCR
    *   **Scraping:** Selenium, Telethon, Pyrogram
    *   **Authentication:** JWT with `python-jose` and `passlib`
*   **Frontend:**
    *   **Framework:** Next.js, React, TypeScript
    *   **State Management:** Zustand
    *   **Styling:** Tailwind CSS
    *   **API Client:** Axios

## Building and Running

### Backend

1.  **Activate Conda Environment:**
    ```bash
    conda activate gaur
    ```

2.  **Configure Environment:**
    *   Copy `.env.example` to `.env` in the `backend` directory and fill in the required credentials.
    ```bash
    cp backend/.env.example backend/.env
    ```

3.  **Run the server:**
    ```bash
    python backend/run.py
    ```
    The backend will be available at `http://localhost:8000`.

### Frontend

1.  **Install Dependencies:**
    ```bash
    cd frontend
    npm install
    ```

2.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The frontend will be available at `http://localhost:3001`.

### Testing

*   **Frontend Type Check:**
    ```bash
    npm run type-check
    ```
*   **Frontend Linting:**
    ```bash
    npm run lint
    ```

## Development Conventions

*   **Backend:**
    *   The backend follows a standard FastAPI project structure with a dedicated `app` directory containing the main application logic.
    *   The API is versioned under `app/api/v1/`.
    *   Database models are defined in `app/models/` and database interactions are handled through SQLAlchemy.
    *   The application uses `loguru` for logging.
*   **Frontend:**
    *   The frontend uses Next.js with the App Router.
    *   State management is handled by Zustand.
    *   API requests are centralized in `frontend/src/lib/api.ts`.
    *   Types for API responses and authentication are defined in `frontend/src/types/`.
*   **Database:**
    *   Database migrations are managed with Alembic, but the `versions` directory is currently empty. It is recommended to create an initial migration.
