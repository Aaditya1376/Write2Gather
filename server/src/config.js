// All environment settings live here, so the rest of the code never touches process.env directly.
const required = (name) => {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing environment variable: ${name}. Copy server/.env.example to server/.env`);
    process.exit(1);
  }
  return value;
};

export const config = {
  port: Number(process.env.PORT) || 4000,
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  mongoUri: required("MONGODB_URI"),
  accessSecret: required("ACCESS_SECRET"),
  refreshSecret: required("REFRESH_SECRET"),
  isProd: process.env.NODE_ENV === "production",
  ai: {
    key: process.env.AI_API_KEY || "",
    baseUrl: (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
    model: process.env.AI_MODEL || "gpt-4o-mini",
  },
};
