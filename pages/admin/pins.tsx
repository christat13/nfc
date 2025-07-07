import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
  DocumentData,
} from "firebase/firestore";
import { DownloadIcon } from "@radix-ui/react-icons";

const exportCSV = (rows: any[], filename: string) => {
  const header = Object.keys(rows[0]).join(",");
  const csv =
    header +
    "\n" +
    rows.map((row) => Object.values(row).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export default function AdminPins() {
  const [claimed, setClaimed] = useState<DocumentData[]>([]);
  const [unclaimed, setUnclaimed] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfiles = async () => {
      const q = query(collection(db, "profiles"), orderBy("lastUpdated", "desc"));
      const snap = await getDocs(q);
      const claimedPins: DocumentData[] = [];
      const unclaimedPins: DocumentData[] = [];

      snap.forEach((doc) => {
        const data = doc.data();
        const item = { id: doc.id, ...data };
        if (data.uid) claimedPins.push(item);
        else unclaimedPins.push(item);
      });

      setClaimed(claimedPins);
      setUnclaimed(unclaimedPins);
      setLoading(false);
    };

    fetchProfiles();
  }, []);

  if (loading) {
    return <div className="p-4">Loading pins...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Pin Analytics Dashboard</h1>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold">Claimed Pins ({claimed.length})</h2>
          <button
            onClick={() => exportCSV(claimed, "claimed_pins.csv")}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded"
          >
            <DownloadIcon /> Export CSV
          </button>
        </div>
        <div className="border rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Code</th>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Email</th>
                <th className="p-2 text-left">Last Viewed</th>
              </tr>
            </thead>
            <tbody>
              {claimed.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-2 font-mono">{item.id}</td>
                  <td className="p-2">{item.name || "-"}</td>
                  <td className="p-2">{item.email || "-"}</td>
                  <td className="p-2 text-xs text-gray-500">{item.viewedAt?.slice(0, 19) || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold">Unclaimed Pins ({unclaimed.length})</h2>
          <button
            onClick={() => exportCSV(unclaimed, "unclaimed_pins.csv")}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-600 text-white rounded"
          >
            <DownloadIcon /> Export CSV
          </button>
        </div>
        <div className="border rounded overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Code</th>
                <th className="p-2 text-left">Created</th>
                <th className="p-2 text-left">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {unclaimed.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-2 font-mono">{item.id}</td>
                  <td className="p-2 text-xs text-gray-500">{item.createdAt?.slice(0, 19) || "-"}</td>
                  <td className="p-2 text-xs text-gray-500">{item.lastUpdated?.slice(0, 19) || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

