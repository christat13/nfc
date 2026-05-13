import { useEffect, useState } from "react";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { app, auth } from "@/lib/firebase";
import { getBaseUrl, getClientId } from "../../lib/siteConfig";

function getAdminUids(): string[] {
  return (process.env.NEXT_PUBLIC_ADMIN_UIDS || "")
    .split(",")
    .map((uid) => uid.trim())
    .filter(Boolean);
}

function generateCode(prefix: string, length: number): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let code = "";

  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const cleanPrefix = prefix.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "");

  return cleanPrefix ? `${cleanPrefix}-${code}` : code;
}

function downloadCSV(rows: any[], filename: string) {
  const headers = ["code", "clientId", "claimUrl", "profileUrl", "status", "batchName", "createdAt"];

  const csv = [
    headers,
    ...rows.map((row) => headers.map((h) => row[h] || "")),
  ]
    .map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");

  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();

  URL.revokeObjectURL(link.href);
}

export default function GeneratePinsPage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [quantity, setQuantity] = useState(25);
  const [prefix, setPrefix] = useState("pin");
  const [codeLength, setCodeLength] = useState(6);
  const [clientId, setClientId] = useState(getClientId());
  const [batchName, setBatchName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedRows, setGeneratedRows] = useState<any[]>([]);

  const adminUids = getAdminUids();
  const baseUrl = getBaseUrl();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAdminUser(user);
      setIsAdmin(!!user && adminUids.includes(user.uid));
      setAuthLoading(false);
    });

    return () => unsub();
  }, []);

  const handleAdminLogin = async () => {
    setLoginError("");

    try {
      const cred = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);

      if (!adminUids.includes(cred.user.uid)) {
        await signOut(auth);
        setLoginError("This account is not authorized for admin access.");
      }
    } catch (err: any) {
      setLoginError(err?.message || "Sign-in failed.");
    }
  };

  const handleAdminLogout = async () => {
    await signOut(auth);
  };

  const handleGeneratePins = async () => {
    if (!isAdmin) return;
    if (quantity < 1 || quantity > 1000) {
      alert("Please use a quantity between 1 and 1000.");
      return;
    }

    setGenerating(true);
    setGeneratedRows([]);

    try {
      const db = getFirestore(app);
      const createdRows: any[] = [];
      const usedCodes = new Set<string>();
      const createdAt = new Date().toISOString();

      while (createdRows.length < quantity) {
        const code = generateCode(prefix, codeLength);

        if (usedCodes.has(code)) continue;
        usedCodes.add(code);

        const ref = doc(db, "profiles", code);
        const existing = await getDoc(ref);

        if (existing.exists()) continue;

        const claimUrl = `${baseUrl}/id/${code}`;
        const profileUrl = `${baseUrl}/profile/${code}`;

        await setDoc(ref, {
          clientId,
          batchName: batchName.trim() || "default",
          claimed: false,
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
          views: 0,
          downloads: 0,
        });

        createdRows.push({
          code,
          clientId,
          claimUrl,
          profileUrl,
          status: "unclaimed",
          batchName: batchName.trim() || "default",
          createdAt,
        });
      }

      setGeneratedRows(createdRows);

      downloadCSV(
        createdRows,
        `nfc-mobile-pins-${batchName.trim() || "batch"}-${new Date().toISOString().slice(0, 10)}.csv`
      );
    } catch (err: any) {
      alert(err?.message || "Failed to generate pins.");
    } finally {
      setGenerating(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Checking admin access...
      </div>
    );
  }

  if (!adminUser || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <h1 className="text-2xl font-bold text-blue-700 mb-2">Admin Sign In</h1>
          <p className="text-sm text-gray-600 mb-5">Authorized NFC Mobile admins only.</p>

          <input
            type="email"
            placeholder="Admin email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 mb-3"
          />

          <input
            type="password"
            placeholder="Password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 mb-3"
          />

          {loginError && <div className="text-sm text-red-600 mb-3">{loginError}</div>}

          <button
            onClick={handleAdminLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded py-2"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-blue-700">Generate NFC Pins</h1>
          <p className="text-sm text-gray-600">
            Create unclaimed profile records and export NFC encoding URLs.
          </p>
        </div>

        <button
          onClick={handleAdminLogout}
          className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-100"
        >
          Sign Out
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 grid gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Batch Name</label>
          <input
            type="text"
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            placeholder="Example: INTA 2026"
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input
              type="number"
              min={1}
              max={1000}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prefix</label>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="pin"
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Code Length</label>
            <input
              type="number"
              min={4}
              max={12}
              value={codeLength}
              onChange={(e) => setCodeLength(Number(e.target.value))}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-900">
          NFC chips should be encoded with the claim URL, for example:
          <div className="font-mono mt-1 break-all">
            {baseUrl}/id/{prefix || "pin"}-abc123
          </div>
        </div>

        <button
          onClick={handleGeneratePins}
          disabled={generating}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded py-3 disabled:opacity-60"
        >
          {generating ? "Generating Pins..." : "Generate Pins And Download CSV"}
        </button>
      </div>

      {generatedRows.length > 0 && (
        <div className="mt-6 border border-gray-200 rounded-2xl overflow-hidden">
          <div className="p-4 bg-gray-50 border-b">
            <h2 className="font-semibold text-gray-800">Generated Pins</h2>
            <p className="text-sm text-gray-600">{generatedRows.length} pins created.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left border px-3 py-2">Code</th>
                  <th className="text-left border px-3 py-2">Client</th>
                  <th className="text-left border px-3 py-2">Claim URL</th>
                  <th className="text-left border px-3 py-2">Profile URL</th>
                </tr>
              </thead>

              <tbody>
                {generatedRows.map((row) => (
                  <tr key={row.code}>
                    <td className="border px-3 py-2 font-medium">{row.code}</td>
                    <td className="border px-3 py-2">{row.clientId}</td>
                    <td className="border px-3 py-2">
                      <a href={row.claimUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                        {row.claimUrl}
                      </a>
                    </td>
                    <td className="border px-3 py-2">
                      <a href={row.profileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                        {row.profileUrl}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}