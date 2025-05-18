// FILE: /pages/id/[code].tsx
import { useEffect } from "react";
import { useRouter } from "next/router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function IdRedirect() {
  const router = useRouter();
  const { code } = router.query;

  useEffect(() => {
    if (!code || typeof code !== "string") return;

    const checkProfile = async () => {
      try {
        const ref = doc(db, "profiles", code);
        const snap = await getDoc(ref);

        if (snap.exists() && snap.data()?.uid) {
          // ✅ Already claimed
          router.replace(`/profile/${code}`);
        } else {
          // 🚧 Not claimed
          router.replace(`/setup/${code}`);
        }
      } catch (err) {
        console.error("Redirect error:", err);
        router.replace(`/setup/${code}`);
      }
    };

    checkProfile();
  }, [code, router]);

  return <p className="text-center p-6">Checking pin status...</p>;
}
