☕️ [Buy me a coffee](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=SC4D2NS8G2JJ8&source=url)

![Node CI](https://github.com/agentcooper/react-pdf-highlighter/workflows/Node%20CI/badge.svg)

# react-pdf-highlighter

Set of React components for PDF annotation.

Features:

- Built on top of PDF.js
- Text and image highlights
- Popover text for highlights
- Scroll to highlights

## Importing CSS

The bundled CSS include the CSS for pdfjs.

```tsx
import "react-pdf-highlighter/dist/style.css";
```

## Example

See demo https://agentcooper.github.io/react-pdf-highlighter/.

To run the example app locally:

### Native Desktop App (Default)
```bash
npm install
npm start
# Opens Tauri desktop application
```

### Hybrid Docker Desktop Mode (Recommended)
```bash
# Start containerized dev server + native desktop app
npm run docker:desktop
# Combines Docker isolation with native desktop experience
```

### Web Development (Docker)
```bash
# Start with automatic port management  
npm run docker:dev
# Opens in browser at http://localhost:3003

# Stop the development environment
npm run docker:stop
```

### Web Development (Local)
```bash
npm run web:dev
# Opens in browser at http://localhost:3003
```

**Development Mode Comparison:**
- 🖥️ **Native Desktop** (`npm start`): Real desktop app with native features
- 🐳🖥️ **Hybrid Docker Desktop** (`npm run docker:desktop`): **Best of both worlds** - native desktop app + Docker isolation
- 🐳 **Docker Web** (`npm run docker:dev`): Browser version with port management
- 🌐 **Local Web** (`npm run web:dev`): Browser version without Docker

**Hybrid Docker Desktop Benefits:**
- 🖥️ **Native Desktop Experience**: Real desktop app with all native features
- 🐳 **Docker Isolation**: Development server runs in isolated container
- 🚀 **Zero Port Conflicts**: Automatic port management for multiple projects
- 🔄 **Hot Reloading**: Live code changes in both container and desktop app
- 📦 **Consistent Environment**: Docker ensures same setup across all machines

**Docker Benefits:**
- 🐳 **Isolated Environment**: Consistent development across all machines
- 🚀 **Zero Port Conflicts**: Automatic port management for multiple projects
- 🔄 **Hot Reloading**: Live code changes without rebuilding containers
- 📦 **No Local Dependencies**: Everything runs in containers

See [Development Modes Guide](localResources/docker/DEVELOPMENT_MODES.md) and [Docker Setup Guide](localResources/docker/DOCKER_SETUP_GUIDE.md) for detailed instructions.

## Install

```bash
npm install react-pdf-highlighter
```

## How to use

See [`./example/src/App.tsx`](https://github.com/agentcooper/react-pdf-highlighter/blob/main/example/src/App.tsx) for the React component API example.
