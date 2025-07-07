import { saveAs } from "file-saver";

export function exportClaimedPinsCSV(profiles: any[]) {
  const headers = ["Code", "Claimed", "UID", "Name", "Email", "Organization"];
  const rows = profiles.map((p) => [
    p.code,
    p.uid ? "Yes" : "No",
    p.uid || "",
    p.name || "",
    p.email || "",
    p.organization || "",
  ]);

  const csvContent =
    [headers, ...rows]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
  saveAs(blob, "claimed_pins.csv");
}
