
import React, { useState, useEffect } from 'react';
import { Trash2, Network, Wifi, Plus, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for conditional classes
function cn(...inputs) {
    return twMerge(clsx(inputs));
}

// Helper to auto-format IP inputs on blur
const formatIpAddress = (value, type) => {
    let clean = value.trim();
    if (!clean) return clean;

    if (type === 'v4') {
        // Specific shortcuts requested by user
        if (clean === '192.168' || clean === '192.168.') return '192.168.0.1/24';
        if (clean === '10' || clean === '10.') return '10.0.0.1/24';

        // If it looks like a valid IP but missing mask, append /24
        // Simple IPv4 regex
        if (/^(\d{1,3}\.){3}\d{1,3}$/.test(clean)) {
            return `${clean}/24`;
        }
    } else if (type === 'v6') {
        // If it looks like a valid IPv6 but missing mask, append /64
        // Very basic IPv6 check (hexdigits and colons)
        if (/^[0-9a-fA-F:]+$/.test(clean) && !clean.includes('/')) {
            return `${clean}/64`;
        }
    }

    return clean;
};

// Helper to validate CIDR format for visual feedback
const isValidCidr = (value, type) => {
    if (!value || value.trim() === '') return true; // Empty is valid (can be deleted)
    if (type === 'v4') {
        return /^(\d{1,3}\.){3}\d{1,3}\/(1?[0-9]|2[0-9]|3[0-2])$/.test(value);
    } else if (type === 'v6') {
        return /^[0-9a-fA-F:]+\/\d{1,3}$/.test(value);
    }
    return true;
};

// Parse CIDR notation to extract IP and prefix length
const parseCIDR = (cidr, type) => {
    if (!cidr || !cidr.includes('/')) return null;
    const [ip, prefixStr] = cidr.split('/');
    const prefix = parseInt(prefixStr, 10);
    if (isNaN(prefix)) return null;
    return { ip: ip.trim(), prefix };
};

// Convert IPv4 address to number
const ipv4ToNumber = (ip) => {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
        return null;
    }
    return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
};

// Convert IPv6 address to array of 8 16-bit numbers
const ipv6ToNumbers = (ip) => {
    // Expand compressed IPv6 addresses
    const expandIPv6 = (ip) => {
        if (ip.includes('::')) {
            const parts = ip.split('::');
            const left = parts[0] ? parts[0].split(':') : [];
            const right = parts[1] ? parts[1].split(':') : [];
            const missing = 8 - left.length - right.length;
            const expanded = [...left];
            for (let i = 0; i < missing; i++) {
                expanded.push('0');
            }
            expanded.push(...right);
            return expanded;
        }
        return ip.split(':');
    };

    const parts = expandIPv6(ip);
    if (parts.length !== 8) return null;

    const numbers = parts.map(part => {
        if (!part) return 0;
        const num = parseInt(part, 16);
        return isNaN(num) ? null : num;
    });

    if (numbers.some(n => n === null || n < 0 || n > 0xFFFF)) {
        return null;
    }

    return numbers;
};

// Check if IPv4 gateway is in the same network as CIDR address
const isIPv4InNetwork = (gateway, cidr) => {
    const parsed = parseCIDR(cidr, 'v4');
    if (!parsed) return false;

    const gatewayNum = ipv4ToNumber(gateway);
    const ipNum = ipv4ToNumber(parsed.ip);
    if (gatewayNum === null || ipNum === null) return false;

    const mask = parsed.prefix === 0 ? 0 : (0xFFFFFFFF << (32 - parsed.prefix)) >>> 0;
    const networkNum = ipNum & mask;
    const gatewayNetwork = gatewayNum & mask;

    return networkNum === gatewayNetwork;
};

