
import React, { useState, useEffect } from 'react';
import { Plus, Download, Copy, Check, FileText } from 'lucide-react';
import InterfaceForm from './components/InterfaceForm';
import { generateNetplanYaml, OS_OPTIONS } from './utils/netplan';

function App() {
  const [os, setOs] = useState('ubuntu_22_04');
  const [interfaces, setInterfaces] = useState([
    {
      id: "init_1",
      name: 'eth0',
      type: 'ethernet',
      dhcp4: true,
      dhcp6: false,
      addresses: [],
      gateway: '',
      nameservers: [],
      wifi: { ssid: '', password: '' }
    }
  ]);
  const [expandedId, setExpandedId] = useState("init_1");
  const [generatedYaml, setGeneratedYaml] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const yaml = generateNetplanYaml(os, interfaces);
    setGeneratedYaml(yaml);
  }, [os, interfaces]);

  const addInterface = () => {
    const newId = crypto.randomUUID();
    const newIface = {
      id: newId,
      name: `eth${interfaces.length}`,
      type: 'ethernet',
      dhcp4: true,
      dhcp6: false,
      addresses: [],
      gateway: '',
      nameservers: [],
      wifi: { ssid: '', password: '' }
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
    navigator.clipboard.writeText(generatedYaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = () => {
    const element = document.createElement("a");
    const file = new Blob([generatedYaml], { type: 'text/yaml' });
    element.href = URL.createObjectURL(file);
    element.download = "01-netcfg.yaml";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

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
            Generates YAML for /etc/netplan/01-netcfg.yaml
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Left Column: Configuration */}
        <div className="space-y-6">

          <section>
            <h2 className="text-lg font-semibold mb-3">Target Operating System</h2>
            <div className="relative">
              <select
                value={os}
                onChange={(e) => setOs(e.target.value)}
                className="w-full appearance-none bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg px-4 py-3 pr-8 focus:ring-2 focus:ring-indigo-500 outline-none transition shadow-sm"
              >
                {OS_OPTIONS.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.name}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Network Interfaces</h2>
              <button
                onClick={addInterface}
                className="flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition"
              >
                <Plus className="w-4 h-4" /> Add Interface
              </button>
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
                />
              ))}

              {interfaces.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-500">
                  <p>No interfaces configured.</p>
                  <button onClick={addInterface} className="mt-2 text-indigo-600 font-medium hover:underline">
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
                <Download className="w-4 h-4" /> Download YAML
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
                <span className="text-xs text-zinc-500 font-mono ml-2">/etc/netplan/01-netcfg.yaml</span>
              </div>
              <div className="p-4 overflow-x-auto">
                <pre className="font-mono text-sm leading-relaxed text-indigo-100">
                  {generatedYaml}
                </pre>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-lg p-4 text-sm text-blue-900 dark:text-blue-200">
            <h4 className="font-semibold mb-1 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Usage Instructions
            </h4>
            <ol className="list-decimal list-inside space-y-1 opacity-80 pl-1">
              <li>Download the YAML file</li>
              <li>Move it to <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/40 rounded text-xs font-mono">/etc/netplan/</code></li>
              <li>Set permissions: <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/40 rounded text-xs font-mono">sudo chmod 600 /etc/netplan/*.yaml</code></li>
              <li>Apply changes: <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/40 rounded text-xs font-mono">sudo netplan apply</code></li>
            </ol>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
