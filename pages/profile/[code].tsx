import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";

// This library has a clean default export
const QRCode = dynamic(() =>
  import("react-qrcode-logo").then((mod) => mod.QRCode),
  { ssr: false }
);


export default function PublicProfile() {
  const router = useRouter();
  const { code } = router.query;
  const [fullURL, setFullURL] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setFullURL(window.location.href);
    }
  }, [code]);

  return (
    <div style={{ fontFamily: "sans-serif", padding: 40 }}>
      <h1>✅ QR Code Test Page</h1>
      <p>Code: {code}</p>
      <p>Full URL: {fullURL}</p>

      {fullURL && (
        <div style={{ marginTop: 20 }}>
          <QRCode value={fullURL} size={128} />
        </div>
      )}
    </div>
  );
}