// Check if IPv6 gateway is in the same network as CIDR address
const isIPv6InNetwork = (gateway, cidr) => {
    const parsed = parseCIDR(cidr, 'v6');
    if (!parsed) return false;

    const gatewayNums = ipv6ToNumbers(gateway);
    const ipNums = ipv6ToNumbers(parsed.ip);
    if (!gatewayNums || !ipNums) return false;

    // Check if gateway matches the network prefix
    const prefixBytes = Math.floor(parsed.prefix / 16);
    const prefixBits = parsed.prefix % 16;

    // Compare full 16-bit segments
    for (let i = 0; i < prefixBytes; i++) {
        if (gatewayNums[i] !== ipNums[i]) return false;
    }

    // Compare partial bits in the last segment if needed
    if (prefixBits > 0 && prefixBytes < 8) {
        const mask = (0xFFFF << (16 - prefixBits)) & 0xFFFF;
        if ((gatewayNums[prefixBytes] & mask) !== (ipNums[prefixBytes] & mask)) {
            return false;
        }
    }

    return true;
};

// Validate gateway against CIDR addresses
const validateGateway = (gateway, cidrAddresses, type) => {
    if (!gateway || !gateway.trim()) return ''; // Empty gateway is valid
    if (!cidrAddresses || cidrAddresses.length === 0) return ''; // No addresses to validate against

    const validCidrs = cidrAddresses.filter(addr => addr && addr.trim() && isValidCidr(addr, type));
    if (validCidrs.length === 0) return ''; // No valid CIDR addresses

    const gatewayTrimmed = gateway.trim();
    
    if (type === 'v4') {
        // Basic IPv4 format check
        if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(gatewayTrimmed)) {
            return 'Invalid IPv4 address format';
        }
        // Check if gateway is in at least one network
        const isInAnyNetwork = validCidrs.some(cidr => isIPv4InNetwork(gatewayTrimmed, cidr));
        if (!isInAnyNetwork) {
            return 'Gateway must be in the same network as at least one IP address';
        }
    } else if (type === 'v6') {
        // Basic IPv6 format check
        if (!/^[0-9a-fA-F:]+$/.test(gatewayTrimmed)) {
            return 'Invalid IPv6 address format';
        }
        // Check if gateway is in at least one network
        const isInAnyNetwork = validCidrs.some(cidr => isIPv6InNetwork(gatewayTrimmed, cidr));
        if (!isInAnyNetwork) {
            return 'Gateway must be in the same network as at least one IP address';
        }
    }

    return ''; // Valid
};

