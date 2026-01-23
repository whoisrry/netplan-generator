
import React, { useState, useEffect } from 'react';
import { Plus, Download, Copy, Check, FileText } from 'lucide-react';
import InterfaceForm from './components/InterfaceForm';
import { generateNetplanYaml, OS_OPTIONS } from './utils/netplan';
import { generateIfupdownConfig } from './utils/ifupdown';

function App() {
  const [os, setOs] = useState('ubuntu_22_04');
  const [outputFormat, setOutputFormat] = useState('netplan'); // 'netplan' or 'ifupdown'
  const [interfaces, setInterfaces] = useState([
    {
      id: "init_1",
      name: 'eth0',
      type: 'ethernet',
      enable_ipv4: true,
      enable_ipv6: false,
      dhcp4: true,
      dhcp6: false,
      mtu: 1500,
      ipv4_addresses: [],
      ipv6_addresses: [],
      gateway4: '',
      gateway6: '',
      nameservers: [],
      wifi: { ssid: '', password: '' },
      bond_interfaces: [],
      bond_mode: 'active-backup',
      vlan_id: null,
      vlan_link: ''
    }
  ]);
  const [expandedId, setExpandedId] = useState("init_1");
  const [generatedConfig, setGeneratedConfig] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let config = '';
    if (outputFormat === 'netplan') {
      config = generateNetplanYaml(os, interfaces);
    } else {
      config = generateIfupdownConfig(interfaces);
    }
    setGeneratedConfig(config);
  }, [os, interfaces, outputFormat]);

  const addInterface = (type = 'ethernet') => {
    const newId = crypto.randomUUID();
    let name = '';
    if (type === 'ethernet') name = `eth${interfaces.filter(i => i.type === 'ethernet').length}`;
    if (type === 'bond') name = `bond${interfaces.filter(i => i.type === 'bond').length}`;
    if (type === 'vlan') name = `vlan${interfaces.filter(i => i.type === 'vlan').length}`;

    const newIface = {
      id: newId,
      name: name,
      type: type,
      enable_ipv4: true,
      enable_ipv6: false,
      dhcp4: true,
      dhcp6: false,
      mtu: 1500,
      ipv4_addresses: [],
      ipv6_addresses: [],
      gateway4: '',
      gateway6: '',
      nameservers: [],
      wifi: { ssid: '', password: '' },
      bond_interfaces: [],
      bond_mode: 'active-backup',
      vlan_id: null,
      vlan_link: ''
    };
    setInterfaces([...interfaces, newIface]);
    setExpandedId(newId);
  };

  const updateInterface = (updatedIface) => {
    setInterfaces(interfaces.map(iface =>
      iface.id === updatedIface.id ? updatedIface : iface
    ));
  };

  const removeInterface = (id) => {
    setInterfaces(interfaces.filter(iface => iface.id !== id));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedConfig);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = () => {
    const element = document.createElement("a");
    const blob = new Blob([generatedConfig], { type: 'text/plain' });
    element.href = URL.createObjectURL(blob);
    element.download = outputFormat === 'netplan' ? "01-netcfg.yaml" : "interfaces";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Get list of existing interface names for Bond/VLAN linking
  const existingInterfaceNames = interfaces.map(i => i.name).filter(Boolean);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col">
      {/* Navbar */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <FileText className="w-5 h-5" />
            </div>
            <h1 className="font-bold text-xl tracking-tight">Netplan Generator</h1>
          </div>
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            Generates Network Configuration
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Left Column: Configuration */}
        <div className="space-y-6">

          <section>
            <h2 className="text-lg font-semibold mb-3">Output Format & OS</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Format</label>
                <div className="flex rounded-lg border border-zinc-300 dark:border-zinc-800 overflow-hidden">
                  <button
                    onClick={() => setOutputFormat('netplan')}
                    className={`flex-1 px-4 py-2 text-sm font-medium transition ${outputFormat === 'netplan' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
                  >
                    Netplan (YAML)
                  </button>
                  <button
                    onClick={() => setOutputFormat('ifupdown')}
                    className={`flex-1 px-4 py-2 text-sm font-medium transition ${outputFormat === 'ifupdown' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}
                  >
                    Ifupdown
                  </button>
                </div>
              </div>

              {outputFormat === 'netplan' && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Target OS</label>
                  <div className="relative">
                    <select
                      value={os}
                      onChange={(e) => setOs(e.target.value)}
                      className="w-full appearance-none bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-md px-3 py-2 pr-8 focus:ring-2 focus:ring-indigo-500 outline-none transition shadow-sm"
                    >
                      {OS_OPTIONS.map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Network Interfaces</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => addInterface('ethernet')}
                  className="flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition"
                >
                  <Plus className="w-4 h-4" /> Ethernet
                </button>
                <button
                  onClick={() => addInterface('bond')}
                  className="flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition"
                >
                  <Plus className="w-4 h-4" /> Bond
                </button>
                <button
                  onClick={() => addInterface('vlan')}
                  className="flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition"
                >
                  <Plus className="w-4 h-4" /> VLAN
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {interfaces.map(iface => (
                <InterfaceForm
                  key={iface.id}
                  data={iface}
                  onChange={updateInterface}
                  onDelete={() => removeInterface(iface.id)}
                  expanded={expandedId === iface.id}
                  onToggleExpand={() => setExpandedId(expandedId === iface.id ? null : iface.id)}
                  existingInterfaces={existingInterfaceNames.filter(n => n !== iface.name)}
                />
              ))}

              {interfaces.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-500">
                  <p>No interfaces configured.</p>
                  <button onClick={() => addInterface('ethernet')} className="mt-2 text-indigo-600 font-medium hover:underline">
                    Add your first interface
                  </button>
                </div>
              )}
            </div>
          </section>

        </div>

        {/* Right Column: Preview */}
        <div className="lg:sticky lg:top-24 h-fit space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Configuration Preview</h2>
            <div className="flex gap-2">
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={downloadFile}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition shadow-sm"
              >
                <Download className="w-4 h-4" /> Download
              </button>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl opacity-20 blur group-hover:opacity-30 transition duration-200"></div>
            <div className="relative bg-zinc-900 text-zinc-50 rounded-xl overflow-hidden shadow-2xl border border-zinc-800">
              <div className="flex items-center gap-2 px-4 py-3 bg-zinc-950/50 border-b border-zinc-800/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                </div>
                <span className="text-xs text-zinc-500 font-mono ml-2">
                  {outputFormat === 'netplan' ? '/etc/netplan/01-netcfg.yaml' : '/etc/network/interfaces'}
                </span>
              </div>
              <div className="p-4 overflow-x-auto">
                <pre className="font-mono text-sm leading-relaxed text-indigo-100">
                  {generatedConfig}
                </pre>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-lg p-4 text-sm text-blue-900 dark:text-blue-200">
            <h4 className="font-semibold mb-1 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Usage Instructions
            </h4>
            {outputFormat === 'netplan' ? (
              <ol className="list-decimal list-inside space-y-1 opacity-80 pl-1">
                <li>Download the YAML file</li>
                <li>Move it to <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/40 rounded text-xs font-mono">/etc/netplan/</code></li>
                <li>Set permissions: <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/40 rounded text-xs font-mono">sudo chmod 600 /etc/netplan/*.yaml</code></li>
                <li>Apply changes: <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/40 rounded text-xs font-mono">sudo netplan apply</code></li>
              </ol>
            ) : (
              <ol className="list-decimal list-inside space-y-1 opacity-80 pl-1">
                <li>Download the interfaces file</li>
                <li>Backup existing: <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/40 rounded text-xs font-mono">sudo cp /etc/network/interfaces /etc/network/interfaces.bak</code></li>
                <li>Replace file: <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/40 rounded text-xs font-mono">sudo mv interfaces /etc/network/interfaces</code></li>
                <li>Restart networking or reboot</li>
              </ol>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
