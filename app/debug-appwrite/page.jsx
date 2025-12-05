// app/debug-appwrite/page.jsx
"use client";

import { useEffect, useState } from "react";
import { account } from "../../lib/appwrite";

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "Daytrader_main";

export default function DebugAppwritePage() {
  const [output, setOutput] = useState("");

  async function test() {
    let result = "Browser ENV:\n";
    result += JSON.stringify({ ENDPOINT, PROJECT_ID, DB_ID }, null, 2) + "\n\n";

    // 1) Raw /health fetch
    try {
      const url = ENDPOINT.replace(/\/$/, "") + "/health";
      const res = await fetch(url);
      result += "Health fetch: HTTP " + res.status + "\n";
      result += (await res.text()) + "\n\n";
    } catch (err) {
      result += "Health fetch error: " + err + "\n\n";
    }

    // 2) account.get()
    try {
      const user = await account.get();
      result += "Account.get() success:\n";
      result += JSON.stringify(user, null, 2);
    } catch (err) {
      result += "Account.get() error:\n" + err.toString();
    }

    setOutput(result);
  }

  useEffect(() => {
    test();
  }, []);

  return (
    <pre className="p-4 text-xs whitespace-pre-wrap text-green-300">
      {output || "Loading..."}
    </pre>
  );
}
