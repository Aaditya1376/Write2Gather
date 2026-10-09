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
  clientBasePath: (process.env.CLIENT_BASE_PATH || "").replace(/^\/?/, "/").replace(/\/$/, ""),
  resendApiKey: process.env.RESEND_API_KEY || "",
  passwordResetFrom: process.env.PASSWORD_RESET_FROM || "",
  mongoUri: required("MONGODB_URI"),
  accessSecret: required("ACCESS_SECRET"),
  refreshSecret: required("REFRESH_SECRET"),
  isProd: process.env.NODE_ENV === "production",
};
