import { apiGet } from "./client";

export interface Greeting {
  message: string;
}

export const getGreeting = (name: string): Promise<Greeting> => apiGet<Greeting>(`/v1/greetings/${encodeURIComponent(name)}`);
