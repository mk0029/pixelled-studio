"use client";

import { useEffect, useState } from "react";
import Studio from "@/components/studio/Studio";
import Home from "./Home";

const KEY = "pixleled_entered_studio";

export default function HomeGate() {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    setEntered(localStorage.getItem(KEY) === "true");
  }, []);

  if (!entered) {
    return <Home onLaunch={() => { localStorage.setItem(KEY, "true"); setEntered(true); }} />;
  }
  return <Studio onHome={() => { localStorage.removeItem(KEY); setEntered(false); }} />;
}
