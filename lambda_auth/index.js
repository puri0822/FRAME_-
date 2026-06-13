const { handler: authHandler } = require("./auth/handler");

exports.handler = async (event) => {
  const path = event.path || event.rawPath || "";

  if (path.includes("/auth")) return authHandler(event);

  return {
    statusCode: 404,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({ message: "Not found" }),
  };
};
