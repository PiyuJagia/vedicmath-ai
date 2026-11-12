
# VedicMath AI

An AI for Good project designed to make Vedic Mathematics accessible through interactive learning.

## Current Features

- Nikhilam multiplication using Vedic Mathematics
- Beginner, Intermediate, and Advanced difficulty levels
- Step-by-step mathematical explanations
- Carrying and borrowing logic
- FastAPI backend with interactive API documentation

## Technology Stack

- Python 3.12
- FastAPI
- VedicPy (vendored source code)

## Getting Started

### 1. Clone the repository

git clone https://github.com/PiyuJagia/vedicmath-ai.git

cd vedicmath-ai

### 2. Create a virtual environment

python -m venv .venv

### 3. Activate the environment (Windows PowerShell)

.\.venv\Scripts\Activate.ps1

### 4. Install dependencies

pip install -r requirements.txt

### 5. Start the backend

python -m uvicorn backend.main:app --reload

### 6. Open the API documentation

http://127.0.0.1:8000/docs

## Example API Request

GET /multiply/nikhilam?a=98&b=97&difficulty=beginner

Expected result: 9506

## Third-Party Attribution

This project includes a locally maintained copy of VedicPy.

Original repository:
https://github.com/utkarsh0702/vedicpy

VedicPy is distributed under the BSD 3-Clause License.
The original license is preserved in backend/vendor/vedicpy/LICENSE.

## Project Status

Backend development in progress.

Planned features include an adaptive AI Coach, Sutra Explorer,
Math Lab, practice assessments, and Sanskrit Shloka learning.
