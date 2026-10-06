import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const secret = process.env.ACCESS_TOKEN_SECRET || "devflow_jwt_access_super_secret_key_minimum_32_chars_2026";
const devToken = jwt.sign({ id: "6abf68cd7bbdddff5394c46d" }, secret, { expiresIn: "1h" });
const companyToken = jwt.sign({ id: "6ac380b088e51626a5f95e20" }, secret, { expiresIn: "1h" });

const taskId = "6ac5362d9706c955caf6b26f";

async function runTests() {
  console.log("--- TEST 5: Company trying to change task status while In Progress (Must fail with 403) ---");
  const res5 = await fetch(`http://localhost:5000/api/v1/tasks/${taskId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${companyToken}` },
    body: JSON.stringify({ status: "Approved" })
  });
  console.log("Status:", res5.status, await res5.json());

  console.log("\n--- TEST 6: Developer submits task for review (Must succeed with 200, submittedAt set) ---");
  const res6 = await fetch(`http://localhost:5000/api/v1/tasks/${taskId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${devToken}` },
    body: JSON.stringify({ status: "Submitted For Review" })
  });
  const data6 = await res6.json();
  console.log("Status:", res6.status, "SubmittedAt:", data6.data?.task?.submittedAt, "Status:", data6.data?.task?.status);
}

runTests().catch(console.error);
