import { ConsoleEmailService } from "../../src/services/emailService";

describe("ConsoleEmailService", () => {
  it("logs the message to the console", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const service = new ConsoleEmailService();

    await service.send({ to: "a@b.com", subject: "Hello", body: "World" });

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("a@b.com"));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Hello"));
    logSpy.mockRestore();
  });
});
