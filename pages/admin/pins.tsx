import { useEffect, useState } from "react";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { app } from "@/lib/firebase";
import {
  AiOutlineFilePdf,
  AiOutlineFileWord,
  AiOutlineFileUnknown,
  AiOutlineDownload,
} from "react-icons/ai";

interface ProfileData {
  code: string;
  uid?: string;
  name?: string;
  email?: string;
  organization?: string;
  phone?: string;
  role?: string;
  lastUpdated?: any;   // Firestore Timestamp | ISO string | undefined
  viewedAt?: any;      // Firestore Timestamp | ISO string | undefined
  viewCount?: number;  // some docs might use this
  views?: number;      // some docs might use this (your live pages increment "views")
  downloads?: number;
  info?: string;
  photo?: string;
  file?: string;
}

function toDateString(v: any): string {
  try {
    if (!v) return "-";
    // Firestore Timestamp support
    if (typeof v?.toDate === "function") return v.toDate().toLocaleString();
    // ISO or millis
    const d = new Date(v);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleString();
  } catch {
    return "-";
  }
}

export default function AdminPins() {
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [filtered, setFiltered] = useState<ProfileData[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "claimed" | "unclaimed">("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfiles = async () => {
      const db = getFirestore(app);
      const profilesCol = collection(db, "profiles");
      const snapshot = await getDocs(profilesCol);
      const data = snapshot.docs.map((doc) => ({
        code: doc.id,
        ...doc.data(),
      })) as ProfileData[];
      setProfiles(data);
      setFiltered(data);
      setIsLoading(false);
    };

    fetchProfiles();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    const filteredData = profiles.filter((p) => {
      const matchesSearch = [p.code, p.name, p.email].some((field) =>
        field?.toLowerCase().includes(q)
      );
      const isClaimed = !!p.uid;
      if (filterType === "claimed" && !isClaimed) return false;
      if (filterType === "unclaimed" && isClaimed) return false;
      return matchesSearch;
    });
    setFiltered(filteredData);
  }, [search, profiles, filterType]);

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
      "Last Viewed",
      "Views",
      "Downloads",
      "Photo",
      "File",
      "Info",
    ];

    const rows = filtered.map((p) => [
      p.code,
      p.uid ? "Yes" : "No",
      p.uid || "",
      p.name || "",
      p.email || "",
      p.organization || "",
      p.phone || "",
      p.role || "",
      toDateString(p.lastUpdated),
      toDateString(p.viewedAt),
      String(p.viewCount ?? p.views ?? 0), // <- works with either field
      String(p.downloads ?? 0),
      p.photo || "",
      p.file || "",
      p.info || "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((f) => `"${String(f).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "pins.csv";
    link.click();
  };

  const claimedCount = profiles.filter((p) => p.uid).length;

  const renderFileIcon = (url?: string) => {
    if (!url) return null;
    if (url.includes(".pdf")) return <AiOutlineFilePdf className="inline text-red-600" />;
    if (url.includes(".doc") || url.includes(".docx")) return <AiOutlineFileWord className="inline text-blue-600" />;
    return <AiOutlineFileUnknown className="inline text-gray-500" />;
    };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-2 text-blue-700">NFC Pin Dashboard</h1>

      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="text-sm text-gray-600">✅ {claimedCount} pins claimed</div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex gap-1 text-sm">
            {["all", "claimed", "unclaimed"].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type as any)}
                className={`px-2 py-1 border rounded ${
                  filterType === type ? "bg-blue-600 text-white" : "bg-white text-blue-600 border-blue-600"
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Search name, email, or code"
            className="border border-gray-300 rounded px-3 py-1 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            onChange={(e) => {
              const sortKey = e.target.value;
              const sorted = [...filtered].sort((a, b) => {
                if (sortKey === "views") return (b.viewCount ?? b.views ?? 0) - (a.viewCount ?? a.views ?? 0);
                if (sortKey === "downloads") return (b.downloads ?? 0) - (a.downloads ?? 0);
                if (sortKey === "name") return (a.name || "").localeCompare(b.name || "");
                if (sortKey === "viewedAt") return new Date(b.viewedAt || 0).getTime() - new Date(a.viewedAt || 0).getTime();
                return 0;
              });
              setFiltered(sorted);
            }}
            className="border px-2 py-1 text-sm rounded"
          >
            <option value="">Sort...</option>
            <option value="views">View Count (High → Low)</option>
            <option value="downloads">Download Count (High → Low)</option>
            <option value="viewedAt">Last Viewed (Recent First)</option>
            <option value="name">Name (A–Z)</option>
          </select>

          <button
            onClick={downloadCSV}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Export Claimed Pins
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-gray-500">Loading profiles...</div>
      ) : (
        <table className="w-full table-auto border border-gray-300 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left border">Code</th>
              <th className="px-3 py-2 text-left border">Claimed</th>
              <th className="px-3 py-2 text-left border">UID</th>
              <th className="px-3 py-2 text-left border">Name</th>
              <th className="px-3 py-2 text-left border">Email</th>
              <th className="px-3 py-2 text-left border">Organization</th>
              <th className="px-3 py-2 text-left border">Phone</th>
              <th className="px-3 py-2 text-left border">Role</th>
              <th className="px-3 py-2 text-left border">Last Updated</th>
              <th className="px-3 py-2 text-left border">Last Viewed</th>
              <th className="px-3 py-2 text-left border">View Count</th>
              <th className="px-3 py-2 text-left border">Download Count</th>
              <th className="px-3 py-2 text-left border">Info</th>
              <th className="px-3 py-2 text-left border">File</th>
              <th className="px-3 py-2 text-left border">Photo</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((profile) => (
              <tr key={profile.code} className="border-t">
                <td className="px-3 py-1 border">{profile.code}</td>
                <td className="px-3 py-1 border">{profile.uid ? "✅" : "❌"}</td>
                <td className="px-3 py-1 border">{profile.uid || "-"}</td>
                <td className="px-3 py-1 border">{profile.name || "-"}</td>
                <td className="px-3 py-1 border">{profile.email || "-"}</td>
                <td className="px-3 py-1 border">{profile.organization || "-"}</td>
                <td className="px-3 py-1 border">{profile.phone || "-"}</td>
                <td className="px-3 py-1 border">{profile.role || "-"}</td>
                <td className="px-3 py-1 border">{toDateString(profile.lastUpdated)}</td>
                <td className="px-3 py-1 border">{toDateString(profile.viewedAt)}</td>
                <td className="px-3 py-1 border">{profile.viewCount ?? profile.views ?? "-"}</td>
                <td className="px-3 py-1 border">{profile.downloads ?? "-"}</td>
                <td className="px-3 py-1 border">
                  {profile.info ? (
                    <a
                      href={profile.info}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {renderFileIcon(profile.info)}
                      <AiOutlineDownload className="inline text-gray-600" />
                      <span className="truncate max-w-[120px] inline-block align-middle" title={profile.info}>
                        {decodeURIComponent(profile.info.split("/").pop()?.split("?")[0] || "file")}
                      </span>
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-3 py-1 border">
                  {profile.file ? (
                    <a
                      href={profile.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Download
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-3 py-1 border">
                  {profile.photo ? (
                    <img src={profile.photo} alt="Profile" className="w-10 h-10 object-cover rounded" />
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
