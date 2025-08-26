# PDF Highlighter with Backend Integration 🚀

**Enhanced PDF annotation application with full-stack capabilities and native desktop support.**

*Built upon the excellent [react-pdf-highlighter](https://github.com/agentcooper/react-pdf-highlighter) by [@agentcooper](https://github.com/agentcooper) - significantly enhanced with backend functionality and modern development stack.*

## ✨ Enhanced Features

### 🎯 **Original Features** (from react-pdf-highlighter)
- Built on top of PDF.js
- Text and image highlights
- Popover text for highlights
- Scroll to highlights

### 🚀 **My Backend & Infrastructure Enhancements**
- **🦀 Rust Backend Integration** - High-performance backend with Tauri
- **🖥️ Native Desktop Application** - Cross-platform desktop app
- **🐳 Complete Docker Development Environment** - Isolated, consistent development
- **⚙️ Advanced Build System** - Modern toolchain with hot reloading
- **🔄 Hybrid Development Modes** - Web, desktop, and containerized options
- **📦 Professional Project Structure** - Enterprise-ready organization
- **🛡️ Enhanced Security & Performance** - Native app benefits with web flexibility

## 🎯 Why This Fork?

This version transforms the original React component library into a **complete, production-ready PDF annotation application** with:
- Full-stack architecture
- Native desktop performance  
- Professional development workflow
- Enhanced user experience

## 🛠️ Development Journey

This project represents months of development work to transform a React component library into a full-featured application:
- Started with the solid foundation of react-pdf-highlighter
- Added complete Rust backend integration with Tauri
- Implemented professional Docker development workflow
- Enhanced with native desktop capabilities
- Built comprehensive development documentation and guides

## 📦 Quick Start

### Native Desktop App (Recommended)
```bash
git clone https://github.com/mahmutsalman/react-pdf-highlighter.git
cd react-pdf-highlighter
npm install
npm start
# Launches native desktop application
```

### 🐳 Docker Development
```bash
# Hybrid mode - Docker backend + Native frontend (Best experience)
npm run docker:desktop

# Full web mode
npm run docker:dev  # http://localhost:3003
```

## Importing CSS

The bundled CSS include the CSS for pdfjs.

```tsx
import "react-pdf-highlighter/dist/style.css";
```

## Example

Original demo: https://agentcooper.github.io/react-pdf-highlighter/ | **Enhanced version with backend features - try the native desktop app!**

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

See [`./example/src/App.tsx`](./example/src/App.tsx) for the React component API example with backend integration.

## 🙏 Attribution

This project builds upon the excellent work of [react-pdf-highlighter](https://github.com/agentcooper/react-pdf-highlighter) by [@agentcooper](https://github.com/agentcooper). The original component library provided a solid foundation which has been significantly enhanced with backend functionality and native desktop capabilities.

**Original Repository**: https://github.com/agentcooper/react-pdf-highlighter  
**This Enhanced Fork**: https://github.com/mahmutsalman/react-pdf-highlighter
