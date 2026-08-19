# 🧠 AI-Powered Intelligent MCQ Platform & Exam Engine

An advanced, full-featured AI-driven examination platform that transforms any textbook, notes, scanned PDF, or screenshot into realistic, high-quality Multiple Choice Question (MCQ) exams with instant timer-based test runner, LaTeX math rendering, Bengali & English bilingual support, and in-depth performance analytics.

---

## ✨ Key Features

- **🚀 Dual AI Generation Engine:**
  - **Google Gemini 3.6 Flash:** Generates flawless, ChatGPT-quality exams directly from your study material with clean distractors, authentic options, and multi-part explanations. Supports both legacy (`AIza...`) and modern (`AQ...`) API key formats.
  - **Built-in Smart NLP Engine:** 100% offline fallback that automatically parses vocabulary, definitions, antonyms, and synonyms from documents when no API key is present.
- **📄 High-Speed PDF & Image OCR:**
  - Parallel multi-threaded OCR scanning supporting up to **250 pages** at once (`eng` + `ben` bilingual support).
  - Direct screenshot pasting (**Ctrl+V**) to extract and generate questions from screen captures.
- **📐 Full LaTeX Mathematical & Scientific Notation:**
  - Built-in **KaTeX** rendering for algebraic equations, fractions, square roots, calculus, and scientific formulas (e.g. $a + \frac{1}{a} = \sqrt{3}$).
- **🇧🇩 Bilingual Exam Support:**
  - Automatically detects the language of your study material and generates questions, options, and explanations entirely in Bengali or English.
- **⏱️ Timed Scrolling Exam Runner:**
  - Realistic test interface with auto-submitting countdown timer (calculated dynamically at 30 seconds per question).
  - Quick-navigation question mini-map and smooth scrolling.
- **📊 Comprehensive Results & Explanations:**
  - Score breakdown, accuracy rates, time spent, and detailed 3-part explanations (Why Correct, Why Incorrect, Key Concept).

---

## 🛠️ Tech Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS
- **Icons & UI:** Lucide React, Canvas Confetti
- **Math Rendering:** KaTeX
- **Document Processing:** PDF.js + Tesseract.js (Parallel Web Workers)
- **AI Integration:** Google Gemini REST API (`gemini-3.6-flash`)

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/your-username/mcqgithub-tool.git
cd mcqgithub-tool
```

### 2. Install dependencies
```bash
npm install
```

### 3. (Optional) Set up Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Add your free Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey). You can also enter it anytime directly within the in-app Settings modal.

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser!

### 5. Build for Production
```bash
npm run build
```

---

## 📦 Publishing to GitHub

To push this project to your GitHub account:

```bash
git init
git add .
git commit -m "Initial commit: Intelligent MCQ Platform"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git
git push -u origin main
```

---

## 📄 License
MIT License. Open source and free to use!
