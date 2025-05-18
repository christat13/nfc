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
    if (!file) return;

    Papa.parse<ProfileRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: ParseResult<ProfileRow>) => {
        try {
          setLoading(true);
          const rows = results.data;

          console.log("📦 Parsed rows:", rows);

          const validRows = rows.filter((row) => row.code?.trim());
          if (validRows.length === 0) {
            toast.error("No valid rows found.");
            return;
          }

          await Promise.all(
            validRows.map(async (row) => {
              const code = row.code.trim();
              console.log("🔑 Saving profile for code:", code);

              await setDoc(doc(db, "profiles", code), {
                ...row,
                code,
                createdAt: serverTimestamp(),
              });
            })
          );

          toast.success("✅ All profiles created!");
        } catch (err) {
          console.error("🔥 Error saving profiles:", err);
          toast.error("❌ Failed to generate profiles");
        } finally {
          setLoading(false);
        }
      },
      error: (err) => {
        console.error("❌ CSV Parse error:", err);
        toast.error("Could not parse CSV file");
      },
    });
  };

  return (
    <div className="max-w-xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold">Batch Create Profiles</h1>
      <input type="file" accept=".csv" onChange={handleFileUpload} />
      {loading && <p className="text-blue-600">Saving profiles...</p>}
    </div>
  );
}

