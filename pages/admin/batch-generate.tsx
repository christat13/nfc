// FILE: /pages/admin/batch-generate.tsx

import { useState } from "react";
import Papa, { ParseResult } from "papaparse";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";

interface ProfileRow {
  code: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  company?: string;
  email?: string;
  phone?: string;
  website?: string;
  linkedin?: string;
}

export default function BatchGenerate() {
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      toast.error("No file selected");
      return;
    }

    Papa.parse<ProfileRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: ParseResult<ProfileRow>) => {
        try {
          setLoading(true);
          const rows = results.data;

          if (!rows.length) {
            toast.error("CSV is empty or invalid.");
            return;
          }

          console.log("📥 Parsed rows:", rows);

          for (const row of rows) {
            const code = row.code?.trim();
            if (!code) {
              console.warn("❌ Skipping row with no code:", row);
              continue;
            }

            await setDoc(doc(db, "profiles", code), {
              ...row,
              code,
              createdAt: serverTimestamp(),
            });
          }

          toast.success(`✅ Created ${rows.length} profiles`);
        } catch (err) {
          console.error("🔥 Error saving profiles:", err);
          toast.error("Upload failed");
        } finally {
          setLoading(false);
        }
      },
      error: (err) => {
        console.error("❌ Error parsing CSV:", err);
        toast.error("CSV parsing failed");
      },
    });
  };

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold">Batch Create NFC Profiles</h1>
      <input type="file" accept=".csv" onChange={handleFileUpload} className="block w-full" />
      {loading && <p className="text-blue-500">Uploading and saving profiles...</p>}
    </div>
  );
}
