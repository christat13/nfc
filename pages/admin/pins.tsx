import { useEffect, useMemo, useState } from "react";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { app, auth } from "@/lib/firebase";
import { getBaseUrl, getClientId } from "../../lib/siteConfig";
import {
  AiOutlineFilePdf,
  AiOutlineFileWord,
  AiOutlineFileUnknown,
  AiOutlineDownload,
} from "react-icons/ai";

interface ProfileData {
  code: string;
  clientId?: string;
  uid?: string;
  claimed?: boolean;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  organization?: string;
  org?: string;
  company?: string;
  phone?: string;
  role?: string;
  title?: string;
  lastUpdated?: any;
  viewedAt?: any;
  downloadedAt?: any;
  viewCount?: number;
  views?: number;
  downloads?: number;
  info?: string;
  infoName?: string;
  file?: string;
  fileName?: string;
  fileShare1?: string;
  fileShare1Name?: string;
  fileShare2?: string;
  fileShare2Name?: string;
  photo?: string;
}

function toDateString(v: any): string {
  try {
    if (!v) return "-";
    if (typeof v?.toDate === "function") return v.toDate().toLocaleString();
    const d = new Date(v);
    return isNaN(d.getTime()) ? "-" : d.toLocaleString();
  } catch {
    return "-";
  }
}

function getDisplayName(p: ProfileData): string {
  const fullName = [p.firstName, p.lastName].filter(Boolean).join(" ").trim();
  return fullName || p.name || "-";
}

function getOrganization(p: ProfileData): string {
  return p.organization || p.org || p.company || "-";
}

function getRole(p: ProfileData): string {
  return p.role || p.title || "-";
}

function getViews(p: ProfileData): number {
  return p.viewCount ?? p.views ?? 0;
}

function getDownloads(p: ProfileData): number {
  return p.downloads ?? 0;
}

function getFileLabel(url?: string, explicitName?: string): string {
  if (explicitName) return explicitName;
  if (!url) return "file";

  try {
    return decodeURIComponent(url.split("/").pop()?.split("?")[0] || "file");
  } catch {
    return "file";
  }
}

function getAdminUids(): string[] {
  return (process.env.NEXT_PUBLIC_ADMIN_UIDS || "")
    .split(",")
    .map((uid) => uid.trim())
    .filter(Boolean);
}

