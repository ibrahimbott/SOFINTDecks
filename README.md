# SOFINT Decks - White-Label Static PDF Presentation Tool

A high-performance, professional, and fully static web application that allows you to upload a PDF, modify it (select pages to remove/keep), and present it as a slide-deck. Features a built-in Dark Mode that smartly inverts the PDF without ruining image colors (via `invert(1) hue-rotate(180deg)`).

## Core Features

- **Client-Side Processing**: Zero backend or API requirements. Everything is processed locally in the browser memory using `pdf-lib`.
- **Intelligent Dark Mode**: Global dark mode toggle. When active, it adapts the PDF slides dynamically using CSS filters to achieve a native dark mode feel.
- **Professional Slide Viewer**: Navigate using the on-screen arrows, keyboard left/right arrows, or spacebar. Features fullscreen support.
- **Privacy & Security First**: No data leaves the user's browser. Clean, modern, and developer-branded (SOFINT).

## Architecture & Stack

- **Framework**: `React` + `Vite` for fast, modern web development.
- **Styling**: `Tailwind CSS v4` for utility-first styling and robust dark mode support.
- **Icons**: `lucide-react`.
- **PDF Extraction**: `pdf-lib` for reading and modifying local buffers.
- **PDF Viewer**: `react-pdf` (via Mozilla's `pdf.js`) for rendering high-quality canvas slides.

## Installation & Local Development

1. Ensure you have `node` and `npm` installed.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Folder Structure

```text
/
├── public/              # Static assets
├── src/
│   ├── components/      # UI components (Upload, Editor, Viewer)
│   ├── lib/             # Utilities (utils.ts)
│   ├── App.tsx          # Main React Application & State Management
│   ├── index.css        # Global Styles & Tailwind Config
│   └── main.tsx         # Entry point
├── .env.example         # Example environment configuration
├── package.json         # Project dependencies
└── vite.config.ts       # Vite bundler configuration
```

## Deployment

The application is fully static and ready for direct hosting on platforms like Netlify, Vercel, or GitHub Pages.

To build the static assets:

```bash
npm run build
```

This will produce a `dist/` directory containing all your optimized, production-ready static files.

### Vercel / Netlify Deployment

1. Connect your repository to Vercel/Netlify.
2. Select **Vite** as the framework profile (or use default configuration).
3. The build command is `npm run build` and the output directory is `dist`.

## License

MIT
