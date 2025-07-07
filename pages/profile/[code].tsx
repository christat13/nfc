import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function DebugProfile() {
  const router = useRouter();
  const { code } = router.query;
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!router.isReady || !code || typeof code !== "string") return;

    setProfile({
      name: "Taylor Test",
      photo: null,
      info: null,
      coolLink: null,
    });
  }, [router.isReady, code]);

  if (!router.isReady || !code) return <div>Loading...</div>;
  if (!profile) return <div>Loading profile...</div>;

  return (
    <div style={{ padding: "40px", fontFamily: "sans-serif" }}>
      <h1>✅ Debug Profile Page</h1>
      <p>Code: {code}</p>
      <p>Name: {profile.name}</p>
    </div>
  );
}


// This code displays a public profile page for NFC pins, allowing users to view their profile information,
// download a vCard, copy the profile link, and edit their profile if they are the owner. It uses QR codes for easy sharing and updates the profile's viewed timestamp in Firestore when accessed.
// It also handles cases where the profile is unclaimed by redirecting to the edit page.