import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { QRCode } from "qrcode.react";

export default function PublicProfile() {
  const router = useRouter();
  const { code } = router.query;

  const [profile, setProfile] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [fullURL, setFullURL] = useState("");

  useEffect(() => {
    if (!router.isReady || !code || typeof code !== "string") return;

    setProfile({
      name: "Taylor",
      photo: "https://via.placeholder.com/100",
      info: "https://example.com/sample.pdf",
      coolLink: "https://example.com",
      email: "taylor@example.com",
      phone: "1234567890",
      role: "Engineer",
      organization: "Test Inc",
    });

    if (typeof window !== "undefined") {
      setFullURL(window.location.href);
    }
  }, [router.isReady, code]);

  if (!router.isReady || !code || typeof code !== "string") return <div>Loading…</div>;
  if (!profile) return <div>Loading profile…</div>;

  return (
    <div style={{ fontFamily: "sans-serif", padding: 20 }}>
      <h1>✅ Final Render Test</h1>
      <p>Code: {code}</p>
      <p>Name: {profile.name}</p>

      {typeof profile.photo === "string" && profile.photo.startsWith("http") && (
        <img
          src={profile.photo}
          alt="Profile"
          width={100}
          onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
        />
      )}

      {typeof profile.info === "string" && profile.info.startsWith("http") && (
        <p>
          Info File:{" "}
          <a href={profile.info} target="_blank" rel="noopener noreferrer">
            {profile.info}
          </a>
        </p>
      )}

      {typeof profile.coolLink === "string" && (
        <p>
          Cool Link:{" "}
          <a
            href={
              profile.coolLink.startsWith("http")
                ? profile.coolLink
                : `https://${profile.coolLink}`
            }
            target="_blank"


// This code displays a public profile page for NFC pins, allowing users to view their profile information,
// download a vCard, copy the profile link, and edit their profile if they are the owner. It uses QR codes for easy sharing and updates the profile's viewed timestamp in Firestore when accessed.
// It also handles cases where the profile is unclaimed by redirecting to the edit page.