export default function AdminPins() {
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [filtered, setFiltered] = useState<ProfileData[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "claimed" | "unclaimed">("all");
  const [clientFilter, setClientFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  const [authLoading, setAuthLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const defaultClientId = getClientId();
  const baseUrl = getBaseUrl();
  const adminUids = useMemo(() => getAdminUids(), []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAdminUser(user);
      setIsAdmin(!!user && adminUids.includes(user.uid));
      setAuthLoading(false);
    });

    return () => unsub();
  }, [adminUids]);

  useEffect(() => {
    if (!isAdmin) return;

    const fetchProfiles = async () => {
      setIsLoading(true);

      const db = getFirestore(app);
      const profilesCol = collection(db, "profiles");
      const snapshot = await getDocs(profilesCol);

      const data = snapshot.docs.map((doc) => {
        const raw = doc.data() as Partial<ProfileData>;

        return {
          code: doc.id,
          clientId: raw.clientId || defaultClientId,
          ...raw,
        };
      }) as ProfileData[];

      setProfiles(data);
      setFiltered(data);
      setIsLoading(false);
    };

    fetchProfiles();
  }, [isAdmin, defaultClientId]);

  const clientIds = useMemo(() => {
    const ids = new Set<string>();
    profiles.forEach((p) => ids.add(p.clientId || defaultClientId));
    return Array.from(ids).sort();
  }, [profiles, defaultClientId]);

  useEffect(() => {
    const q = search.toLowerCase().trim();

    let filteredData = profiles.filter((p) => {
      const claimed = !!p.uid || !!p.claimed;

      if (filterType === "claimed" && !claimed) return false;
      if (filterType === "unclaimed" && claimed) return false;

      if (clientFilter !== "all" && (p.clientId || defaultClientId) !== clientFilter) {
        return false;
      }

      const searchable = [
        p.code,
        p.clientId,
        getDisplayName(p),
        p.email,
        getOrganization(p),
        getRole(p),
        p.phone,
      ];

      return searchable.some((field) => field?.toLowerCase().includes(q));
    });

    filteredData = [...filteredData].sort((a, b) => {
      if (sortKey === "views") return getViews(b) - getViews(a);
      if (sortKey === "downloads") return getDownloads(b) - getDownloads(a);
      if (sortKey === "name") return getDisplayName(a).localeCompare(getDisplayName(b));
      if (sortKey === "clientId") return (a.clientId || "").localeCompare(b.clientId || "");
      if (sortKey === "viewedAt") {
        const aDate = a.viewedAt?.toDate?.() || new Date(a.viewedAt || 0);
        const bDate = b.viewedAt?.toDate?.() || new Date(b.viewedAt || 0);
        return bDate.getTime() - aDate.getTime();
      }

      return 0;
    });

    setFiltered(filteredData);
  }, [search, profiles, filterType, clientFilter, sortKey, defaultClientId]);

  const handleAdminLogin = async () => {
    setLoginError("");

    try {
      const cred = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);

      if (!adminUids.includes(cred.user.uid)) {
        await signOut(auth);
        setLoginError("This account is not authorized for admin access.");
        return;
      }
    } catch (err: any) {
      setLoginError(err?.message || "Sign-in failed.");
    }
  };

  const handleAdminLogout = async () => {
    await signOut(auth);
  };

  const downloadCSV = () => {
    const headers = [
      "Code",
      "Client ID",
      "Claimed",
      "UID",
      "Name",
      "Email",
      "Organization",
      "Phone",
      "Role",
      "Last Updated",
      "Last Viewed",
      "Last Downloaded",
      "Views",
      "Downloads",
      "Public Profile",
      "Edit URL",
      "Photo",
      "File Share 1",
      "File Share 2",
      "Info",
    ];

    const rows = filtered.map((p) => [
      p.code,
      p.clientId || defaultClientId,
      p.uid || p.claimed ? "Yes" : "No",
      p.uid || "",
      getDisplayName(p),
      p.email || "",
      getOrganization(p),
      p.phone || "",
      getRole(p),
      toDateString(p.lastUpdated),
      toDateString(p.viewedAt),
      toDateString(p.downloadedAt),
      String(getViews(p)),
      String(getDownloads(p)),
      `${baseUrl}/profile/${p.code}`,
      `${baseUrl}/id/${p.code}`,
      p.photo || "",
      p.fileShare1 || "",
      p.fileShare2 || "",
      p.info || "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((f) => `"${String(f).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.download = `nfc-mobile-pins-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    URL.revokeObjectURL(link.href);
  };

  const claimedCount = profiles.filter((p) => !!p.uid || !!p.claimed).length;
  const unclaimedCount = profiles.length - claimedCount;
  const totalViews = profiles.reduce((sum, p) => sum + getViews(p), 0);
  const totalDownloads = profiles.reduce((sum, p) => sum + getDownloads(p), 0);

  const renderFileIcon = (url?: string) => {
    if (!url) return null;

    if (url.toLowerCase().includes(".pdf")) {
      return <AiOutlineFilePdf className="inline text-red-600" />;
    }

    if (url.toLowerCase().includes(".doc") || url.toLowerCase().includes(".docx")) {
      return <AiOutlineFileWord className="inline text-blue-600" />;
    }

    return <AiOutlineFileUnknown className="inline text-gray-500" />;
  };

  const renderFileLink = (url?: string, label?: string) => {
    if (!url) return "-";

    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline flex items-center gap-1"
      >
        {renderFileIcon(url)}
        <AiOutlineDownload className="inline text-gray-600" />
        <span className="truncate max-w-[140px] inline-block align-middle" title={label || url}>
          {getFileLabel(url, label)}
        </span>
      </a>
    );
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
          <p className="text-sm text-gray-600 mb-5">
            Authorized NFC Mobile admins only.
          </p>

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

          {loginError && (
            <div className="text-sm text-red-600 mb-3">{loginError}</div>
          )}

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
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold mb-1 text-blue-700">NFC Mobile Dashboard</h1>
          <p className="text-sm text-gray-600">
            Signed in as {adminUser.email}
          </p>
        </div>

        <button
          onClick={handleAdminLogout}
          className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-100"
        >
          Sign Out
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="border rounded-lg p-3 bg-white shadow-sm">
          <div className="text-xs text-gray-500">Total Pins</div>
          <div className="text-2xl font-bold text-gray-900">{profiles.length}</div>
        </div>

        <div className="border rounded-lg p-3 bg-white shadow-sm">
          <div className="text-xs text-gray-500">Claimed</div>
          <div className="text-2xl font-bold text-green-700">{claimedCount}</div>
        </div>

        <div className="border rounded-lg p-3 bg-white shadow-sm">
          <div className="text-xs text-gray-500">Unclaimed</div>
          <div className="text-2xl font-bold text-gray-700">{unclaimedCount}</div>
        </div>

        <div className="border rounded-lg p-3 bg-white shadow-sm">
          <div className="text-xs text-gray-500">Views / Downloads</div>
          <div className="text-2xl font-bold text-blue-700">
            {totalViews} / {totalDownloads}
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-4">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex gap-1 text-sm">
            {["all", "claimed", "unclaimed"].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type as "all" | "claimed" | "unclaimed")}
                className={`px-2 py-1 border rounded ${
                  filterType === type
                    ? "bg-blue-600 text-white"
                    : "bg-white text-blue-600 border-blue-600"
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="border px-2 py-1 text-sm rounded"
          >
            <option value="all">All clients</option>
            {clientIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Search name, email, code, client, company"
            className="border border-gray-300 rounded px-3 py-1 text-sm min-w-[260px]"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value)}
            className="border px-2 py-1 text-sm rounded"
          >
            <option value="">Sort...</option>
            <option value="views">View Count - High To Low</option>
            <option value="downloads">Download Count - High To Low</option>
            <option value="viewedAt">Last Viewed - Recent First</option>
            <option value="name">Name - A To Z</option>
            <option value="clientId">Client ID - A To Z</option>
          </select>

          <button
            onClick={downloadCSV}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Export CSV
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-gray-500">Loading profiles...</div>
      ) : (
        <div className="overflow-x-auto border border-gray-300 rounded-lg">
          <table className="w-full table-auto text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left border">Code</th>
                <th className="px-3 py-2 text-left border">Client</th>
                <th className="px-3 py-2 text-left border">Claimed</th>
                <th className="px-3 py-2 text-left border">Name</th>
                <th className="px-3 py-2 text-left border">Email</th>
                <th className="px-3 py-2 text-left border">Organization</th>
                <th className="px-3 py-2 text-left border">Phone</th>
                <th className="px-3 py-2 text-left border">Role</th>
                <th className="px-3 py-2 text-left border">Last Updated</th>
                <th className="px-3 py-2 text-left border">Last Viewed</th>
                <th className="px-3 py-2 text-left border">Views</th>
                <th className="px-3 py-2 text-left border">Downloads</th>
                <th className="px-3 py-2 text-left border">Public</th>
                <th className="px-3 py-2 text-left border">Edit</th>
                <th className="px-3 py-2 text-left border">Info</th>
                <th className="px-3 py-2 text-left border">File 1</th>
                <th className="px-3 py-2 text-left border">File 2</th>
                <th className="px-3 py-2 text-left border">Photo</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((profile) => (
                <tr key={profile.code} className="border-t hover:bg-blue-50/40">
                  <td className="px-3 py-2 border font-medium">{profile.code}</td>
                  <td className="px-3 py-2 border">{profile.clientId || defaultClientId}</td>
                  <td className="px-3 py-2 border">{profile.uid || profile.claimed ? "✅" : "❌"}</td>
                  <td className="px-3 py-2 border">{getDisplayName(profile)}</td>
                  <td className="px-3 py-2 border">{profile.email || "-"}</td>
                  <td className="px-3 py-2 border">{getOrganization(profile)}</td>
                  <td className="px-3 py-2 border">{profile.phone || "-"}</td>
                  <td className="px-3 py-2 border">{getRole(profile)}</td>
                  <td className="px-3 py-2 border">{toDateString(profile.lastUpdated)}</td>
                  <td className="px-3 py-2 border">{toDateString(profile.viewedAt)}</td>
                  <td className="px-3 py-2 border">{getViews(profile)}</td>
                  <td className="px-3 py-2 border">{getDownloads(profile)}</td>

                  <td className="px-3 py-2 border">
                    <a
                      href={`/profile/${profile.code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      View
                    </a>
                  </td>

                  <td className="px-3 py-2 border">
                    <a
                      href={`/id/${profile.code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Edit
                    </a>
                  </td>

                  <td className="px-3 py-2 border">
                    {renderFileLink(profile.info, profile.infoName)}
                  </td>

                  <td className="px-3 py-2 border">
                    {renderFileLink(profile.fileShare1 || profile.file, profile.fileShare1Name || profile.fileName)}
                  </td>

                  <td className="px-3 py-2 border">
                    {renderFileLink(profile.fileShare2, profile.fileShare2Name)}
                  </td>

                  <td className="px-3 py-2 border">
                    {profile.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.photo}
                        alt="Profile"
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td className="px-3 py-8 text-center text-gray-500" colSpan={18}>
                    No profiles found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
