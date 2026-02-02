
// Helper to convert CIDR prefix to Netmask
const cidrToNetmask = (prefix) => {
    if (typeof prefix !== 'number') return '';
    let mask = 0xffffffff;
    mask = mask << (32 - prefix);
    mask = mask >>> 0;
    const p0 = (mask >> 24) & 0xff;
    const p1 = (mask >> 16) & 0xff;
    const p2 = (mask >> 8) & 0xff;
    const p3 = mask & 0xff;
    return `${p0}.${p1}.${p2}.${p3}`;
};

// Parse CIDR to get IP and Netmask
const parseCidrV4 = (cidr) => {
    const parts = cidr.split('/');
    if (parts.length !== 2) return { ip: cidr, netmask: '' };
    return {
        ip: parts[0],
        netmask: cidrToNetmask(parseInt(parts[1], 10))
    };
};

export const generateIfupdownConfig = (interfaces) => {
    const lines = [];
    const dateStr = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: '2-digit', day: '2-digit'
    }).replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2');

    lines.push(`# /etc/network/interfaces`);
    lines.push(`# Generated on Rafelly's tools - Date: ${dateStr}`);
    lines.push(``);
    lines.push(`source /etc/network/interfaces.d/*`);
    lines.push(``);
    lines.push(`# The loopback network interface`);
    lines.push(`auto lo`);
    lines.push(`iface lo inet loopback`);
    lines.push(``);

    interfaces.forEach(iface => {
        if (!iface.name) return;

        lines.push(`# ${iface.name} - ${iface.type}`);
        lines.push(`auto ${iface.name}`);

        // --- IPv4 Configuration ---
        if (iface.enable_ipv4 !== false) { // Default to true if undefined
            if (iface.dhcp4) {
                lines.push(`iface ${iface.name} inet dhcp`);
            } else {
                const v4Raw = (iface.ipv4_addresses || []).filter(a => a.trim() !== '');

                if (v4Raw.length > 0) {
                    // Static
                    lines.push(`iface ${iface.name} inet static`);
                    const primary = parseCidrV4(v4Raw[0]);
                    lines.push(`    address ${primary.ip}`);
                    lines.push(`    netmask ${primary.netmask}`);

                    if (iface.gateway4 && iface.gateway4.trim()) {
                        lines.push(`    gateway ${iface.gateway4}`);
                    }

                    // IPv4 DNS
                    const dns4 = (iface.nameservers4 || []).filter(d => d.trim() !== '');
                    if (dns4.length > 0) {
                        lines.push(`    dns-nameservers ${dns4.join(' ')}`);
                    }
                } else {
                    // No DHCP and No IP -> Manual
                    lines.push(`iface ${iface.name} inet manual`);
                }
            }
        }

        // --- IPv6 Configuration ---
        const v6LinkLocalEnabled = (iface.link_local || []).includes('ipv6');

        if (!v6LinkLocalEnabled) {
            // Logic to disable IPv6 link-local if not requested
            // This is a bit tricky in ifupdown, but the user suggested:
            // pre-up ip link set dev $IFACE addrgenmode none
            // post-up sleep 10 && ip addr flush dev $IFACE scope link
            lines.push(`    pre-up ip link set dev ${iface.name} addrgenmode none`);
            lines.push(`    post-up sleep 10 && ip addr flush dev ${iface.name} scope link`);
        }

        if (iface.enable_ipv6) {
            if (iface.dhcp6) {
                lines.push(`iface ${iface.name} inet6 dhcp`);
            } else {
                const v6Raw = (iface.ipv6_addresses || []).filter(a => a.trim() !== '');
                if (v6Raw.length > 0) {
                    lines.push(`iface ${iface.name} inet6 static`);
                    lines.push(`    address ${v6Raw[0]}`);

                    if (iface.gateway6 && iface.gateway6.trim()) {
                        lines.push(`    gateway ${iface.gateway6}`);
                    }

                    // IPv6 DNS
                    const dns6 = (iface.nameservers6 || []).filter(d => d.trim() !== '');
                    if (dns6.length > 0) {
                        // For ifupdown, dns-nameservers is the same directive, usually resolvconf handles mixing.
                        // But we put it in the inet6 block if it's v6 specific.
                        lines.push(`    dns-nameservers ${dns6.join(' ')}`);
                    }

                    // Specific sysctl settings for static IPv6 as requested
                    lines.push(`    post-up sysctl -w net.ipv6.conf.${iface.name}.autoconf=0`);
                    lines.push(`    post-up sysctl -w net.ipv6.conf.${iface.name}.accept_ra=0`);
                }
                // If disable_ipv6 is false (default), and no dhcp/static, we don't output inet6 stanza usually.
            }
        }

        // --- Custom Routes ---
        const validRoutes = (iface.routes || []).filter(r => r.to && r.to.trim() !== '' && r.via && r.via.trim() !== '');
        validRoutes.forEach(r => {
            const dest = r.to.trim();
            const gw = r.via.trim();
            // Check if it's IPv6 (contains :)
            const isV6 = dest.includes(':');
            if (isV6) {
                lines.push(`    up ip -6 route add ${dest} via ${gw} dev ${iface.name}`);
                lines.push(`    down ip -6 route del ${dest} via ${gw} dev ${iface.name}`);
            } else {
                // IPv4 using route command or ip route
                // User's example: up route add -net 10.10.10.0/24 gw 192.168.1.254
                lines.push(`    up route add -net ${dest} gw ${gw} dev ${iface.name}`);
                lines.push(`    down route del -net ${dest} gw ${gw} dev ${iface.name}`);
            }
        });

        // Common Fields
        // We put these at the end of the block. In ifupdown, they usually apply to the interface
        // regardless of the inet/inet6 stanza they follow, but convention is to put them after.

        // MTU
        if (iface.mtu && iface.mtu !== 1500) {
            lines.push(`    mtu ${iface.mtu}`);
        }



        // Bond Settings
        if (iface.type === 'bond') {
            if (iface.bond_interfaces && iface.bond_interfaces.length > 0) {
                lines.push(`    bond-slaves ${iface.bond_interfaces.join(' ')}`);
            } else {
                lines.push(`    bond-slaves none`);
            }
            if (iface.bond_mode) {
                lines.push(`    bond-mode ${iface.bond_mode}`);
            }
            lines.push(`    bond-miimon 100`);
            lines.push(`    bond-downdelay 200`);
            lines.push(`    bond-updelay 200`);
        }

        // Bridge Settings
        if (iface.type === 'bridge') {
            if (iface.bridge_interfaces && iface.bridge_interfaces.length > 0) {
                lines.push(`    bridge_ports ${iface.bridge_interfaces.join(' ')}`);
            } else {
                lines.push(`    bridge_ports none`);
            }
            if (iface.bridge_stp !== undefined) {
                lines.push(`    bridge_stp ${iface.bridge_stp ? 'on' : 'off'}`);
            }
        }

        // VLAN Settings
        if (iface.type === 'vlan') {
            if (iface.vlan_link) {
                lines.push(`    vlan-raw-device ${iface.vlan_link}`);
            }
        }

        // Wi-Fi (WPA Supplicant)
        if (iface.type === 'wifi' && iface.wifi && iface.wifi.ssid) {
            lines.push(`    wpa-ssid ${iface.wifi.ssid}`);
            if (iface.wifi.password) {
                lines.push(`    wpa-psk ${iface.wifi.password}`);
            }
        }

        lines.push(``);
    });

    return lines.join('\n');
};
