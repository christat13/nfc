export const SITE_CONFIG = {
  siteName: "NFC Mobile",

  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://nfc.mobile",

  defaultClientId:
    process.env.NEXT_PUBLIC_DEFAULT_CLIENT_ID ||
    "nfc-mobile",
};

export const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return SITE_CONFIG.siteUrl;
};

export const getClientId = () => {
  return SITE_CONFIG.defaultClientId;
};

export const detectClientFromHostname = (
  hostname?: string
) => {
  const host =
    hostname ||
    (typeof window !== "undefined"
      ? window.location.hostname
      : "nfc.mobile");

  if (host.includes("nfc.mobile")) {
    return "nfc-mobile";
  }

  return "nfc-mobile";
};