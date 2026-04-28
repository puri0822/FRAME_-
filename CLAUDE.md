# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

No build step required. Open `yorijori/index.html` directly in a browser. All state is persisted via `localStorage`—no backend or server needed.

## Architecture

**요리조리 (YoriJori)** is a Korean-language, mobile-first SPA for AI-assisted recipe discovery and ingredient management. It is written in vanilla HTML/CSS/JS with no framework or bundler.

All application logic lives in three files:

| File | Role |
|---|---|
| `yorijori/index.html` | Markup for all pages (rendered simultaneously, toggled by CSS) |
| `yorijori/app.js` | All feature modules (~2,870 lines) |
| `yorijori/style.css` | All styles including CSS custom properties (~3,988 lines) |

### Page / Module Layout (`app.js`)

Each major feature is an IIFE module with its own state:

- **Storage** (line 6) — `localStorage` read/write helpers; keys prefixed `yorijori_` or `yrj_`
- **Router** (line 39) — tab-based SPA navigation with history stack; calls `render()` on each module
- **Fridge** (line 130) — ingredient inventory (add, remove, expiry tracking, category filter)
- **RECIPES** (line 1032) — static recipe database (10+ recipes with ingredients, steps, YouTube links)
- **Explore** (line 1379) — recipe discovery, search, category/ingredient filtering, favorites
- **Home** (line 1892) — AI chat interface (rule-based keyword matching, no real API)
- **RecipeModal** (line 2161) — recipe detail overlay with user reviews and photo previews
- **PhotoLightbox** (line 2515) — full-screen image gallery for review photos
- **Settings** (line 2643) — font family, font size, and login state preferences

### Navigation & Rendering Pattern

Pages are absolutely positioned and toggled via CSS classes (`active`). Switching tabs calls the relevant module's `render()` function. The `AddIngredient` subpage is pushed onto a history stack and popped with the back button.

### Data Models

```js
// Ingredient (stored in yorijori_ingredients)
{ id, name, category, expiryDate, count }

// Recipe (static in RECIPES array)
{ id, emoji, name, category, ingredients[], cookTime, difficulty, steps[], youtubeUrl, likeCount }

// Review (stored per recipe)
{ user, rating, photoEmoji, gradient, text }
```

### Styling Conventions

CSS custom properties define the design system:
- `--color-primary: #FF6B35` (orange brand color)
- `--nav-height: 64px`
- `--radius-lg: 16px`
- `--transition-page: 220ms ease`

Dark/light theming and three font sizes (`small`/`medium`/`large`) are applied by toggling classes on `<body>`. Google Fonts (Nanum Gothic, Noto Serif KR) are loaded from the CDN.

### localStorage Keys

| Key | Content |
|---|---|
| `yorijori_tab` | Active page id |
| `yorijori_ingredients` | User's fridge inventory (JSON array) |
| `yorijori_favorites` | Favorited recipe IDs (JSON array) |
| `yrj_font` | Selected font family |
| `yrj_font_size` | `small` / `medium` / `large` |
| `yrj_show_chips` | Whether quick-action chips are visible |