const InterfaceForm = ({ data, onChange, onDelete, expanded, onToggleExpand }) => {
    const [gateway4Error, setGateway4Error] = useState('');
    const [gateway6Error, setGateway6Error] = useState('');

    const handleChange = (field, value) => {
        onChange({ ...data, [field]: value });
        // Clear gateway errors when gateway is cleared or DHCP is enabled
        if (field === 'gateway4') {
            if (!value || !value.trim()) {
                setGateway4Error('');
            }
        } else if (field === 'gateway6') {
            if (!value || !value.trim()) {
                setGateway6Error('');
            }
        } else if (field === 'dhcp4') {
            setGateway4Error('');
        } else if (field === 'dhcp6') {
            setGateway6Error('');
        }
    };

    const handleArrayChange = (field, index, value) => {
        const newArray = [...(data[field] || [])];
        newArray[index] = value;
        onChange({ ...data, [field]: newArray });
        
        // Re-validate gateway when IP addresses change
        if (field === 'ipv4_addresses' && data.gateway4) {
            const error = validateGateway(data.gateway4, newArray, 'v4');
            setGateway4Error(error);
        } else if (field === 'ipv6_addresses' && data.gateway6) {
            const error = validateGateway(data.gateway6, newArray, 'v6');
            setGateway6Error(error);
        }
    };

    const handleIpBlur = (field, index, type) => {
        const currentVal = data[field][index];
        const formatted = formatIpAddress(currentVal, type);
        if (formatted !== currentVal) {
            handleArrayChange(field, index, formatted);
        }
    };

    const addArrayItem = (field) => {
        onChange({ ...data, [field]: [...(data[field] || []), ''] });
    };

    const removeArrayItem = (field, index) => {
        const newArray = [...(data[field] || [])];
        newArray.splice(index, 1);
        onChange({ ...data, [field]: newArray });
        
        // Re-validate gateway when IP addresses are removed
        if (field === 'ipv4_addresses' && data.gateway4) {
            const error = validateGateway(data.gateway4, newArray, 'v4');
            setGateway4Error(error);
        } else if (field === 'ipv6_addresses' && data.gateway6) {
            const error = validateGateway(data.gateway6, newArray, 'v6');
            setGateway6Error(error);
        }
    };

    const hasV4 = (data.ipv4_addresses || []).some(a => a.trim() !== '');
    const hasV6 = (data.ipv6_addresses || []).some(a => a.trim() !== '');

    // Clear errors when DHCP is enabled
    useEffect(() => {
        if (data.dhcp4) {
            setGateway4Error('');
        }
        if (data.dhcp6) {
            setGateway6Error('');
        }
    }, [data.dhcp4, data.dhcp6]);

    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm mb-4 overflow-hidden transition-all duration-200">

            {/* Header */}
            <div
                className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 cursor-pointer select-none"
                onClick={onToggleExpand}
            >
                <div className="flex items-center gap-3">
                    {data.type === 'wifi' ? (
                        <Wifi className="w-5 h-5 text-blue-500" />
                    ) : (
                        <Network className="w-5 h-5 text-emerald-500" />
                    )}
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {data.name || 'New Interface'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 capitalize">
                        {data.type}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition"
                        title="Delete Interface"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Body */}
            {expanded && (
                <div className="p-4 space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                Interface Name
                            </label>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) => handleChange('name', e.target.value)}
                                placeholder="e.g. eth0, wlan0"
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                Interface Type
                            </label>
                            <select
                                value={data.type}
                                onChange={(e) => handleChange('type', e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                            >
                                <option value="ethernet">Ethernet</option>
                                <option value="wifi">Wi-Fi</option>
                            </select>
                        </div>
                    </div>

                    {/* DHCP Settings */}
                    <div className="flex gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={data.dhcp4}
                                onChange={(e) => handleChange('dhcp4', e.target.checked)}
                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                            />
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Enable DHCPv4</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={data.dhcp6}
                                onChange={(e) => handleChange('dhcp6', e.target.checked)}
                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                            />
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Enable DHCPv6</span>
                        </label>
                    </div>

                    {/* Wi-Fi Settings */}
                    {data.type === 'wifi' && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-md space-y-4">
                            <h4 className="text-sm font-bold text-blue-900 dark:text-blue-200">Wi-Fi Configuration</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">SSID</label>
                                    <input
                                        type="text"
                                        value={data.wifi?.ssid || ''}
                                        onChange={(e) => handleChange('wifi', { ...data.wifi, ssid: e.target.value })}
                                        className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">Password</label>
                                    <input
                                        type="password"
                                        value={data.wifi?.password || ''}
                                        onChange={(e) => handleChange('wifi', { ...data.wifi, password: e.target.value })}
                                        className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* IPv4 Configuration */}
                    {!data.dhcp4 && (
                        <div className="space-y-4 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                IPv4 Configuration
                            </h4>

                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                    Static IPv4 Addresses (CIDR)
                                </label>
                                <div className="space-y-2">
                                    {(data.ipv4_addresses || []).map((addr, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={addr}
                                                onChange={(e) => handleArrayChange('ipv4_addresses', idx, e.target.value)}
                                                onBlur={() => handleIpBlur('ipv4_addresses', idx, 'v4')}
                                                placeholder="e.g. 192.168.1.10/24"
                                                className={cn(
                                                    "flex-1 px-3 py-2 bg-white dark:bg-zinc-950 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm transition",
                                                    !isValidCidr(addr, 'v4') ? "border-red-500 focus:border-red-500 focus:ring-red-200" : "border-zinc-300 dark:border-zinc-700"
                                                )}
                                            />
                                            <button
                                                onClick={() => removeArrayItem('ipv4_addresses', idx)}
                                                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => addArrayItem('ipv4_addresses')}
                                        className="flex items-center text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                                    >
                                        <Plus className="w-4 h-4 mr-1" /> Add IPv4 Address
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                    IPv4 Gateway
                                </label>
                                <input
                                    type="text"
                                    value={data.gateway4 || ''}
                                    disabled={!hasV4}
                                    onChange={(e) => handleChange('gateway4', e.target.value)}
                                    onBlur={() => {
                                        if (data.gateway4 && hasV4) {
                                            const error = validateGateway(data.gateway4, data.ipv4_addresses || [], 'v4');
                                            setGateway4Error(error);
                                        } else {
                                            setGateway4Error('');
                                        }
                                    }}
                                    placeholder={!hasV4 ? "Add an IP address first" : "e.g. 192.168.1.1"}
                                    className={cn(
                                        "w-full px-3 py-2 bg-white dark:bg-zinc-950 border rounded-md focus:ring-2 focus:ring-indigo-500 font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed",
                                        gateway4Error ? "border-red-500 focus:border-red-500 focus:ring-red-200" : "border-zinc-300 dark:border-zinc-700"
                                    )}
                                />
                                {gateway4Error && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{gateway4Error}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* IPv6 Configuration */}
                    {!data.dhcp6 && (
                        <div className="space-y-4 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                IPv6 Configuration
                            </h4>

                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                    Static IPv6 Addresses (CIDR)
                                </label>
                                <div className="space-y-2">
                                    {(data.ipv6_addresses || []).map((addr, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <input
                                                type="text"
                                                value={addr}
                                                onChange={(e) => handleArrayChange('ipv6_addresses', idx, e.target.value)}
                                                onBlur={() => handleIpBlur('ipv6_addresses', idx, 'v6')}
                                                placeholder="e.g. 2001:db8::1/64"
                                                className={cn(
                                                    "flex-1 px-3 py-2 bg-white dark:bg-zinc-950 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm transition",
                                                    !isValidCidr(addr, 'v6') ? "border-red-500 focus:border-red-500 focus:ring-red-200" : "border-zinc-300 dark:border-zinc-700"
                                                )}
                                            />
                                            <button
                                                onClick={() => removeArrayItem('ipv6_addresses', idx)}
                                                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => addArrayItem('ipv6_addresses')}
                                        className="flex items-center text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                                    >
                                        <Plus className="w-4 h-4 mr-1" /> Add IPv6 Address
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                    IPv6 Gateway
                                </label>
                                <input
                                    type="text"
                                    value={data.gateway6 || ''}
                                    disabled={!hasV6}
                                    onChange={(e) => handleChange('gateway6', e.target.value)}
                                    onBlur={() => {
                                        if (data.gateway6 && hasV6) {
                                            const error = validateGateway(data.gateway6, data.ipv6_addresses || [], 'v6');
                                            setGateway6Error(error);
                                        } else {
                                            setGateway6Error('');
                                        }
                                    }}
                                    placeholder={!hasV6 ? "Add an IP address first" : "e.g. 2001:db8::1"}
                                    className={cn(
                                        "w-full px-3 py-2 bg-white dark:bg-zinc-950 border rounded-md focus:ring-2 focus:ring-indigo-500 font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed",
                                        gateway6Error ? "border-red-500 focus:border-red-500 focus:ring-red-200" : "border-zinc-300 dark:border-zinc-700"
                                    )}
                                />
                                {gateway6Error && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{gateway6Error}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Nameservers */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            DNS Nameservers
                        </label>
                        <div className="space-y-2">
                            {data.nameservers.map((ns, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={ns}
                                        onChange={(e) => handleArrayChange('nameservers', idx, e.target.value)}
                                        placeholder="e.g. 8.8.8.8"
                                        className="flex-1 px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                                    />
                                    <button
                                        onClick={() => removeArrayItem('nameservers', idx)}
                                        className="p-2 text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={() => addArrayItem('nameservers')}
                                className="flex items-center text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                            >
                                <Plus className="w-4 h-4 mr-1" /> Add DNS
                            </button>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
};

export default InterfaceForm;
