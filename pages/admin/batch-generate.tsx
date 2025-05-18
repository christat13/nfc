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

    console.log("📄 Selected file:", file.name);

    Papa.parse<ProfileRow>(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete: async (results: ParseResult<ProfileRow>) => {
        const rows = results.data;
        console.log("🧾 Parsed rows:", rows);

        if (!rows.length) {
          toast.error("No data found in file");
          return;
        }

        try {
          setLoading(true);

          let created = 0;

          for (const row of rows) {
            const code = row.code?.trim();
            if (!code) {
              console.warn("⛔ Skipping row without code:", row);
              continue;
            }

            await setDoc(doc(db, "profiles", code), {
              ...row,
              code,
              createdAt: serverTimestamp(),
            });

            console.log("✅ Uploaded profile for:", code);
            created++;
          }

          toast.success(`✅ Created ${created} profiles`);
        } catch (err) {
          console.error("🔥 Error saving profiles:", err);
          toast.error("Failed to generate profiles");
        } finally {
          setLoading(false);
        }
      },
      error: (err) => {
        console.error("❌ PapaParse error:", err);
        toast.error("Failed to parse CSV");
      }
    });
  };

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold">Batch Create Profiles</h1>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        className="block w-full border p-2 rounded"
      />
      {loading && <p>⏳ Saving profiles...</p>}
    </div>
  );
}
