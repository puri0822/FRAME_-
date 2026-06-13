const { getConnection } = require("../utils/db");
const { signToken, verifyToken } = require("../utils/jwt");
const https = require("https");
const crypto = require("crypto");

const HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

function ok(body)  { return { statusCode: 200, headers: HEADERS, body: JSON.stringify(body) }; }
function err(code, message) { return { statusCode: code, headers: HEADERS, body: JSON.stringify({ message }) }; }

function fetchGoogleTokenInfo(idToken) {
  return new Promise((resolve, reject) => {
    https.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`, (res) => {
      let raw = "";
      res.on("data", (chunk) => (raw += chunk));
      res.on("end", () => {
        try {
          const data = JSON.parse(raw);
          if (res.statusCode !== 200 || data.error) reject(new Error("Invalid token"));
          else resolve(data);
        } catch { reject(new Error("Parse error")); }
      });
    }).on("error", reject);
  });
}

async function googleLogin(event) {
  const { idToken } = JSON.parse(event.body || "{}");
  if (!idToken) return err(400, "Google ID 토큰이 없습니다.");

  let googleUser;
  try {
    googleUser = await fetchGoogleTokenInfo(idToken);
  } catch {
    return err(401, "유효하지 않은 Google 토큰입니다.");
  }

  const { email, name, sub: googleId, email_verified } = googleUser;
  if (email_verified !== "true") return err(401, "Google 이메일이 인증되지 않았습니다.");

  const conn = await getConnection();
  try {
    const [rows] = await conn.execute("SELECT * FROM users WHERE email = ?", [email]);
    let user = rows[0];

    if (!user) {
      const userId = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      await conn.execute(
        "INSERT INTO users (email, userId, name, googleId, createdAt) VALUES (?, ?, ?, ?, ?)",
        [email, userId, name || email.split("@")[0], googleId, createdAt]
      );
      user = { email, userId, name: name || email.split("@")[0], createdAt };
    } else if (!user.googleId) {
      await conn.execute("UPDATE users SET googleId = ? WHERE email = ?", [googleId, email]);
    }

    const token = signToken({ userId: user.userId, email: user.email, name: user.name });
    return ok({ token, user: { userId: user.userId, email: user.email, name: user.name } });
  } finally {
    await conn.end();
  }
}

async function me(event) {
  const authHeader = event.headers?.Authorization || event.headers?.authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return err(401, "인증 토큰이 없습니다.");

  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    return err(401, "유효하지 않은 토큰입니다.");
  }

  const conn = await getConnection();
  try {
    const [rows] = await conn.execute("SELECT * FROM users WHERE email = ?", [payload.email]);
    if (!rows[0]) return err(404, "사용자를 찾을 수 없습니다.");

    const { userId, email, name, createdAt } = rows[0];
    return ok({ user: { userId, email, name, createdAt } });
  } finally {
    await conn.end();
  }
}

exports.handler = async (event) => {
  try {
    const method = event.httpMethod || event.requestContext?.http?.method || "";
    const path   = event.path || event.rawPath || "";

    if (method === "POST" && path.endsWith("/auth/google")) return await googleLogin(event);
    if (method === "GET"  && path.endsWith("/auth/me"))     return await me(event);

    return err(404, "Not found");
  } catch (e) {
    console.error(e);
    return err(500, "서버 오류가 발생했습니다.");
  }
};
