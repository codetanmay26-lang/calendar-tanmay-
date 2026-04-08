# Wall Calendar UI

> A polished calendar planning interface for organizing notes, holidays, and date-range context with a tactile, responsive dashboard feel.

[![Made with React](https://img.shields.io/badge/Made%20with-React-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![Built with Vite](https://img.shields.io/badge/Built%20with-Vite-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Styled with TailwindCSS](https://img.shields.io/badge/Styled%20with-Tailwind-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Motion](https://img.shields.io/badge/Motion-Framer%20Motion-ff4d8d?style=flat-square)](https://www.framer.com/motion/)
[![Colors](https://img.shields.io/badge/Palette-Colorthief-0ea5e9?style=flat-square)](https://lokeshdhakar.com/projects/color-thief/)

## Overview

Wall Calendar UI is a frontend calendar experience focused on planning and visual context. It combines month and date interactions, note management, holiday awareness, range-based planning cues, and dynamic theme styling into a single responsive interface.

## What It Does

- Displays a wall-calendar style view with date navigation
- Lets users create and review notes tied to a single day or a date range
- Highlights holidays and region-based observances
- Surfaces planning insights from selected date ranges
- Uses animated transitions to keep interactions fluid and readable
- Supports light and dark presentation with palette-driven accents

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, Vite, JavaScript |
| Styling | Tailwind CSS |
| Motion | Framer Motion |
| Color Utilities | ColorThief |

## Prerequisites

- Node.js 18+
- npm

## Installation and Run

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run preview
```

## Usage

1. Open the app in the browser.
2. Move through the calendar to inspect dates and months.
3. Add or review notes for specific days or ranges.
4. Use holiday and planning context to organize events.
5. Switch themes or palette modes as needed.

## Project Structure

```text
wall-calendar-ui
|- public
|- src
|  |- assets
|  |- App.jsx
|  |- App.css
|  |- index.css
|  |- main.jsx
|- index.html
|- package.json
|- README.md
```

## Approach

- Kept the interface centered on calendar-first workflows rather than generic dashboard widgets
- Used small utility functions to keep date, note, and holiday logic readable
- Added motion and palette variation to make the planner feel more tactile and alive
- Designed the layout to remain usable on desktop and smaller screens

## Author

- Name: Tanmay Sharma
- Email: sharmatanmay875@gmail.com
