# Netplan Config Generator

A client-side React application for visually configuring network interfaces and generating valid Netplan YAML configuration files. Designed to simplify network configuration for Ubuntu (20.04/22.04/24.04/26.04) and Debian networkd systems.

## Features

- **Visual Interface Configuration**: Add multiple Ethernet and Wi-Fi interfaces via a clean UI.
- **Support for Multiple OS Versions**: tailored configurations for Ubuntu 20.04, 22.04, 24.04, 26.04, and Debian.
- **Detailed IP Management**: Configure DHCP (v4/v6) or static IP addresses, gateways, and nameservers.
- **Real-time Preview**: See the generated YAML update instantly as you make changes.
- **Client-Side Only**: Secure and private; no network configuration data is sent to any server.
- **Responsive Design**: Built with Tailwind CSS for a seamless experience on desktop and mobile.

## Tech Stack

- **Framework**: React 19 (via Vite)
- **Styling**: Tailwind CSS v3
- **Icons**: Lucide React
- **Logic**: js-yaml for robust YAML generation

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/yourusername/netplan-generator.git
    cd netplan-generator
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

### Development

Start the development server:

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

### Building for Production

Build the static site:

```bash
npm run build
```

The output will be in the `build` directory.

## GitHub Workflow & Deployment

This project includes a GitHub Actions workflow to automatically build the application on every push to the `main` branch. The build artifacts (`build` folder) can be downloaded from the Actions tab or configured for deployment to GitHub Pages.

## License

MIT
