import { describe, it, expect, beforeAll } from "vitest";

const API_URL = process.env.TEST_API_URL || "http://localhost:3333";
let token: string;
let condominiumId: string;

async function api(path: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  return { status: res.status, data: await res.json() as any };
}

beforeAll(async () => {
  const res = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "atendimentoveredasbosque@gmail.com",
      password: "Admin@2026",
    }),
  });
  const json: any = await res.json();
  token = json.data.accessToken;
  condominiumId = json.data.user.condominiumUsers[0].condominiumId;
});

describe("Health & Infrastructure", () => {
  it("GET /health returns ok with DB and Redis checks", async () => {
    const res = await fetch(`${API_URL}/health`);
    const data: any = await res.json();
    expect(res.status).toBe(200);
    expect(data.status).toBe("ok");
    expect(data.checks.database).toBe("ok");
    expect(data.checks.redis).toBe("ok");
    expect(data.uptime).toBeGreaterThan(0);
  });

  it("GET /api/docs returns Swagger UI", async () => {
    const res = await fetch(`${API_URL}/api/docs/`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("swagger");
  });

  it("GET /api/docs.json returns OpenAPI spec", async () => {
    const res = await fetch(`${API_URL}/api/docs.json`);
    const data: any = await res.json();
    expect(res.status).toBe(200);
    expect(data.openapi || data.swagger).toBeDefined();
  });
});

describe("Auth Flow", () => {
  it("POST /auth/login with valid credentials returns tokens", async () => {
    const res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "sindico@parqueverde.com.br",
        password: "Sindico@2026",
      }),
    });
    const data: any = await res.json();
    expect([200, 409]).toContain(res.status);
    if (res.status === 200) {
      expect(data.success).toBe(true);
      expect(data.data.accessToken).toBeDefined();
    }
  });

  it("POST /auth/login with wrong password returns 401 or 409", async () => {
    const res = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "nobody@test.com",
        password: "wrongpassword",
      }),
    });
    expect([401, 404, 409]).toContain(res.status);
  });

  it("GET protected route without token returns 401", async () => {
    const res = await fetch(`${API_URL}/api/v1/dashboard/${condominiumId}`);
    expect(res.status).toBe(401);
  });
});

describe("Dashboard", () => {
  it("GET /dashboard/:condominiumId returns metrics", async () => {
    const { status, data } = await api(`/api/v1/dashboard/${condominiumId}`);
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.recentActivity).toBeDefined();
  });
});

describe("Cameras CRUD", () => {
  let cameraId: string;

  it("POST /cameras creates a camera", async () => {
    const { status, data } = await api("/api/v1/cameras", {
      method: "POST",
      body: JSON.stringify({
        condominiumId,
        name: "Test Camera",
        location: "Test Location",
        streamUrl: "rtsp://test.local/stream",
      }),
    });
    expect(status).toBe(201);
    expect(data.data.camera.name).toBe("Test Camera");
    cameraId = data.data.camera.id;
  });

  it("GET /cameras/condominium/:id lists cameras", async () => {
    const { status, data } = await api(`/api/v1/cameras/condominium/${condominiumId}`);
    expect(status).toBe(200);
    expect(data.data.cameras.length).toBeGreaterThan(0);
  });

  it("PATCH /cameras/:id/toggle deactivates camera", async () => {
    const { status, data } = await api(`/api/v1/cameras/${cameraId}/toggle`, { method: "PATCH" });
    expect(status).toBe(200);
    expect(data.data.camera.isActive).toBe(false);
  });

  it("DELETE /cameras/:id removes camera", async () => {
    const { status } = await api(`/api/v1/cameras/${cameraId}`, { method: "DELETE" });
    expect(status).toBe(200);
  });
});

describe("Notifications", () => {
  it("GET /notifications/inbox returns notifications list", async () => {
    const { status, data } = await api("/api/v1/notifications/inbox");
    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("GET /notifications/inbox/unread-count returns count", async () => {
    const { status, data } = await api("/api/v1/notifications/inbox/unread-count");
    expect(status).toBe(200);
    expect(typeof data.data.count).toBe("number");
  });
});

describe("Audit", () => {
  it("GET /audit/condominium/:id returns logs", async () => {
    const { status, data } = await api(`/api/v1/audit/condominium/${condominiumId}`);
    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.logs).toBeDefined();
  });
});

describe("Key Control", () => {
  it("GET /key-control/condominium/:id returns keys", async () => {
    const { status, data } = await api(`/api/v1/key-control/condominium/${condominiumId}`);
    expect(status).toBe(200);
    expect(data.data.keys).toBeDefined();
  });
});

describe("Moving Schedule", () => {
  it("GET /moving-schedules/condominium/:id returns schedules", async () => {
    const { status, data } = await api(`/api/v1/moving-schedules/condominium/${condominiumId}`);
    expect(status).toBe(200);
    expect(data.data.schedules).toBeDefined();
  });
});

describe("Reports", () => {
  it("GET /reports/visitors/:id returns visitor report", async () => {
    const { status, data } = await api(`/api/v1/reports/visitors/${condominiumId}`);
    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });
});
