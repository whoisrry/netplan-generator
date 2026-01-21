
import React from 'react';
import { Trash2, Network, Wifi, Plus, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for conditional classes
function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const InterfaceForm = ({ data, onChange, onDelete, expanded, onToggleExpand }) => {
    const handleChange = (field, value) => {
        onChange({ ...data, [field]: value });
    };

    const handleArrayChange = (field, index, value) => {
        const newArray = [...(data[field] || [])];
        newArray[index] = value;
        onChange({ ...data, [field]: newArray });
    };

    const addArrayItem = (field) => {
        onChange({ ...data, [field]: [...(data[field] || []), ''] });
    };

    const removeArrayItem = (field, index) => {
        const newArray = [...(data[field] || [])];
        newArray.splice(index, 1);
        onChange({ ...data, [field]: newArray });
    };

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

                    {/* Static IPs */}
                    {(!data.dhcp4 || !data.dhcp6) && (
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                Static IP Addresses (CIDR)
                            </label>
                            <div className="space-y-2">
                                {data.addresses.map((addr, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={addr}
                                            onChange={(e) => handleArrayChange('addresses', idx, e.target.value)}
                                            placeholder="e.g. 192.168.1.10/24"
                                            className="flex-1 px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                                        />
                                        <button
                                            onClick={() => removeArrayItem('addresses', idx)}
                                            className="p-2 text-zinc-400 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={() => addArrayItem('addresses')}
                                    className="flex items-center text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                                >
                                    <Plus className="w-4 h-4 mr-1" /> Add Address
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Gateway */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Gateway (Default Route)
                        </label>
                        <input
                            type="text"
                            value={data.gateway || ''}
                            onChange={(e) => handleChange('gateway', e.target.value)}
                            placeholder="e.g. 192.168.1.1"
                            className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-md focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                        />
                    </div>

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
