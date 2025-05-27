# YT Outline & Snap

A Chrome extension overlay for YouTube Watch pages that generates summaries using Gemini API and captures video snapshots.

## Features

- **Summary Generation**: Uses Gemini 2.5 Pro API to analyze video transcripts and on-screen content
- **Snapshot Capture**: Take screenshots of the current frame or at specific timestamps
- **Outline Display**: Shows important points in timestamp order with detailed explanations
- **Batch Capture**: Automatically capture snapshots for all outline timestamps
- **Browser-Only**: Completely serverless implementation

## Installation

### Requirements

- Chrome 117+ or Edge 117+ (WebCodecs support required)
- Gemini API key from [Google AI Studio](https://ai.google.dev/)

### Installation Steps

1. Download the extension ZIP file and extract it
2. Open Chrome/Edge and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked" and select the extracted `dist` folder
5. Click the extension icon to access options and set your Gemini API key

## Usage

1. **Set API Key**: Click the extension icon and select "Options" to set your Gemini API key
2. **Generate Summary**: On any YouTube video, click the "Generate Summary" button in the overlay
3. **Take Snapshot**: Click the "Take Snapshot" button to capture the current frame
4. **Capture at Timestamp**: Click the camera icon next to any outline item to capture at that timestamp
5. **Batch Capture**: Click "Capture All" to automatically capture all timestamps in the outline

## Technical Details

### Architecture

- **Manifest V3** with service worker background script
- **React 18 + TypeScript 5 + Tailwind 3 + shadcn/ui** for the UI
- **WebCodecs** for high-performance snapshot capture (with Canvas fallback)
- **XState** for state management

### Fail-Safe Features

- **DOM Change Handling**: MutationObserver + layout adjustment functions
- **DRM Detection**: Automatically disables snapshot feature for protected content
- **Memory Management**: Optimized for high-resolution videos with controlled memory usage
- **WebCodecs Fallback**: Gracefully falls back to Canvas when WebCodecs is unavailable

### Limitations

- **DRM Content**: Snapshot feature is disabled for DRM-protected videos
- **High-Resolution**: Very high resolution videos (4K/8K) may cause performance issues
- **API Limits**: Subject to Gemini API rate limits and quotas

## Development

### Project Structure

```
/extension
 ├─ /public
 │   └─ _locales/  // Multilingual resources
 │       ├─ en/
 │       └─ ja/
 ├─ /src
 │   ├─ /components  // React components
 │   ├─ /lib         // Core functionality
 │   ├─ /machines    // XState state machines
 │   ├─ background.ts
 │   ├─ contentScript.tsx
 │   ├─ options.tsx
 │   └─ manifest.json
 └─ vite.config.ts
```

### Building from Source

1. Install dependencies: `npm install`
2. Build the extension: `npm run build`
3. Load the `dist` folder as an unpacked extension

## License

MIT License

## Acknowledgements

- [shadcn/ui](https://ui.shadcn.com/) for UI components
- [XState](https://xstate.js.org/) for state management
- [Vite](https://vitejs.dev/) for build tooling
