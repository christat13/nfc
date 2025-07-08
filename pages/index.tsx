import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
import logo from "@/public/logo.png";
import { FaTwitter, FaInstagram, FaLinkedin, FaGlobe } from "react-icons/fa";

const slogans = [
  "More Than a Dot!",
  "Your Identity, In Motion.",
  "Claim Your Digital Name.",
  "Power Your Mobile Presence.",
  "Be a Z'er",
  "Connect Anywhere, Instantly.",
  "Stand Out Online.",
  "TLDz: Get Your Own TLD.",
  "Digital Identity for the NextGen.",
  "Your TLD. Your Terms.",
  "Build Your Brand with TLDz.",
  "TLDz: Because You’re More Than a Handle.",
];

export default function Home() {
  const [username, setUsername] = useState("");
  const [sloganIndex, setSloganIndex] = useState(0);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    router.push(`/id/${username.toLowerCase()}?firstName=${encodeURIComponent(username)}`);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setSloganIndex((prev) => (prev + 1) % slogans.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-white text-tldzPurple flex flex-col items-center justify-center px-4 py-12 tron-grid animate-grid text-center relative">
      {/* Background logo watermark */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-5 z-0 pointer-events-none">
        <Image src={logo} alt="TLDz Watermark" width={500} height={250} />
      </div>

      <div className="z-10 w-full max-w-md sm:max-w-xl">
        <Image src={logo} alt="TLDz Logo" width={140} height={60} className="mx-auto" />

        <h1 className="text-2xl sm:text-4xl font-bold text-tldzRed animate-pulse leading-tight mt-4">
          Power Your Digital Identity
        </h1>

        <p className="text-sm sm:text-base text-tldzPurple h-6 mt-2 transition-opacity duration-700 ease-in-out animate-fade">
          {slogans[sloganIndex]}
        </p>

        <form onSubmit={handleSubmit} className="w-full space-y-4 mt-6 px-2 sm:px-0">
          <input
            type="text"
            placeholder="Your first name (e.g. Flynn)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 rounded border-2 border-tldzPurple focus:outline-none focus:ring-2 focus:ring-tldzBlue text-center text-base"
          />
          <button
            type="submit"
            className="w-full bg-tldzBlue hover:bg-blue-700 text-white font-bold py-3 px-4 rounded flex justify-center items-center gap-2 text-lg"
          >
            🚀 Claim Your Spot
          </button>
        </form>

        <div className="flex justify-center space-x-6 mt-6 text-xl">
          <a href="https://www.linkedin.com/company/tldz" target="_blank" rel="noopener noreferrer" className="text-tldzBlue hover:text-tldzRed">
            <FaLinkedin />
          </a>
          <a href="https://twitter.com/tldz6" target="_blank" rel="noopener noreferrer" className="text-tldzBlue hover:text-tldzRed">
            <FaTwitter />
          </a>
          <a href="https://www.instagram.com/tldz1" target="_blank" rel="noopener noreferrer" className="text-tldzBlue hover:text-tldzRed">
            <FaInstagram />
          </a>
          <a href="https://tldz.com" target="_blank" rel="noopener noreferrer" className="text-tldzBlue hover:text-tldzRed">
            <FaGlobe />
          </a>
        </div>

        <footer className="text-sm text-tldzPurple mt-12 text-center">
          <p>
            Powered by{" "}
            <a href="https://tldz.com" className="underline hover:text-tldzRed">
              TLDz.com
            </a>
          </p>
          <p className="text-xs italic mt-1">More Than a Dot!</p>
        </footer>
      </div>

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

        .tron-grid {
          position: relative;
          overflow: hidden;
        }

        .tron-grid::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 200%;
          height: 200%;
          background-image: repeating-linear-gradient(#ff0000 0 2px, transparent 2px 100px),
            repeating-linear-gradient(90deg, #0000ff 0 2px, transparent 2px 100px);
          transform: rotateX(70deg) scaleY(1.2) translateY(-20%);
          transform-origin: bottom;
          animation: gridScroll 10s linear infinite;
          opacity: 0.05;
          z-index: 0;
        }

        .animate-grid {
          position: relative;
          z-index: 1;
        }

        .animate-fade {
          animation: fadeInOut 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
