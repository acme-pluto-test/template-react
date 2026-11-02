"use client";

import { useQuery } from "@tanstack/react-query";
import { getGreeting } from "@/shared/api/greetings";

export function Greeting({ name }: { name: string }) {
  const query = useQuery({ queryKey: ["greeting", name], queryFn: () => getGreeting(name), retry: false });

  if (query.isPending) return <p role="status">Loading greeting</p>;
  if (query.isError) {
    return (
      <div role="alert">
        <p>The greeting could not be loaded</p>
        <button type="button" onClick={() => void query.refetch()}>
          Try again
        </button>
      </div>
    );
  }
  return <p>{query.data.message}</p>;
}
