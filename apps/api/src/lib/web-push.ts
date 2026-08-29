import webpush from "web-push";

import type { WebPushConfig } from "../config";

/**
 * One admin push notification. `url` is the admin-app path to open on click
 * (e.g. `/registrations`), resolved against the origin by the service worker.
 */
export interface PushMessage {
  title: string;
  body: string;
  url: string;
  /** Collapse key: a newer message with the same tag replaces the old one. */
  tag?: string;
}

export interface PushTarget {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushNotifierDependencies {
  config: WebPushConfig;
  /** The current set of admin devices to deliver to. */
  listTargets: () => Promise<PushTarget[]>;
  /** Called for each endpoint the push service reports as gone (404/410). */
  forgetTarget: (endpoint: string) => Promise<void>;
  logger?: Pick<Console, "error">;
}

export interface PushNotifier {
  readonly publicKey: string;
  /** Fan out to every admin device. Never throws; logs and prunes on failure. */
  notifyAdmins: (message: PushMessage) => Promise<void>;
}

const NO_OP: PushNotifier = {
  publicKey: "",
  notifyAdmins: async () => {},
};

/** A notifier that does nothing — used when VAPID keys are not configured. */
export function createNoopPushNotifier(): PushNotifier {
  return NO_OP;
}

export function createPushNotifier(
  deps: PushNotifierDependencies,
): PushNotifier {
  const logger = deps.logger ?? console;
  webpush.setVapidDetails(
    deps.config.subject,
    deps.config.publicKey,
    deps.config.privateKey,
  );

  return {
    publicKey: deps.config.publicKey,

    async notifyAdmins(message) {
      let targets: PushTarget[];
      try {
        targets = await deps.listTargets();
      } catch (error) {
        logger.error("push: failed to load subscriptions", error);
        return;
      }

      const payload = JSON.stringify({
        title: message.title,
        body: message.body,
        url: message.url,
        tag: message.tag ?? "iaeste-admin",
      });

      await Promise.all(
        targets.map(async (target) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: target.endpoint,
                keys: target.keys,
              },
              payload,
            );
          } catch (error) {
            const statusCode =
              error && typeof error === "object" && "statusCode" in error
                ? (error as { statusCode?: number }).statusCode
                : undefined;
            if (statusCode === 404 || statusCode === 410) {
              await deps.forgetTarget(target.endpoint).catch((pruneError) => {
                logger.error("push: failed to prune dead endpoint", pruneError);
              });
              return;
            }
            logger.error("push: send failed", error);
          }
        }),
      );
    },
  };
}
