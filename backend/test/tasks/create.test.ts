import request from "supertest";
import { createApp } from "../../src/app";
import { VALID_CREDENTIAL } from "../fixtures/credentials";

const app = createApp();

async function registerUser(email: string) {
  const res = await request(app).post("/api/auth/register").send({ email, password: VALID_CREDENTIAL });
  return res.body.accessToken as string;
}

describe("POST /api/tasks create", () => {
  it("saves a task with only a title and default optional fields (AC1, AC2, AC7, AC21)", async () => {
    const token = await registerUser("create1@example.com");

    const res = await request(app).post("/api/tasks").set("Authorization", `Bearer ${token}`).send({ title: "Buy milk" });

    expect(res.status).toBe(201);
    expect(res.body.task.title).toBe("Buy milk");
    expect(res.body.task.priority).toBe("medium");
    expect(res.body.task.category).toBeNull();
    expect(res.body.task.tags).toEqual([]);

    const list = await request(app).get("/api/tasks").set("Authorization", `Bearer ${token}`);
    expect(list.body.tasks).toHaveLength(1);
    expect(list.body.tasks[0].title).toBe("Buy milk");
  });

  it("saves a task with all optional fields and 5 tags (AC1, AC2, AC12, AC24)", async () => {
    const token = await registerUser("create2@example.com");

    const res = await request(app)
      .post("/api/tasks")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Plan trip",
        description: "Book flights and hotel",
        due_date: "2026-12-01",
        priority: "high",
        tags: ["travel", "urgent", "flights", "hotel", "budget"],
        category: "personal",
      });

    expect(res.status).toBe(201);
    expect(res.body.task.description).toBe("Book flights and hotel");
    expect(res.body.task.priority).toBe("high");
    expect(res.body.task.category).toBe("personal");
    expect(res.body.task.tags).toHaveLength(5);

    const list = await request(app).get("/api/tasks").set("Authorization", `Bearer ${token}`);
    expect(list.body.tasks[0].tags).toHaveLength(5);
  });
});
