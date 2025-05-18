import { useEffect } from "react";
import { useRouter } from "next/router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function IdRedirect() {
  const router = useRouter();
  const { code } = router.query;

  useEffect(() => {
    if (!router.isReady || !code || typeof code !== "string") return;

    const checkProfile = async () => {
      console.log("🔍 Checking Firestore for:", code);
      try {
        const ref = doc(db, "profiles", code);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          console.log("✅ Found profile:", data);

          if (data?.uid) {
            router.replace(`/profile/${code}`);
          } else {
            router.replace(`/setup/${code}`);
          }
        } else {
          console.log("❌ No profile found. Going to setup.");
          router.replace(`/setup/${code}`);
        }
      } catch (err) {
        console.error("🔥 Redirect error:", err);
        router.replace(`/setup/${code}`);
      }
    };

    checkProfile();
  }, [router.isReady, code]);

  return (
    <div className="flex items-center justify-center h-screen text-lg text-gray-600">
      Loading...
    </div>
  );
}
