import { useEffect } from "react";
import { useRouter } from "next/router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function IdRedirect() {
  const router = useRouter();
  const { code } = router.query;

  useEffect(() => {
    if (!router.isReady) return; // 🛑 Wait for router to be ready

    if (!code || typeof code !== "string") {
      console.warn("❌ Invalid or missing code:", code);
      return;
    }

    const checkProfile = async () => {
      console.log("🚦 useEffect triggered with code:", code);

      try {
        const ref = doc(db, "profiles", code);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          console.log("✅ Profile found:", data);

          if (data?.uid) {
            console.log("🔁 Redirecting to public profile:", `/profile/${code}`);
            router.replace(`/profile/${code}`);
          } else {
            console.log("⚠️ Profile exists but missing uid. Redirecting to setup:", `/setup/${code}`);
            router.replace(`/setup/${code}`);
          }
        } else {
          console.log("❌ Profile does not exist. Redirecting to setup:", `/setup/${code}`);
          router.replace(`/setup/${code}`);
        }
      } catch (err) {
        console.error("🔥 Error during Firestore check or redirect:", err);
        router.replace(`/setup/${code}`);
      }
    };

    checkProfile();
  }, [router.isReady, code, router]);

  return (
    <div className="flex items-center justify-center h-screen text-lg text-white">
      <span>⚙️ Checking pin status...</span>
    </div>
  );
}
