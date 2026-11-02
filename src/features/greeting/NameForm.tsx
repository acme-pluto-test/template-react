"use client";

import { useState, type FormEvent } from "react";
import styles from "./greeting.module.css";
import { validateName } from "./validate";

export function NameForm({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string>();

  function submit(event: FormEvent) {
    event.preventDefault();
    const problem = validateName(value);
    setError(problem);
    if (!problem) onSubmit(value);
  }

  return (
    <form onSubmit={submit} className={styles.form} noValidate>
      <label htmlFor="name">Name</label>
      <input id="name" name="name" value={value} onChange={(e) => setValue(e.target.value)} aria-describedby={error ? "name-error" : undefined} aria-invalid={error ? true : undefined} autoComplete="off" />
      <button type="submit">Greet</button>
      {error ? (
        <p id="name-error" className={styles.error}>
          {error}
        </p>
      ) : null}
    </form>
  );
}
