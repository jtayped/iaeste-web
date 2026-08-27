const pollIntervalMs = 5_000;
const deploymentAttempts = 120;
const healthAttempts = 30;

function requiredEnvironmentVariable(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function readJson(response, action) {
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${action} failed with HTTP ${response.status}`);
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`${action} returned invalid JSON`);
  }
}

function apiUrl(webhook, path) {
  return new URL(`/api/v1/${path.replace(/^\//, "")}`, webhook.origin);
}

async function queueDeployment(webhook, token, rollback, imageTag) {
  const headers = { Authorization: `Bearer ${token}` };

  if (!rollback) {
    const response = await fetch(webhook, { headers });
    const body = await readJson(response, "Coolify deploy webhook");
    const deploymentUuid = body.deployments?.[0]?.deployment_uuid;
    if (!deploymentUuid) {
      throw new Error("Coolify deploy webhook returned no deployment UUID");
    }
    return deploymentUuid;
  }

  if (!/^sha-[0-9a-f]{40}$/.test(imageTag)) {
    throw new Error(
      "Rollback image tag must match sha-<40 lowercase hex characters>",
    );
  }

  const resourceUuid = webhook.searchParams.get("uuid");
  if (!resourceUuid) {
    throw new Error("Coolify deploy webhook has no resource UUID");
  }

  const response = await fetch(
    apiUrl(
      webhook,
      `applications/${encodeURIComponent(resourceUuid)}/rollback`,
    ),
    {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ commit: imageTag }),
    },
  );
  const body = await readJson(response, "Coolify rollback request");
  if (!body.deployment_uuid) {
    throw new Error("Coolify rollback request returned no deployment UUID");
  }
  return body.deployment_uuid;
}

async function waitForDeployment(webhook, token, deploymentUuid) {
  let lastStatus = "queued";

  for (let attempt = 1; attempt <= deploymentAttempts; attempt += 1) {
    const response = await fetch(
      apiUrl(webhook, `deployments/${encodeURIComponent(deploymentUuid)}`),
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (response.status === 404 && attempt <= 12) {
      await wait(pollIntervalMs);
      continue;
    }

    const body = await readJson(response, "Coolify deployment status");
    const status = String(body.status ?? "unknown");
    if (status !== lastStatus) {
      console.log(`Coolify deployment status: ${status}`);
      lastStatus = status;
    }

    if (status === "finished") return;
    if (status === "failed" || status.startsWith("cancelled")) {
      throw new Error(`Coolify deployment ended with status: ${status}`);
    }

    await wait(pollIntervalMs);
  }

  throw new Error("Coolify deployment did not finish within 10 minutes");
}

async function waitForHealth(healthUrl) {
  for (let attempt = 1; attempt <= healthAttempts; attempt += 1) {
    try {
      const response = await fetch(healthUrl, { redirect: "follow" });
      if (response.ok) {
        console.log("Deployed resource is healthy");
        return;
      }
    } catch {
      // The replacement container can briefly refuse connections.
    }
    await wait(pollIntervalMs);
  }

  throw new Error(
    "Deployed resource did not become healthy within 2.5 minutes",
  );
}

const webhook = new URL(requiredEnvironmentVariable("COOLIFY_DEPLOY_WEBHOOK"));
const token = requiredEnvironmentVariable("COOLIFY_TOKEN");
const healthUrl = new URL(requiredEnvironmentVariable("COOLIFY_HEALTH_URL"));
const rollback = process.env.ROLLBACK === "true";
const imageTag = process.env.IMAGE_TAG?.trim() ?? "";

const deploymentUuid = await queueDeployment(
  webhook,
  token,
  rollback,
  imageTag,
);
console.log("Coolify accepted the deployment");
await waitForDeployment(webhook, token, deploymentUuid);
await waitForHealth(healthUrl);
