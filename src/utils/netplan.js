
import yaml from 'js-yaml';

export const OS_OPTIONS = [
    { id: 'ubuntu_20_04', name: 'Ubuntu 20.04 LTS (Focal)', style: 'legacy' },
    { id: 'ubuntu_22_04', name: 'Ubuntu 22.04 LTS (Jammy)', style: 'modern' },
    { id: 'ubuntu_24_04', name: 'Ubuntu 24.04 LTS (Noble)', style: 'modern' },
    { id: 'ubuntu_26_04', name: 'Ubuntu 26.04 LTS', style: 'modern' },
    { id: 'debian', name: 'Debian (Standard)', style: 'modern' },
];

export const generateNetplanYaml = (osId, interfaces) => {
    const osConfig = OS_OPTIONS.find(o => o.id === osId) || OS_OPTIONS[1];
    const isModern = osConfig.style === 'modern';

    const network = {
        version: 2,
        ethernets: {},
        wifis: {}
    };

    // If no renderer is specified, networkd is default on server, NetworkManager on desktop.
    // We'll let the user decide or default to networkd which is safer for servers.
    network.renderer = 'networkd';

    interfaces.forEach(iface => {
        if (!iface.name) return;

        const config = {};

        // DHCP
        if (iface.dhcp4) config.dhcp4 = true;
        if (iface.dhcp6) config.dhcp6 = true;

        // Static Addresses
        const validAddresses = iface.addresses.filter(a => a.trim() !== '');
        if (validAddresses.length > 0) {
            config.addresses = validAddresses;
        }

        // Gateway / Routes
        if (iface.gateway && iface.gateway.trim() !== '') {
            if (isModern) {
                config.routes = [
                    {
                        to: 'default',
                        via: iface.gateway
                    }
                ];
            } else {
                config.gateway4 = iface.gateway;
            }
        }

        // Nameservers
        const validNameservers = iface.nameservers.filter(n => n.trim() !== '');
        if (validNameservers.length > 0) {
            config.nameservers = {
                addresses: validNameservers
            };
        }

        // Assign to correct type
        if (iface.type === 'ethernet') {
            network.ethernets[iface.name] = config;
        } else if (iface.type === 'wifi') {
            const wifiConfig = { ...config };
            if (iface.wifi && iface.wifi.ssid) {
                wifiConfig['access-points'] = {
                    [iface.wifi.ssid]: {}
                };
                if (iface.wifi.password) {
                    wifiConfig['access-points'][iface.wifi.ssid].password = iface.wifi.password;
                }
            }
            network.wifis[iface.name] = wifiConfig;
        }
    });

    // Cleanup empty objects
    if (Object.keys(network.ethernets).length === 0) delete network.ethernets;
    if (Object.keys(network.wifis).length === 0) delete network.wifis;

    const yamlContent = yaml.dump({ network }, { indent: 2, noRefs: true });

    const dateStr = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: '2-digit', day: '2-digit'
    }).replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2');

    return `# ${osConfig.name} Netplan Configuration
# Generated on Rafelly's tools
# Date: ${dateStr}
# Save this file as /etc/netplan/00-installer-config.yaml

${yamlContent}

# Apply configuration: sudo netplan apply
# Test configuration: sudo netplan try
# Debug: sudo netplan --debug apply`;
};
