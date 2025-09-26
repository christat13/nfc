import { useEffect, useState } from "react";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { saveAs } from "file-saver";
import { db } from "@/lib/firebase"; 

interface ProfileData {
  code: string;
  uid?: string;
  name?: string;
  email?: string;
  organization?: string;
  phone?: string;
  role?: string;
  lastUpdated?: string;
  viewedAt?: string;
}

export default function AdminAnalyticsView() {
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchProfiles = async () => {
    try {
      const profilesCol = collection(db, "profiles");
      const snap = await getDocs(profilesCol);
      const data = snap.docs.map((d) => ({ code: d.id, ...d.data() })) as ProfileData[];
      setProfiles(data);
    } catch (err) {
      console.error("[analytics] fetchProfiles error:", err);
    } finally {
      setLoading(false);
    }
  };

  fetchProfiles();
}, []);


  const downloadCSV = () => {
    const headers = [
      "Code",
      "Claimed",
      "UID",
      "Name",
      "Email",
      "Organization",
      "Phone",
      "Role",
      "Last Updated",
      "Viewed At",
    ];

    const rows = profiles.map((p) => [
      p.code,
      p.uid ? "Yes" : "No",
      p.uid || "",
      p.name || "",
      p.email || "",
      p.organization || "",
      p.phone || "",
      p.role || "",
      p.lastUpdated || "",
      p.viewedAt || "",
    ]);

    const csvContent =
      [headers, ...rows]
        .map((row) => row.map((field) => `"${field}"`).join(","))
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    saveAs(blob, "analytics_export.csv");
  };

  const claimedCount = profiles.filter((p) => p.uid).length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Admin Analytics Dashboard</h1>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
            <div className="bg-gray-100 rounded p-3">
              <div className="text-gray-500">Total Pins</div>
              <div className="font-bold text-xl">{profiles.length}</div>
            </div>
            <div className="bg-gray-100 rounded p-3">
              <div className="text-gray-500">Claimed</div>
              <div className="font-bold text-xl">{claimedCount}</div>
            </div>
            <div className="bg-gray-100 rounded p-3">
              <div className="text-gray-500">Unclaimed</div>
              <div className="font-bold text-xl">{profiles.length - claimedCount}</div>
            </div>
          </div>

          <button
            onClick={downloadCSV}
            className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Export to CSV
          </button>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 py-1 border">Code</th>
                  <th className="px-2 py-1 border">Claimed</th>
                  <th className="px-2 py-1 border">Name</th>
                  <th className="px-2 py-1 border">Email</th>
                  <th className="px-2 py-1 border">Organization</th>
                  <th className="px-2 py-1 border">Phone</th>
                  <th className="px-2 py-1 border">Role</th>
                  <th className="px-2 py-1 border">Last Updated</th>
                  <th className="px-2 py-1 border">Viewed At</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.code} className="border-t">
                    <td className="px-2 py-1 border font-mono text-xs">{p.code}</td>
                    <td className="px-2 py-1 border">{p.uid ? "✅" : "❌"}</td>
                    <td className="px-2 py-1 border">{p.name || "-"}</td>
                    <td className="px-2 py-1 border">{p.email || "-"}</td>
                    <td className="px-2 py-1 border">{p.organization || "-"}</td>
                    <td className="px-2 py-1 border">{p.phone || "-"}</td>
                    <td className="px-2 py-1 border">{p.role || "-"}</td>
                    <td className="px-2 py-1 border">
                      {p.lastUpdated ? new Date(p.lastUpdated).toLocaleString() : "-"}
                    </td>
                    <td className="px-2 py-1 border">
                      {p.viewedAt ? new Date(p.viewedAt).toLocaleString() : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
// This code provides an admin analytics dashboard that displays statistics about NFC pins, including total pins, claimed pins, and unclaimed pins.
// It allows administrators to export profile data to a CSV file, which includes details like code, claimed status, name, email, organization, phone, role, last updated timestamp, and viewed timestamp.
// The dashboard fetches profile data from Firestore and displays it in a table format, with options to download the data as a CSV file.
// It also includes a loading state while fetching data from Firestore.