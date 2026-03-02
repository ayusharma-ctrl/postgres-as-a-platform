import { Op } from "sequelize";
import { Cache } from "./cache.model";
import { logger } from "../../app";

const CLEANUP_INTERVAL_MS = 30_000; // 30 seconds

export async function cleanupExpiredCache(): Promise<number> {
    const deletedCount = await Cache.destroy({
        where: {
            expires_at: {
                [Op.lt]: new Date()
            }
        }
    });

    return deletedCount;
}

export function startCacheCleanupWorker(): void {
    logger.info("Cache cleanup worker started");

    setInterval(async () => {
        try {
            const deleted = await cleanupExpiredCache();

            if (deleted > 0) {
                logger.info(`Cache cleanup removed ${deleted} expired entries`);
            }
        } catch (error) {
            logger.error({ error }, "Cache cleanup failed:");
        }
    }, CLEANUP_INTERVAL_MS);
}
