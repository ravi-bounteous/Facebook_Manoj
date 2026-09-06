import request from "supertest";
import { createApp } from "../../src/app";
import { VALID_CREDENTIAL } from "../fixtures/credentials";

const app = createApp();

async function registerUser(email: string) {
  const res = await request(app).post("/api/auth/register").send({ email, password: VALID_CREDENTIAL });
  return res.body.accessToken as string;
}

async function createTask(token: string, body: Record<string, unknown>) {
  const res = await request(app).post("/api/tasks").set("Authorization", `Bearer ${token}`).send(body);
  return res.body.task;
}

describe("PUT /api/tasks/:id edit", () => {
  it("updates a task and reflects new values in the list (AC10, AC11)", async () => {
    const token = await registerUser("e1@example.com");
    const task = await createTask(token, { title: "Original" });

    const res = await request(app)
      .put(`/api/tasks/${task.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Updated", priority: "high", tags: ["x"] });

    expect(res.status).toBe(200);
    expect(res.body.task.title).toBe("Updated");
    expect(res.body.task.priority).toBe("high");

    const list = await request(app).get("/api/tasks").set("Authorization", `Bearer ${token}`);
    expect(list.body.tasks[0].title).toBe("Updated");
    expect(list.body.tasks[0].tags).toEqual(["x"]);
  });

  it("resubmitting unchanged values keeps the task the same (AC13)", async () => {
    const token = await registerUser("e2@example.com");
    const task = await createTask(token, { title: "Stable", description: "desc" });

    const res = await request(app)
      .put(`/api/tasks/${task.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Stable", description: "desc" });

    expect(res.status).toBe(200);
    expect(res.body.task.title).toBe("Stable");
    expect(res.body.task.description).toBe("desc");
  });

  it("rejects clearing the title (AC3, AC4)", async () => {
    const token = await registerUser("e3@example.com");
    const task = await createTask(token, { title: "Has title" });

    const res = await request(app).put(`/api/tasks/${task.id}`).set("Authorization", `Bearer ${token}`).send({ title: "" });

    expect(res.status).toBe(400);

    const get = await request(app).get(`/api/tasks/${task.id}`).set("Authorization", `Bearer ${token}`);
    expect(get.body.task.title).toBe("Has title");
  });

  it("defaults priority to medium when cleared on edit (AC7)", async () => {
    const token = await registerUser("e4@example.com");
    const task = await createTask(token, { title: "Task", priority: "high" });

    const res = await request(app)
      .put(`/api/tasks/${task.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Task", priority: "" });

    expect(res.status).toBe(200);
    expect(res.body.task.priority).toBe("medium");
  });

  it("rejects more than 5 tags, bad due date, and invalid category on edit (AC5, AC6, AC8, AC9, AC22, AC23)", async () => {
    const token = await registerUser("e5@example.com");
    const task = await createTask(token, { title: "Task" });

    const tooManyTags = await request(app)
      .put(`/api/tasks/${task.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Task", tags: ["a", "b", "c", "d", "e", "f"] });
    expect(tooManyTags.status).toBe(400);

    const badDate = await request(app)
      .put(`/api/tasks/${task.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Task", due_date: "not-a-date" });
    expect(badDate.status).toBe(400);

    const badCategory = await request(app)
      .put(`/api/tasks/${task.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Task", category: "nope" });
    expect(badCategory.status).toBe(400);

    const get = await request(app).get(`/api/tasks/${task.id}`).set("Authorization", `Bearer ${token}`);
    expect(get.body.task.tags).toEqual([]);
    expect(get.body.task.due_date).toBeNull();
    expect(get.body.task.category).toBeNull();
  });
});
