import Head from "next/head";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import Image from "next/image";
import logo from "@/public/logo.png";
import { FaTwitter, FaInstagram, FaLinkedin, FaGlobe } from "react-icons/fa";

const slogans = [
  "Tap.  Connect.  Share.",
  "Your NFC Identity, In Motion.",
  "Claim Your Mobile Profile.",
  "Turn Every Pin Into a Digital Connection.",
  "Your Contact Card, Always Up To Date.",
  "Share Your Profile With One Tap.",
  "Built For Events, Teams, And Brands.",
  "No App Required.",
  "Digital Identity For The Real World.",
  "One Tap.  One Profile.  Always Current.",
];

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [sloganIndex, setSloganIndex] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleaned = code
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "");

    if (!cleaned) return;

    router.push(`/id/${cleaned}`);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setSloganIndex((prev) => (prev + 1) % slogans.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12 subtle-grid text-center relative">
      <Head>
        <title>NFC Mobile | Digital Profiles For NFC Pins</title>
        <meta
          name="description"
          content="NFC Mobile lets people claim, edit, and share digital profiles from NFC-enabled pins, badges, cards, and event credentials."
        />
      </Head>

      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-5 z-0 pointer-events-none">
        <Image src={logo} alt="NFC Mobile Watermark" width={500} height={250} />
      </div>

      <main className="z-10 w-full max-w-md sm:max-w-xl">
        <Image src={logo} alt="NFC Mobile Logo" width={140} height={60} className="mx-auto" />

        <h1 className="text-3xl sm:text-5xl font-bold text-blue-700 leading-tight mt-5">
          NFC Mobile
        </h1>

        <p className="text-lg sm:text-xl font-semibold text-gray-800 mt-3">
          Digital profiles for NFC pins, badges, cards, and events.
        </p>

        <p
          className="text-base sm:text-lg h-7 mt-3 transition-opacity duration-700 ease-in-out animate-fade"
          style={{ color: "#2563eb" }}
        >
          {slogans[sloganIndex]}
        </p>

        <form onSubmit={handleSubmit} className="w-full space-y-4 mt-7 px-2 sm:px-0">
          <input
            type="text"
            placeholder="Enter your pin code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full px-4 py-3 rounded border-2 border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 text-center text-base bg-white text-black"
          />

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded flex justify-center items-center gap-2 text-lg"
          >
            Claim Or Edit Profile
          </button>
        </form>

        <div className="mt-8 grid gap-3 text-left bg-white/90 border border-blue-100 rounded-2xl p-5 shadow-sm">
          <div>
            <p className="font-semibold text-blue-700">For Attendees</p>
            <p className="text-sm text-gray-700">
              Tap your NFC pin and claim a profile you can update anytime.
            </p>
          </div>

          <div>
            <p className="font-semibold text-blue-700">For Events</p>
            <p className="text-sm text-gray-700">
              Give every badge, pin, or card a simple digital identity experience.
            </p>
          </div>

          <div>
            <p className="font-semibold text-blue-700">For Brands</p>
            <p className="text-sm text-gray-700">
              Launch branded NFC profile programs with analytics and admin tools.
            </p>
          </div>
        </div>

        <div className="flex justify-center space-x-6 mt-6 text-xl">
          <a
            href="https://www.linkedin.com/company/tldz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800"
            aria-label="LinkedIn"
          >
            <FaLinkedin />
          </a>

          <a
            href="https://twitter.com/tldz6"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800"
            aria-label="Twitter"
          >
            <FaTwitter />
          </a>

          <a
            href="https://www.instagram.com/tldz1"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800"
            aria-label="Instagram"
          >
            <FaInstagram />
          </a>

          <a
            href="https://nfc.mobile"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800"
            aria-label="Website"
          >
            <FaGlobe />
          </a>
        </div>

        <footer className="text-sm mt-10 text-center text-gray-700">
          <p>
            Powered by{" "}
            <a href="https://nfc.mobile" className="text-blue-700 font-semibold">
              NFC Mobile
            </a>
          </p>
          <p className="italic text-gray-500 mt-1">
            Tap.  Connect.  Share.
          </p>
        </footer>
      </main>

      <style jsx>{`
        @keyframes gridScroll {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 0 120px;
          }
        }

        @keyframes fadeInOut {
          0%,
          100% {
            opacity: 0;
          }
          10%,
          90% {
            opacity: 1;
          }
        }

        .subtle-grid {
          position: relative;
          overflow: hidden;
        }

        .subtle-grid::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 200%;
          height: 200%;
          background-image: repeating-linear-gradient(#2563eb 0 1px, transparent 1px 96px),
            repeating-linear-gradient(90deg, #2563eb 0 1px, transparent 1px 96px);
          transform: rotateX(70deg) scaleY(1.2) translateY(-20%);
          transform-origin: bottom;
          animation: gridScroll 14s linear infinite;
          opacity: 0.04;
          z-index: 0;
        }

        .animate-fade {
          animation: fadeInOut 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
