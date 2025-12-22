import { isCapacityError, parseResetAfterMs, sleep } from './route-helpers.js';

export async function withCapacityRetry({
    maxRetries = 0,
    baseRetryDelayMs = 0,
    getAccount,
    executeRequest,
    onCapacityError,
    canRetry
}) {
    const max = Math.max(0, Number(maxRetries || 0));
    const baseDelay = Math.max(0, Number(baseRetryDelayMs || 0));

    let attempt = 0;

    while (true) {
        attempt += 1;
        const account = getAccount ? await getAccount({ attempt }) : null;

        try {
            const result = await executeRequest({ attempt, account });
            return { result, account, attempt };
        } catch (error) {
            const capacity = isCapacityError(error);

            if (capacity && account && onCapacityError) {
                await onCapacityError({ attempt, account, error });
            }

            // Keep existing route semantics: retry while attempt <= (maxRetries + 1)
            // (attempt starts at 1, so max total attempts becomes maxRetries + 2)
            const allowedByCount = attempt <= max + 1;
            const allowedByHook = typeof canRetry === 'function'
                ? !!canRetry({ attempt, maxRetries: max, account, error, capacity })
                : true;
            const shouldRetry = capacity && allowedByCount && allowedByHook;

            if (!shouldRetry) throw error;

            const resetMs = parseResetAfterMs(error?.message);
            const delay = resetMs ?? (baseDelay * attempt);
            await sleep(delay);
        }
    }
}
