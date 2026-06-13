const { handler: authHandler } = require("./auth/handler");
const { chat } = require("./chatbot");

exports.handler = async (event) => {
  const path   = event.path || event.rawPath || "";
  const method = event.httpMethod || event.requestContext?.http?.method || "";

  if (path.includes("/auth")) return authHandler(event);
  if (method === "POST" && path.endsWith("/chat")) return chat(event);

  return {
    statusCode: 404,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({ message: "Not found" }),
  };
};
