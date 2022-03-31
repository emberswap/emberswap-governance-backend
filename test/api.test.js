require("dotenv").config({ path: ".env" });
const user = process.env.AUTH_USER;
const password = process.env.AUTH_PASSWORD;

const fs = require("fs");
const request = require("supertest");

const app = require("../server");

describe("Test", () => {
  beforeAll(async function () {
    try {
      fs.unlinkSync("database/database.db");
      fs.unlinkSync("database/database.db-journal");
    } catch {}
    await app.setup();
  });
  afterAll(async function () {
    app.server.close();
    try {
      fs.unlinkSync("data/2000002.json");
      fs.unlinkSync("data/2668859.json");
    } catch {}
  });

  const expectSuccess = (resp) => {
    if (resp.error) {
      throw resp.error;
    }
    if (resp.statusCode !== 200) {
      throw Error(resp.body.error);
    }
  }

  const expectFail = (resp) => {
    if (resp.statusCode === 200) {
      throw Error(resp.body.error);
    }
    if (!resp.error) {
      throw Error("No error returned");
    }
  }

  it("Should hit basic auth", async () => {
    const success = await request(app).post("/proposal").auth(user, password).send();
    expect(success.statusCode).not.toBe(401);

    const fail = await request(app).post("/proposal").auth('user', 'password').send();
    expect(fail.statusCode).toBe(401);

    const successGetAuth = await request(app).get("/proposal/123").auth('user', 'password').send();
    expect(successGetAuth.statusCode).not.toBe(401);

    const successGet = await request(app).get("/proposal/123").send();
    expect(successGet.statusCode).not.toBe(401);
  });

  it("Should create a snapshot", async () => {
    const response = await request(app).post("/snapshot").auth(user, password).send({
      snapshotBlock: 2000002
    });
    expectSuccess(response);

    const fail = await request(app).post("/snapshot").auth(user, password).send({
      snapshotBlock: 2000002
    });
    expectFail(fail);
    expect(fail.body.error).toBe("Snapshot for block 2000002 already exists");
  });

  it("Should get a snapshot", async () => {
    const response = await request(app).get("/snapshot/2000002").send();
    expectSuccess(response);
    expect(response.body.length).toBeGreaterThan(0);

    const notFound = await request(app).get("/snapshot").send();
    expect(notFound.statusCode).toBe(404);

    const notFoundId = await request(app).get("/snapshot/123").send();
    expect(notFoundId.statusCode).toBe(404);
    expect(notFoundId.body.error).toBe("snapshot not found");
  });

  it("Should create a proposal", async () => {
    const response = await request(app).post("/proposal").auth(user, password).send({
      proposalId: "0001",
      title: "We cool?",
      content: "Are we?",
      options: ["YES", "NO"],
      snapshotBlock: 2000002,
      endBlock: 3130000
    });
    expectSuccess(response);

    const fail = await request(app).post("/proposal").auth(user, password).send({
      proposalId: "0001",
      title: "We cool?",
      content: "Are we?",
      options: ["YES", "NO"],
      snapshotBlock: 2000002,
      endBlock: 3130000
    });
    expectFail(fail);
    expect(fail.body.error).toContain("already exists");
  });

  it("Should get a proposal", async () => {
    const response = await request(app).get("/proposal/0001").send();
    expectSuccess(response);

    const notFound = await request(app).get("/proposal").send();
    expect(notFound.statusCode).toBe(404);

    const notFoundId = await request(app).get("/proposal/0002").send();
    expect(notFoundId.statusCode).toBe(404);
    expect(notFoundId.body.error).toBe("proposal not found");
  });

  it("Should make votes", async () => {
    const noBalance = await request(app).post("/vote").send({
      sig: "asdf",
      proposalId: "0001",
      choiceId: 0,
      address: "0xe870c1b1f92f5f3d8247340778e806aaf00e5fac",
    });
    expectFail(noBalance);
    expect(noBalance.body.error).toContain("You do not have any EMBER available at block number");

    const first = await request(app).post("/vote").send({
      sig: "asdf",
      proposalId: "0001",
      choiceId: 0,
      address: "0x308be429641aab24175b2bafbc519350e2d4183d",
    });
    expectSuccess(first);

    const fail = await request(app).post("/vote").send({
      sig: "asdf",
      proposalId: "0001",
      choiceId: 0,
      address: "0x308be429641aab24175b2bafbc519350e2d4183d",
    });
    expectFail(fail);

    const second = await request(app).post("/vote").send({
      sig: "asdf",
      proposalId: "0001",
      choiceId: 0,
      address: "0x08a39ae0b0da06fe824a65fa0a73c3126a82a0ba",
    });
    expectSuccess(second);

    const third = await request(app).post("/vote").send({
      sig: "asdf",
      proposalId: "0001",
      choiceId: 1,
      address: "0x27a69ffba1e939ddcfecc8c7e0f967b872bac65c",
    });
    expectSuccess(third);

    const proposals = await request(app).get("/proposal/all").send();
    expectSuccess(proposals);
    expect(proposals.body.length).toBeGreaterThan(0);
  });

  it("Should sync proposals from github", async () => {
    const githubProposals = {
      "timestamp": "2022-01-18T22:57:14.233Z",
      "version": {
        "major": 0,
        "minor": 0,
        "patch": 1
      },
      "proposals": {
        "6594629f0911640a5cccd9ffef2845817f007c30932bb5fc7f19cc8b4eb4751b": {
          "title": "Test Proposal #1",
          "content": "This is the **content** of the __proposal__",
          "strategy": "single-choice",
          "options": [
            "YES",
            "NO"
          ],
          "snapshotBlock": "2668859",
          "endBlock": "3668859"
        }
      }
    };

    const response = await request(app).post("/proposal/sync").auth(user, password).send(githubProposals);
    expectSuccess(response);

    const resyncSuccess = await request(app).post("/proposal/sync").auth(user, password).send(githubProposals);
    expectSuccess(resyncSuccess);
  });
});
