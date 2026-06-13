const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

const client = new BedrockRuntimeClient({ region: "us-east-1" });

async function chat(event) {
  const { message = "" } = JSON.parse(event.body || "{}");

  const command = new InvokeModelCommand({
    modelId: "anthropic.claude-3-haiku-20240307-v1:0",
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1024,
      system: "당신은 요리 전문 AI 어시스턴트입니다. 요리, 레시피, 식재료에 관한 질문에 친절하게 답변해주세요.",
      messages: [{ role: "user", content: message }],
    }),
  });

  const response = await client.send(command);
  const result   = JSON.parse(Buffer.from(response.body).toString());

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({ reply: result.content[0].text }),
  };
}

module.exports = { chat };
