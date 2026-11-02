"use client";

import { useState } from "react";
import { Greeting } from "./Greeting";
import { NameForm } from "./NameForm";

export function GreetingPage() {
  const [name, setName] = useState("ana");
  return (
    <>
      <NameForm onSubmit={setName} />
      <Greeting name={name} />
    </>
  );
}
