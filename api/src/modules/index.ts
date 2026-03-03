import { Module } from "./types";
import { queueModule } from "./queue/queue.module";
import { cacheModule } from "./cache/cache.module";
import { pubsubModule } from "./pubsub/pubsub.module";
import { rateLimitModule } from "./rate-limit/rate-limit.module";
import { searchModule } from "./search/search.module";
import { vectorModule } from "./vector/vector.module";

const modules: Module[] = [
    queueModule,
    cacheModule,
    pubsubModule,
    rateLimitModule,
    searchModule,
    vectorModule,
];

export async function initModules() {
    for (const m of modules) {
        await m.init?.();
    }
}

export function mountRoutes(app: any) {
    for (const m of modules) {
        m.routes?.(app);
    }
}

export async function startWorkers() {
    for (const m of modules) {
        await m.start?.();
    }
}
