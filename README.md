# Netplan Config Generator

A client-side React application for visually configuring network interfaces and generating valid configuration files. Designed to simplify network configuration for Ubuntu (20.04/22.04/24.04/26.04) and Debian networkd systems.

## Features

- **Multiple Configuration Formats**: Generate both **Netplan (YAML)** and **Ifupdown (`/etc/network/interfaces`)** configuration files.
- **Visual Interface Configuration**: Add multiple **Ethernet**, **Wi-Fi**, **Bond**, and **VLAN** interfaces via a clean UI.
- **Support for Multiple OS Versions**: Tailored configurations for Ubuntu 20.04, 22.04, 24.04, 26.04, and Debian.
- **Comprehensive IP Management**:
    - **IPv4 & IPv6 Support**: Configure DHCP or static addresses for both versions.
    - **CIDR Validation**: Real-time validation for IP address formatting.
    - **Smart Inputs**: Gateway and nameserver fields enable/disable based on IP configuration.
- **Real-time Preview**: See the generated config update instantly as you make changes.
- **Client-Side Only**: Secure and private; no network configuration data is sent to any server.
- **Responsive Design**: Built with Tailwind CSS for a seamless experience on desktop and mobile.

## Tech Stack

- **Framework**: React 19 (via Vite)
- **Styling**: Vanilla CSS with Tailwind CSS v3
- **Icons**: Lucide React
- **Logic**: js-yaml for robust YAML generation

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/whoisrry/netplan-generator.git
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

This project includes a GitHub Actions workflow (`build.yml`) that:
- Automatically builds the application on pushes to `main` or `v*` tags.
- Creates a GitHub Release with a zipped build artifact.
- Automatically deploys the build output to a production server via SSH/SCP upon tagging a new release.

## License

MIT
