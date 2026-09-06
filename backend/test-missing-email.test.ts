import request from "supertest";
import { createApp } from "../src/app";

const app = createApp();

describe("edge case: missing email", () => {
  it("should handle missing email field gracefully", async () => {
    const res = await request(app)
      .post("/api/auth/password-reset/request")
      .send({});
    
    console.log("Status:", res.status);
    console.log("Body:", res.body);
  });
});
