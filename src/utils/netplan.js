
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
        wifis: {},
        bonds: {},
        bridges: {},
        vlans: {}
    };

    // If no renderer is specified, networkd is default on server, NetworkManager on desktop.
    // We'll let the user decide or default to networkd which is safer for servers.
    network.renderer = 'networkd';

    interfaces.forEach(iface => {
        if (!iface.name) return;

        const config = {};

        // IPv4 Config
        if (iface.enable_ipv4 !== false) { // Default to true if undefined
            if (iface.dhcp4) {
                config.dhcp4 = true;
            } else {
                // Static v4
                const v4Addrs = (iface.ipv4_addresses || []).filter(a => a.trim() !== '');
                if (v4Addrs.length > 0) {
                    if (!config.addresses) config.addresses = [];
                    config.addresses.push(...v4Addrs);
                }

                // Gateway v4
                if (iface.gateway4 && iface.gateway4.trim() !== '') {
                    if (isModern) {
                        if (!config.routes) config.routes = [];
                        config.routes.push({
                            to: 'default',
                            via: iface.gateway4
                        });
                    } else {
                        config.gateway4 = iface.gateway4;
                    }
                }
            }
        }

        // IPv6 Config
        if (iface.enable_ipv6) {
            if (iface.dhcp6) {
                config.dhcp6 = true;
            } else {
                // Static v6
                const v6Addrs = (iface.ipv6_addresses || []).filter(a => a.trim() !== '');
                if (v6Addrs.length > 0) {
                    if (!config.addresses) config.addresses = [];
                    config.addresses.push(...v6Addrs);
                }

                // If static IPv6, disable RA if requested (common requirement for static setups)
                // Although netplan defaults 'accept-ra' to true, when using static, it's safer to disable if not needed
                // But the user specifically asked for "accept_ra=0" logic equivalence
                config['accept-ra'] = false;

                // Gateway v6
                if (iface.gateway6 && iface.gateway6.trim() !== '') {
                    if (isModern) {
                        if (!config.routes) config.routes = [];
                        config.routes.push({
                            to: '::/0',
                            via: iface.gateway6
                        });
                    } else {
                        config.gateway6 = iface.gateway6;
                    }
                }
            }
        }

        // Link Local
        const ll = [];

        if (iface.link_local && iface.link_local.includes('ipv6')) {
            ll.push('ipv6');
        }

        if (ll.length > 0) {
            config['link-local'] = ll;
        }

        // Custom Routes
        const validRoutes = (iface.routes || []).filter(r => r.to && r.to.trim() !== '' && r.via && r.via.trim() !== '');
        if (validRoutes.length > 0) {
            if (!config.routes) config.routes = [];
            validRoutes.forEach(r => {
                config.routes.push({
                    to: r.to.trim(),
                    via: r.via.trim()
                });
            });
        }

        // MTU
        if (iface.mtu && iface.mtu !== 1500) {
            config.mtu = iface.mtu;
        }

        // Nameservers
        const ns4 = (iface.nameservers4 || []).filter(n => n.trim() !== '');
        const ns6 = (iface.nameservers6 || []).filter(n => n.trim() !== '');
        const allNameservers = [...ns4, ...ns6];

        if (allNameservers.length > 0) {
            config.nameservers = {
                addresses: allNameservers
            };
        }

        // Assign to correct section based on type
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
        } else if (iface.type === 'bond') {
            const bondConfig = { ...config };
            if (iface.bond_interfaces && iface.bond_interfaces.length > 0) {
                bondConfig.interfaces = iface.bond_interfaces;
            }
            if (iface.bond_mode) {
                bondConfig.parameters = {
                    mode: iface.bond_mode,
                    'mii-monitor-interval': 100 // Default sensible value
                };
            }
            network.bonds[iface.name] = bondConfig;
        } else if (iface.type === 'bridge') {
            const bridgeConfig = { ...config };
            if (iface.bridge_interfaces && iface.bridge_interfaces.length > 0) {
                bridgeConfig.interfaces = iface.bridge_interfaces;
            }
            if (iface.bridge_stp !== undefined) {
                bridgeConfig.parameters = {
                    stp: iface.bridge_stp
                };
            }
            network.bridges[iface.name] = bridgeConfig;
        } else if (iface.type === 'vlan') {
            const vlanConfig = { ...config };
            if (iface.vlan_id) {
                vlanConfig.id = iface.vlan_id;
            }
            if (iface.vlan_link) {
                vlanConfig.link = iface.vlan_link;
            }
            network.vlans[iface.name] = vlanConfig;
        }
    });

    // Cleanup empty objects
    if (Object.keys(network.ethernets).length === 0) delete network.ethernets;
    if (Object.keys(network.wifis).length === 0) delete network.wifis;
    if (Object.keys(network.bonds).length === 0) delete network.bonds;
    if (Object.keys(network.bridges).length === 0) delete network.bridges;
    if (Object.keys(network.vlans).length === 0) delete network.vlans;

    const yamlContent = yaml.dump({ network }, { indent: 2, noRefs: true });

    const dateStr = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: '2-digit', day: '2-digit'
    }).replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2');

    return `# ${osConfig.name} Netplan Configuration
# Generated on Rafelly's tools
# Date: ${dateStr}
# Save this file as /etc/netplan/01-netcfg.yaml

${yamlContent}

# Apply configuration: sudo netplan apply
# Test configuration: sudo netplan try
# Debug: sudo netplan --debug apply`;
};
